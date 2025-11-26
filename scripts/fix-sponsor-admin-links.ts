/**
 * Script to fix missing sponsor_admin links
 * This script identifies sponsor admin users without sponsor links and attempts to fix them
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

async function fixSponsorAdminLinks() {
  console.log('🔍 Finding sponsor admin users without sponsor links...\n');

  // Find all sponsor_admin profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('role', 'sponsor_admin');

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ No sponsor admin profiles found');
    return;
  }

  console.log(`Found ${profiles.length} sponsor admin profile(s)\n`);

  // Check which ones have sponsor links
  const { data: sponsorAdmins, error: sponsorAdminsError } = await supabaseAdmin
    .from('sponsor_admins')
    .select('user_id');

  if (sponsorAdminsError) {
    console.error('❌ Error fetching sponsor_admins:', sponsorAdminsError);
    return;
  }

  const linkedUserIds = new Set(sponsorAdmins?.map(sa => sa.user_id) || []);
  const unlinkedProfiles = profiles.filter(p => !linkedUserIds.has(p.id));

  if (unlinkedProfiles.length === 0) {
    console.log('✅ All sponsor admin users are linked to sponsors\n');
    return;
  }

  console.log(`⚠️  Found ${unlinkedProfiles.length} sponsor admin user(s) without sponsor links:\n`);
  unlinkedProfiles.forEach(profile => {
    console.log(`  - ${profile.email} (${profile.id})`);
  });
  console.log('');

  // Try to auto-link based on email prefix matching sponsor name
  console.log('🔗 Attempting to auto-link based on email prefix...\n');

  for (const profile of unlinkedProfiles) {
    const emailPrefix = profile.email.split('@')[0].toLowerCase();
    
    // Try to find a sponsor with matching name
    const { data: matchingSponsors, error: sponsorError } = await supabaseAdmin
      .from('sponsors')
      .select('id, name')
      .ilike('name', emailPrefix);

    if (sponsorError) {
      console.error(`  ❌ Error finding sponsor for ${profile.email}:`, sponsorError.message);
      continue;
    }

    if (matchingSponsors && matchingSponsors.length > 0) {
      const sponsor = matchingSponsors[0];
      console.log(`  🔗 Linking ${profile.email} to sponsor "${sponsor.name}" (${sponsor.id})...`);

      const { error: linkError } = await supabaseAdmin
        .from('sponsor_admins')
        .insert({
          sponsor_id: sponsor.id,
          user_id: profile.id
        });

      if (linkError) {
        console.error(`  ❌ Failed to link: ${linkError.message}`);
      } else {
        console.log(`  ✅ Successfully linked ${profile.email} to "${sponsor.name}"`);
      }
    } else {
      console.log(`  ⚠️  No matching sponsor found for ${profile.email} (email prefix: "${emailPrefix}")`);
      console.log(`     You'll need to manually link this user to a sponsor.`);
      console.log(`     SQL: INSERT INTO sponsor_admins (sponsor_id, user_id) VALUES ('<sponsor_id>', '${profile.id}');`);
    }
    console.log('');
  }

  console.log('✅ Fix script completed\n');
}

// Run the fix
fixSponsorAdminLinks()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

