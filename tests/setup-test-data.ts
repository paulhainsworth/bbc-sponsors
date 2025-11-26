/**
 * Test Data Setup Script
 * Creates test users, profiles, sponsors, and links for Playwright tests
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

// Use service role key if available, otherwise use anon key
const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(supabaseUrl, supabaseAnonKey);

async function setupTestData() {
  console.log('🔧 Setting up test data...\n');

  try {
    // 1. Create or get super admin user
    console.log('1. Creating super admin user...');
    // Use mailinator.com for test emails (Supabase accepts this)
    const adminEmail = process.env.TEST_ADMIN_EMAIL || `test-admin-${Date.now()}@mailinator.com`;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';

    let adminUser;
    const { data: adminSignIn, error: adminSignInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (adminSignInError && adminSignInError.message.includes('Invalid login credentials')) {
      // Use admin API to create user with confirmed email
      if (supabaseServiceKey) {
        const { data: adminUserData, error: adminCreateError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            role: 'super_admin'
          }
        });

        if (adminCreateError) {
          throw new Error(`Failed to create admin: ${adminCreateError.message}`);
        }

        adminUser = adminUserData?.user;
        console.log(`   ✅ Admin user created: ${adminEmail}`);
      } else {
        const { data: adminSignUp, error: adminSignUpError } = await supabase.auth.signUp({
          email: adminEmail,
          password: adminPassword,
          options: {
            data: { role: 'super_admin' }
          }
        });

        if (adminSignUpError && !adminSignUpError.message.includes('already registered')) {
          throw new Error(`Failed to create admin: ${adminSignUpError.message}`);
        }

        adminUser = adminSignUp?.user;
        console.log(`   ✅ Admin user created: ${adminEmail}`);
      }
    } else {
      adminUser = adminSignIn?.user;
      console.log(`   ✅ Admin user exists: ${adminEmail}`);
    }

    // 2. Create or update admin profile
    if (adminUser) {
      console.log('2. Creating/updating admin profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: adminUser.id,
          email: adminEmail,
          role: 'super_admin',
          display_name: adminEmail.split('@')[0]
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.warn(`   ⚠️  Profile error (may already exist): ${profileError.message}`);
      } else {
        console.log('   ✅ Admin profile created/updated');
      }
    }

    // 3. Create or get sponsor admin user
    console.log('3. Creating sponsor admin user...');
    // Use mailinator.com for test emails (Supabase accepts this)
    const sponsorEmail = process.env.TEST_SPONSOR_ADMIN_EMAIL || `test-sponsor-${Date.now()}@mailinator.com`;
    const sponsorPassword = process.env.TEST_SPONSOR_ADMIN_PASSWORD || 'SponsorPassword123!';

    let sponsorUser;
    const { data: sponsorSignIn, error: sponsorSignInError } = await supabase.auth.signInWithPassword({
      email: sponsorEmail,
      password: sponsorPassword,
    });

    if (sponsorSignInError && sponsorSignInError.message.includes('Invalid login credentials')) {
      // Use admin API to create user with confirmed email
      if (supabaseServiceKey) {
        const { data: sponsorUserData, error: sponsorCreateError } = await supabase.auth.admin.createUser({
          email: sponsorEmail,
          password: sponsorPassword,
          email_confirm: true,
          user_metadata: {
            role: 'sponsor_admin'
          }
        });

        if (sponsorCreateError) {
          throw new Error(`Failed to create sponsor admin: ${sponsorCreateError.message}`);
        }

        sponsorUser = sponsorUserData?.user;
        console.log(`   ✅ Sponsor admin user created: ${sponsorEmail}`);
      } else {
        const { data: sponsorSignUp, error: sponsorSignUpError } = await supabase.auth.signUp({
          email: sponsorEmail,
          password: sponsorPassword,
          options: {
            data: { role: 'sponsor_admin' }
          }
        });

        if (sponsorSignUpError && !sponsorSignUpError.message.includes('already registered')) {
          throw new Error(`Failed to create sponsor admin: ${sponsorSignUpError.message}`);
        }

        sponsorUser = sponsorSignUp?.user;
        console.log(`   ✅ Sponsor admin user created: ${sponsorEmail}`);
      }
    } else {
      sponsorUser = sponsorSignIn?.user;
      console.log(`   ✅ Sponsor admin user exists: ${sponsorEmail}`);
    }

    // 4. Create or update sponsor admin profile
    if (sponsorUser) {
      console.log('4. Creating/updating sponsor admin profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: sponsorUser.id,
          email: sponsorEmail,
          role: 'sponsor_admin',
          display_name: sponsorEmail.split('@')[0]
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.warn(`   ⚠️  Profile error (may already exist): ${profileError.message}`);
      } else {
        console.log('   ✅ Sponsor admin profile created/updated');
      }
    }

    // 5. Create test sponsor
    console.log('5. Creating test sponsor...');
    const { data: sponsor, error: sponsorError } = await supabase
      .from('sponsors')
      .upsert({
        name: 'Test Sponsor',
        slug: 'test-sponsor',
        status: 'active',
        tagline: 'Test Sponsor Tagline',
        description: 'This is a test sponsor for automated testing'
      }, {
        onConflict: 'slug'
      })
      .select()
      .single();

    if (sponsorError) {
      console.warn(`   ⚠️  Sponsor error: ${sponsorError.message}`);
    } else {
      console.log(`   ✅ Test sponsor created: ${sponsor.name} (${sponsor.id})`);
    }

    // 6. Link sponsor admin to sponsor
    if (sponsorUser && sponsor) {
      console.log('6. Linking sponsor admin to sponsor...');
      const { error: linkError } = await supabase
        .from('sponsor_admins')
        .upsert({
          sponsor_id: sponsor.id,
          user_id: sponsorUser.id
        }, {
          onConflict: 'sponsor_id,user_id'
        });

      if (linkError) {
        console.warn(`   ⚠️  Link error (may already exist): ${linkError.message}`);
      } else {
        console.log('   ✅ Sponsor admin linked to sponsor');
      }
    }

    console.log('\n✅ Test data setup complete!');
    console.log(`\n📝 Test credentials:`);
    console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   Sponsor Admin: ${sponsorEmail} / ${sponsorPassword}`);
    console.log(`\n💡 You can set these in .env.local as TEST_ADMIN_EMAIL, etc.`);

  } catch (error: any) {
    console.error('\n❌ Error setting up test data:', error.message);
    process.exit(1);
  }
}

setupTestData();

