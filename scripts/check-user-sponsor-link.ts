/**
 * Script to check a specific user's sponsor link status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Get email from command line or use default
const email = process.argv[2] || 'boots-paul@mailinator.com';

async function checkUserLink() {
  console.log(`🔍 Checking sponsor link for: ${email}\n`);

  // Find user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    console.error('❌ User not found:', profileError?.message);
    return;
  }

  console.log(`✅ Found profile: ${profile.email} (${profile.id})`);
  console.log(`   Role: ${profile.role}\n`);

  if (profile.role !== 'sponsor_admin') {
    console.log('⚠️  User is not a sponsor_admin, no link needed');
    return;
  }

  // Check sponsor_admins link (using admin client - bypasses RLS)
  const { data: sponsorAdmin, error: linkError } = await supabaseAdmin
    .from('sponsor_admins')
    .select('*, sponsors(*)')
    .eq('user_id', profile.id)
    .single();

  if (linkError || !sponsorAdmin) {
    console.log('❌ No sponsor link found!');
    console.log(`   Error: ${linkError?.message || 'No record'}\n`);
    
    // Try to find matching sponsor
    const emailPrefix = email.split('@')[0].toLowerCase();
    const { data: sponsors } = await supabaseAdmin
      .from('sponsors')
      .select('id, name')
      .ilike('name', `%${emailPrefix}%`);

    if (sponsors && sponsors.length > 0) {
      console.log(`💡 Found potential matching sponsor(s):`);
      sponsors.forEach(s => {
        console.log(`   - ${s.name} (${s.id})`);
      });
      console.log(`\n   To link, run:`);
      console.log(`   INSERT INTO sponsor_admins (sponsor_id, user_id) VALUES ('${sponsors[0].id}', '${profile.id}');`);
    } else {
      console.log(`⚠️  No matching sponsor found for email prefix: "${emailPrefix}"`);
      console.log(`   You'll need to manually link this user to a sponsor.`);
    }
  } else {
    console.log(`✅ Sponsor link found!`);
    console.log(`   Sponsor: ${sponsorAdmin.sponsors?.name || 'Unknown'} (${sponsorAdmin.sponsor_id})`);
    console.log(`   Link ID: ${sponsorAdmin.id}`);
    console.log(`   Created: ${sponsorAdmin.created_at}\n`);

    // Now test with anon client (simulates what the app sees)
    console.log('🔒 Testing query with anon client (simulating app behavior)...');
    
    // We can't actually test with the user's session, but we can verify the RLS policy structure
    console.log('   RLS Policy: "Users can view own sponsor admin records"');
    console.log('   Condition: auth.uid() = user_id');
    console.log(`   User ID: ${profile.id}`);
    console.log(`   This query should work if auth.uid() matches ${profile.id}\n`);
  }
}

checkUserLink()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

