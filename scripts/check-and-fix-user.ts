/**
 * Script to check and fix a specific user's sponsor link
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

// Get email and sponsor name from command line
const email = process.argv[2] || 'boots@mailinator.com';
const sponsorName = process.argv[3] || 'boots';

async function checkAndFix() {
  console.log(`🔍 Checking and fixing sponsor link for: ${email}\n`);

  // Find user profile
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('email', email);

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.error(`❌ User not found: ${email}`);
    console.log('\n💡 The user might not exist yet, or the email might be different.');
    return;
  }

  if (profiles.length > 1) {
    console.warn(`⚠️  Multiple profiles found for ${email}, using the first one`);
  }

  const profile = profiles[0];
  console.log(`✅ Found profile: ${profile.email} (${profile.id})`);
  console.log(`   Role: ${profile.role}\n`);

  if (profile.role !== 'sponsor_admin') {
    console.log('⚠️  User is not a sponsor_admin, updating role...');
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'sponsor_admin' })
      .eq('id', profile.id);
    
    if (updateError) {
      console.error('❌ Failed to update role:', updateError);
      return;
    }
    console.log('✅ Role updated to sponsor_admin\n');
  }

  // Check if sponsor link exists
  const { data: sponsorAdmin, error: linkError } = await supabaseAdmin
    .from('sponsor_admins')
    .select('*, sponsors(*)')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (linkError && linkError.code !== 'PGRST116') {
    console.error('❌ Error checking sponsor link:', linkError);
    return;
  }

  if (sponsorAdmin) {
    console.log(`✅ Sponsor link already exists!`);
    console.log(`   Sponsor: ${sponsorAdmin.sponsors?.name || 'Unknown'} (${sponsorAdmin.sponsor_id})`);
    console.log(`   Link ID: ${sponsorAdmin.id}`);
    console.log(`   Created: ${sponsorAdmin.created_at}\n`);
    return;
  }

  console.log(`❌ No sponsor link found. Attempting to create link...\n`);

  // Find the sponsor
  const { data: sponsors, error: sponsorError } = await supabaseAdmin
    .from('sponsors')
    .select('id, name')
    .ilike('name', sponsorName);

  if (sponsorError) {
    console.error('❌ Error finding sponsor:', sponsorError);
    return;
  }

  if (!sponsors || sponsors.length === 0) {
    console.error(`❌ Sponsor "${sponsorName}" not found!`);
    console.log('\n💡 Available sponsors:');
    const { data: allSponsors } = await supabaseAdmin
      .from('sponsors')
      .select('id, name')
      .limit(20);
    allSponsors?.forEach(s => console.log(`   - ${s.name} (${s.id})`));
    return;
  }

  const sponsor = sponsors[0];
  console.log(`✅ Found sponsor: ${sponsor.name} (${sponsor.id})\n`);

  // Create the link
  console.log(`🔗 Creating sponsor link...`);
  const { data: newLink, error: createError } = await supabaseAdmin
    .from('sponsor_admins')
    .insert({
      sponsor_id: sponsor.id,
      user_id: profile.id
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Failed to create link:', createError);
    if (createError.code === '23505') {
      console.log('\n💡 Link might already exist (unique constraint violation)');
      // Try to fetch it again
      const { data: existingLink } = await supabaseAdmin
        .from('sponsor_admins')
        .select('*, sponsors(*)')
        .eq('user_id', profile.id)
        .single();
      if (existingLink) {
        console.log(`✅ Link actually exists: ${existingLink.sponsors?.name}`);
      }
    }
    return;
  }

  console.log(`✅ Successfully created sponsor link!`);
  console.log(`   User: ${profile.email}`);
  console.log(`   Sponsor: ${sponsor.name}`);
  console.log(`   Link ID: ${newLink.id}\n`);

  // Verify the link
  const { data: verifyLink } = await supabaseAdmin
    .from('sponsor_admins')
    .select('*, sponsors(*)')
    .eq('user_id', profile.id)
    .single();

  if (verifyLink) {
    console.log(`✅ Verification: Link confirmed`);
    console.log(`   ${verifyLink.sponsors?.name} ↔ ${profile.email}\n`);
  }
}

checkAndFix()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


