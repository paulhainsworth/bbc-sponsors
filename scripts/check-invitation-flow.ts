/**
 * Script to check the invitation flow for a specific user
 * This traces the entire invitation -> acceptance -> linking process
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
  console.error('❌ Required environment variables not set');
  process.exit(1);
}

const email = process.argv[2] || 'boots@mailinator.com';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkInvitationFlow() {
  console.log(`🔍 Checking invitation flow for: ${email}\n`);

  // Step 1: Find the user profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, created_at')
    .eq('email', email)
    .single();

  if (!profile) {
    console.error(`❌ User profile not found: ${email}`);
    return;
  }

  console.log(`✅ Found profile:`);
  console.log(`   ID: ${profile.id}`);
  console.log(`   Email: ${profile.email}`);
  console.log(`   Role: ${profile.role}`);
  console.log(`   Created: ${profile.created_at}\n`);

  // Step 2: Check for invitations
  const { data: invitations } = await supabaseAdmin
    .from('invitations')
    .select('*, sponsors(name)')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (!invitations || invitations.length === 0) {
    console.log('⚠️  No invitations found for this email\n');
  } else {
    console.log(`✅ Found ${invitations.length} invitation(s):`);
    invitations.forEach((inv, idx) => {
      console.log(`\n   Invitation ${idx + 1}:`);
      console.log(`   ID: ${inv.id}`);
      console.log(`   Token: ${inv.token}`);
      console.log(`   Role: ${inv.role}`);
      console.log(`   Sponsor ID: ${inv.sponsor_id || 'NULL ❌'}`);
      console.log(`   Sponsor Name: ${inv.sponsors?.name || 'N/A'}`);
      console.log(`   Accepted: ${inv.accepted_at ? 'Yes ✅' : 'No ❌'}`);
      console.log(`   Accepted At: ${inv.accepted_at || 'N/A'}`);
      console.log(`   Expires At: ${inv.expires_at}`);
      console.log(`   Created At: ${inv.created_at}`);
    });
    console.log('');
  }

  // Step 3: Check sponsor_admins link
  const { data: sponsorAdmin } = await supabaseAdmin
    .from('sponsor_admins')
    .select('*, sponsors(name)')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!sponsorAdmin) {
    console.error('❌ No sponsor_admins link found!\n');
    
    // Step 4: Try to find a matching sponsor
    if (invitations && invitations.length > 0) {
      const latestInvitation = invitations[0];
      if (latestInvitation.sponsor_id) {
        console.log(`💡 Found invitation with sponsor_id: ${latestInvitation.sponsor_id}`);
        console.log(`   Sponsor: ${latestInvitation.sponsors?.name || 'Unknown'}`);
        console.log(`   This link should have been created during invitation acceptance.\n`);
        
        // Check if the sponsor exists
        const { data: sponsor } = await supabaseAdmin
          .from('sponsors')
          .select('id, name')
          .eq('id', latestInvitation.sponsor_id)
          .single();
        
        if (sponsor) {
          console.log(`✅ Sponsor exists: ${sponsor.name}`);
          console.log(`\n🔧 Would you like to create the missing link?`);
          console.log(`   Run: npx tsx scripts/check-and-fix-user.ts ${email} ${sponsor.name}`);
        }
      } else {
        console.error('❌ Latest invitation has no sponsor_id!');
        console.error('   This means the invitation was created without a sponsor link.');
        console.error('   The invitation acceptance would have failed to create the sponsor_admins record.\n');
      }
    } else {
      // No invitations, check if there's a sponsor that matches the email prefix
      const emailPrefix = email.split('@')[0];
      const { data: matchingSponsors } = await supabaseAdmin
        .from('sponsors')
        .select('id, name')
        .ilike('name', emailPrefix);
      
      if (matchingSponsors && matchingSponsors.length > 0) {
        console.log(`💡 Found potential matching sponsor(s):`);
        matchingSponsors.forEach(s => {
          console.log(`   - ${s.name} (${s.id})`);
        });
        console.log(`\n🔧 You can manually link the user with:`);
        console.log(`   npx tsx scripts/check-and-fix-user.ts ${email} ${matchingSponsors[0].name}`);
      }
    }
  } else {
    console.log(`✅ Sponsor link exists:`);
    console.log(`   Sponsor: ${sponsorAdmin.sponsors?.name || 'Unknown'}`);
    console.log(`   Sponsor ID: ${sponsorAdmin.sponsor_id}`);
    console.log(`   Link ID: ${sponsorAdmin.id}`);
    console.log(`   Created: ${sponsorAdmin.created_at}\n`);
    
    // Verify the invitation had the sponsor_id
    if (invitations && invitations.length > 0) {
      const latestInvitation = invitations[0];
      if (latestInvitation.sponsor_id === sponsorAdmin.sponsor_id) {
        console.log(`✅ Invitation and link match!`);
      } else {
        console.warn(`⚠️  Invitation sponsor_id (${latestInvitation.sponsor_id}) doesn't match link sponsor_id (${sponsorAdmin.sponsor_id})`);
      }
    }
  }

  // Step 5: Summary
  console.log('\n📊 Summary:');
  console.log(`   Profile exists: ${profile ? '✅' : '❌'}`);
  console.log(`   Invitations found: ${invitations?.length || 0}`);
  console.log(`   Sponsor link exists: ${sponsorAdmin ? '✅' : '❌'}`);
  
  if (invitations && invitations.length > 0) {
    const latestInvitation = invitations[0];
    console.log(`   Latest invitation has sponsor_id: ${latestInvitation.sponsor_id ? '✅' : '❌'}`);
    console.log(`   Latest invitation accepted: ${latestInvitation.accepted_at ? '✅' : '❌'}`);
  }
}

checkInvitationFlow()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

