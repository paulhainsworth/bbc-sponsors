/**
 * Script to check all RLS policies on sponsor_admins table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Required environment variables not set');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkPolicies() {
  console.log('🔍 Checking RLS policies on sponsor_admins table...\n');

  // Query pg_policies to see all policies
  const { data: policies, error } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      SELECT 
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'sponsor_admins'
      ORDER BY policyname;
    `
  }).catch(async () => {
    // If exec_sql doesn't work, try direct query
    const { data, error: queryError } = await supabaseAdmin
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('schemaname', 'public')
      .eq('tablename', 'sponsor_admins');
    
    if (queryError) {
      // Last resort: query information_schema
      console.log('⚠️  Cannot query pg_policies directly. Using alternative method...\n');
      return { data: null, error: queryError };
    }
    return { data, error: null };
  });

  if (error || !policies) {
    console.log('⚠️  Could not query policies directly. Here are the policies that should exist:\n');
    console.log('Expected policies:');
    console.log('  1. "Users can view own sponsor admin records"');
    console.log('  2. "Users can insert own sponsor admin record"');
    console.log('  3. "Super admins can manage sponsor admins"');
    console.log('  4. "Sponsor admins can remove team members"');
    console.log('\n❌ "Sponsor admins can view team members" should NOT exist (causes recursion)\n');
    console.log('💡 Run this SQL to check policies:');
    console.log(`
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'sponsor_admins'
ORDER BY policyname;
    `);
    return;
  }

  console.log(`✅ Found ${policies.length} policy/policies:\n`);

  policies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.policyname}`);
    console.log(`   Command: ${policy.cmd}`);
    if (policy.qual) {
      const qual = typeof policy.qual === 'string' ? policy.qual : JSON.stringify(policy.qual);
      console.log(`   Condition: ${qual.substring(0, 200)}${qual.length > 200 ? '...' : ''}`);
    }
    console.log('');
  });

  // Check for the problematic policy
  const problematicPolicy = policies.find((p: any) => 
    p.policyname === 'Sponsor admins can view team members'
  );

  if (problematicPolicy) {
    console.error('❌ PROBLEM FOUND: "Sponsor admins can view team members" policy still exists!');
    console.error('   This policy causes infinite recursion.');
    console.error('   Run: DROP POLICY IF EXISTS "Sponsor admins can view team members" ON sponsor_admins;\n');
  } else {
    console.log('✅ "Sponsor admins can view team members" policy is NOT present (good!)\n');
  }

  // Check for policies that might cause recursion
  const recursivePolicies = policies.filter((p: any) => {
    const qual = typeof p.qual === 'string' ? p.qual : JSON.stringify(p.qual);
    return qual.includes('sponsor_admins') && qual.includes('EXISTS');
  });

  if (recursivePolicies.length > 0) {
    console.warn('⚠️  Found policies that query sponsor_admins (potential recursion):');
    recursivePolicies.forEach((p: any) => {
      console.warn(`   - ${p.policyname}`);
    });
    console.warn('');
  }
}

checkPolicies()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


