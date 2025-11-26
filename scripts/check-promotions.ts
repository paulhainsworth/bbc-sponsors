/**
 * Script to check promotions for a specific sponsor
 * Usage: npx tsx scripts/check-promotions.ts <sponsor-id>
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const sponsorId = process.argv[2];

if (!sponsorId) {
  console.error('Usage: npx tsx scripts/check-promotions.ts <sponsor-id>');
  console.error('Example: npx tsx scripts/check-promotions.ts 65f38ae3-fa7a-4c2a-a561-56a622c0a03e');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkPromotions() {
  console.log(`\nChecking promotions for sponsor: ${sponsorId}\n`);

  // Get all promotions for this sponsor (bypassing RLS)
  const { data: allPromotions, error: allError } = await supabase
    .from('promotions')
    .select('*')
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('Error fetching all promotions:', allError);
    return;
  }

  console.log(`Total promotions: ${allPromotions?.length || 0}\n`);

  if (!allPromotions || allPromotions.length === 0) {
    console.log('No promotions found for this sponsor.');
    return;
  }

  // Show all promotions
  allPromotions.forEach((promo, index) => {
    console.log(`\nPromotion ${index + 1}:`);
    console.log(`  ID: ${promo.id}`);
    console.log(`  Title: ${promo.title}`);
    console.log(`  Status: ${promo.status}`);
    console.log(`  Is Featured: ${promo.is_featured}`);
    console.log(`  Start Date: ${promo.start_date}`);
    console.log(`  End Date: ${promo.end_date || 'NULL'}`);
    console.log(`  Created At: ${promo.created_at}`);
    
    // Check if it would pass the public query filters
    const now = new Date().toISOString();
    const hasStarted = promo.start_date <= now;
    const hasNotEnded = !promo.end_date || promo.end_date >= now;
    const isActive = promo.status === 'active';
    const wouldShow = isActive && hasStarted && hasNotEnded;
    
    console.log(`  Would show on public page: ${wouldShow ? 'YES' : 'NO'}`);
    if (!wouldShow) {
      console.log(`    Reasons:`);
      if (!isActive) console.log(`      - Status is '${promo.status}', not 'active'`);
      if (!hasStarted) console.log(`      - Start date is in the future`);
      if (!hasNotEnded) console.log(`      - End date has passed`);
    }
  });

  // Test the public query
  console.log(`\n\nTesting public query (as anonymous user)...`);
  const anonClient = createClient(supabaseUrl, process.env.PUBLIC_SUPABASE_ANON_KEY || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const now = new Date().toISOString();
  const { data: publicPromotions, error: publicError } = await anonClient
    .from('promotions')
    .select('*')
    .eq('sponsor_id', sponsorId)
    .eq('status', 'active')
    .lte('start_date', now)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (publicError) {
    console.error('Error with public query:', publicError);
    console.error('This suggests an RLS policy issue.');
  } else {
    console.log(`Public query returned: ${publicPromotions?.length || 0} promotions`);
    if (publicPromotions && publicPromotions.length > 0) {
      publicPromotions.forEach((p) => {
        console.log(`  - ${p.title} (${p.status})`);
      });
    }
  }
}

checkPromotions().catch(console.error);

