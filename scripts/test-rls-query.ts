/**
 * Script to test RLS query behavior for a specific user
 * This simulates what the application does when querying sponsor_admins
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
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Required environment variables not set');
  process.exit(1);
}

const email = process.argv[2] || 'boots@mailinator.com';
const password = process.argv[3] || 'test-password';

async function testRLSQuery() {
  console.log(`🔍 Testing RLS query for: ${email}\n`);

  // Step 1: Get user info with admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .single();

  if (!profile) {
    console.error(`❌ User not found: ${email}`);
    return;
  }

  console.log(`✅ Found profile: ${profile.email} (${profile.id})\n`);

  // Step 2: Check sponsor link with admin client (bypasses RLS)
  const { data: sponsorAdmin } = await supabaseAdmin
    .from('sponsor_admins')
    .select('*, sponsors(*)')
    .eq('user_id', profile.id)
    .single();

  if (!sponsorAdmin) {
    console.error('❌ No sponsor link found (checked with admin client)');
    return;
  }

  console.log(`✅ Sponsor link exists: ${sponsorAdmin.sponsors?.name} (${sponsorAdmin.sponsor_id})\n`);

  // Step 3: Try to authenticate as the user
  console.log('🔐 Attempting to authenticate as user...');
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  // Try to sign in (this might fail if password is wrong, but we'll see)
  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.warn(`⚠️  Could not sign in: ${signInError.message}`);
    console.log('   This is expected if password is unknown. Testing with anon key only...\n');
    
    // Test query with anon key (no auth) - should fail due to RLS
    console.log('🔒 Testing query with anon client (no auth - should fail due to RLS)...');
    const { data: noAuthData, error: noAuthError } = await supabaseClient
      .from('sponsor_admins')
      .select('sponsor_id')
      .eq('user_id', profile.id)
      .single();

    if (noAuthError) {
      console.log(`✅ RLS is working (blocked query): ${noAuthError.message}`);
      console.log(`   Error code: ${noAuthError.code}`);
    } else {
      console.error('❌ RLS is NOT working - query succeeded without auth!');
    }
    return;
  }

  if (!signInData.session) {
    console.error('❌ No session returned from sign in');
    return;
  }

  console.log(`✅ Authenticated as: ${signInData.user.email}`);
  console.log(`   User ID: ${signInData.user.id}`);
  console.log(`   Profile ID: ${profile.id}`);
  console.log(`   Match: ${signInData.user.id === profile.id}\n`);

  // Step 4: Test query with authenticated session
  console.log('🔒 Testing query with authenticated session...');
  const { data: authData, error: authError } = await supabaseClient
    .from('sponsor_admins')
    .select('sponsor_id')
    .eq('user_id', signInData.user.id)
    .single();

  if (authError) {
    console.error(`❌ Query failed with authenticated session:`);
    console.error(`   Error: ${authError.message}`);
    console.error(`   Code: ${authError.code}`);
    console.error(`   Details: ${authError.details}`);
    console.error(`   Hint: ${authError.hint}`);
    console.error(`\n   This indicates an RLS policy issue!`);
  } else if (authData) {
    console.log(`✅ Query succeeded with authenticated session!`);
    console.log(`   Sponsor ID: ${authData.sponsor_id}`);
  } else {
    console.error('❌ No data returned (but no error)');
  }

  // Cleanup
  await supabaseClient.auth.signOut();
}

testRLSQuery()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


