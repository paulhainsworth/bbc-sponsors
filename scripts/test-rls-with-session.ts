/**
 * Test RLS query with actual user session
 * This simulates what happens in the browser
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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
const password = process.argv[3] || 'test-password-123';

async function testRLSWithSession() {
  console.log(`🔍 Testing RLS query with session for: ${email}\n`);

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Step 1: Get user info
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .single();

  if (!profile) {
    console.error(`❌ User not found: ${email}`);
    return;
  }

  console.log(`✅ User: ${profile.email} (${profile.id})\n`);

  // Step 2: Check sponsor link with admin (bypasses RLS)
  const { data: sponsorAdmin } = await supabaseAdmin
    .from('sponsor_admins')
    .select('*, sponsors(name)')
    .eq('user_id', profile.id)
    .single();

  if (!sponsorAdmin) {
    console.error('❌ No sponsor link found (checked with admin)');
    return;
  }

  console.log(`✅ Sponsor link exists: ${sponsorAdmin.sponsors?.name} (${sponsorAdmin.sponsor_id})\n`);

  // Step 3: Try to authenticate
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔐 Attempting to sign in...');
  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error(`❌ Sign in failed: ${signInError.message}`);
    console.log('\n💡 The user might not have a password set (magic link only).');
    console.log('   Let\'s check if we can query with the anon key and see what RLS returns...\n');
    
    // Try query without auth
    const { data: noAuthData, error: noAuthError } = await supabaseClient
      .from('sponsor_admins')
      .select('sponsor_id')
      .eq('user_id', profile.id)
      .single();

    if (noAuthError) {
      console.log(`✅ RLS is working (blocked unauthenticated query):`);
      console.log(`   Code: ${noAuthError.code}`);
      console.log(`   Message: ${noAuthError.message}`);
    } else {
      console.error('❌ RLS is NOT working - unauthenticated query succeeded!');
    }
    return;
  }

  if (!signInData.session) {
    console.error('❌ No session returned');
    return;
  }

  console.log(`✅ Authenticated as: ${signInData.user.email}`);
  console.log(`   User ID: ${signInData.user.id}`);
  console.log(`   Profile ID: ${profile.id}`);
  console.log(`   Match: ${signInData.user.id === profile.id}\n`);

  // Step 4: Test query with authenticated session
  console.log('🔒 Testing query with authenticated session...');
  const { data: queryData, error: queryError } = await supabaseClient
    .from('sponsor_admins')
    .select('sponsor_id')
    .eq('user_id', signInData.user.id)
    .single();

  if (queryError) {
    console.error(`❌ Query failed:`);
    console.error(`   Code: ${queryError.code}`);
    console.error(`   Message: ${queryError.message}`);
    console.error(`   Details: ${queryError.details}`);
    console.error(`   Hint: ${queryError.hint}`);
    console.error(`\n   This indicates an RLS policy issue!`);
    
    // Check RLS policies
    console.log('\n🔍 Checking RLS policies...');
    const { data: policies } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname, 
          tablename, 
          policyname, 
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'sponsor_admins'
        ORDER BY policyname;
      `
    }).catch(() => ({ data: null }));

    if (policies) {
      console.log('   Policies found:', policies);
    } else {
      console.log('   Could not query policies directly');
    }
  } else if (queryData) {
    console.log(`✅ Query succeeded!`);
    console.log(`   Sponsor ID: ${queryData.sponsor_id}`);
    console.log(`   Expected: ${sponsorAdmin.sponsor_id}`);
    console.log(`   Match: ${queryData.sponsor_id === sponsorAdmin.sponsor_id}`);
  } else {
    console.error('❌ No data returned (but no error)');
  }

  // Cleanup
  await supabaseClient.auth.signOut();
}

testRLSWithSession()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

