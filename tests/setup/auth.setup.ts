/**
 * Playwright Setup Script for Authentication
 * Creates authenticated state files for admin and sponsor admin users
 * These states are reused across all tests
 */

import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
}

// Create admin client for user management
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Test user credentials
const adminEmail = process.env.TEST_ADMIN_EMAIL || `test-admin-${Date.now()}@mailinator.com`;
const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
const sponsorEmail = process.env.TEST_SPONSOR_ADMIN_EMAIL || `test-sponsor-${Date.now()}@mailinator.com`;
const sponsorPassword = process.env.TEST_SPONSOR_ADMIN_PASSWORD || 'SponsorPassword123!';

/**
 * Creates or gets a user and returns credentials
 */
async function ensureUser(email: string, password: string, role: 'super_admin' | 'sponsor_admin') {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Try to sign in first
  let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // If user doesn't exist, create it
  if (signInError && signInError.message.includes('Invalid login credentials')) {
    if (supabaseAdmin) {
      // Use admin API to create user with confirmed email
      const { data: userData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role
        }
      });

      if (adminError) {
        throw new Error(`Failed to create ${role} user: ${adminError.message}`);
      }

      // Sign in with the created user
      await new Promise(resolve => setTimeout(resolve, 1000));
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      signInData = signInResult.data;
      signInError = signInResult.error;
    } else {
      // Fallback to regular signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role }
        }
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw new Error(`Failed to create ${role} user: ${signUpError.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      signInData = signInResult.data;
      signInError = signInResult.error;
    }
  }

  if (signInError || !signInData?.session) {
    throw new Error(`Failed to authenticate ${role}: ${signInError?.message || 'No session'}`);
  }

  return { email, password, session: signInData.session, user: signInData.user };
}

/**
 * Ensures profile exists for a user
 */
async function ensureProfile(userId: string, email: string, role: 'super_admin' | 'sponsor_admin') {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role: role,
      display_name: email.split('@')[0]
    }, {
      onConflict: 'id'
    });

  if (error) {
    console.warn(`Profile upsert warning: ${error.message}`);
  }
}

/**
 * Ensures sponsor admin is linked to a sponsor
 */
async function ensureSponsorLink(userId: string) {
  if (!supabaseAdmin) {
    console.warn('No supabaseAdmin client, cannot create sponsor link');
    return;
  }

  // Get or create test sponsor
  const { data: sponsors, error: sponsorQueryError } = await supabaseAdmin
    .from('sponsors')
    .select('id')
    .eq('name', 'Test Sponsor')
    .limit(1);

  if (sponsorQueryError) {
    console.warn('Error querying sponsors:', sponsorQueryError.message);
  }

  let sponsorId;
  if (sponsors && sponsors.length > 0) {
    sponsorId = sponsors[0].id;
    console.log('Using existing test sponsor:', sponsorId);
  } else {
    const { data: newSponsor, error: sponsorError } = await supabaseAdmin
      .from('sponsors')
      .insert({
        name: 'Test Sponsor',
        slug: 'test-sponsor',
        status: 'active'
      })
      .select()
      .single();

    if (sponsorError) {
      console.error('Could not create test sponsor:', sponsorError.message);
      return;
    }
    sponsorId = newSponsor?.id;
    console.log('Created test sponsor:', sponsorId);
  }

  // Link sponsor admin to sponsor
  if (sponsorId) {
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('sponsor_admins')
      .upsert({
        sponsor_id: sponsorId,
        user_id: userId
      }, {
        onConflict: 'sponsor_id,user_id'
      })
      .select();

    if (linkError) {
      console.error('Error linking sponsor admin:', linkError.message);
    } else {
      console.log('Sponsor admin linked successfully:', linkData);
    }
  } else {
    console.error('No sponsor ID available to link');
  }
}

// Setup admin authentication state
setup('authenticate as admin', async ({ page }) => {
  console.log('🔐 Setting up admin authentication...');

  // Ensure user exists and get credentials
  const { email, password, user } = await ensureUser(adminEmail, adminPassword, 'super_admin');

  // Ensure profile exists
  await ensureProfile(user.id, email, 'super_admin');

  // Navigate to login page
  await page.goto('/auth/login');

  // Fill in login form and submit
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('button', { name: /sign in|log in|send magic link/i }).click();

  // Wait for magic link email to be sent (or handle password login if available)
  // For now, we'll use the session we already have
  // In a real scenario, you might want to use password login if available

  // Instead, let's set the session directly via cookies/localStorage
  // This is more reliable for setup scripts
  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'localhost';
  const cookieName = `sb-${projectRef}-auth-token`;
  
  // Get the session from Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!session) {
    throw new Error('Failed to get session for admin user');
  }

  // Set cookie with longer expiration (24 hours) to avoid expiration during tests
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    expires_in: 86400,
    token_type: 'bearer',
    user: session.user
  };

  await page.context().addCookies([
    {
      name: cookieName,
      value: JSON.stringify(sessionData),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
      expires: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
    }
  ]);

  // Navigate first, then set localStorage in page context
  await page.goto('/');
  
  // Set localStorage directly in the page (after navigation so it's captured)
  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    {
      key: cookieName,
      data: sessionData
    }
  );
  
  // Reload to ensure Supabase client reads from localStorage
  await page.reload({ waitUntil: 'networkidle' });
  
  // Wait for store to initialize and verify we're authenticated
  await page.waitForFunction(
    () => {
      const hasContent = document.querySelector('main, nav') !== null;
      const hasSpinner = document.querySelector('.animate-spin') !== null;
      const hasAuthContent = Array.from(document.querySelectorAll('button, a')).some(
        el => el.textContent?.toLowerCase().includes('sign out') || 
              el.getAttribute('href') === '/admin'
      );
      return hasContent && !hasSpinner && hasAuthContent;
    },
    { timeout: 20000 }
  );

  // Save authenticated state (includes cookies and localStorage)
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
  
  console.log('✅ Admin authentication state saved');
});

// Setup sponsor admin authentication state
setup('authenticate as sponsor admin', async ({ page }) => {
  console.log('🔐 Setting up sponsor admin authentication...');

  // Ensure user exists and get credentials
  const { email, password, user } = await ensureUser(sponsorEmail, sponsorPassword, 'sponsor_admin');

  // Ensure profile exists
  await ensureProfile(user.id, email, 'sponsor_admin');

  // Ensure sponsor link exists
  await ensureSponsorLink(user.id);

  // Get the session from Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!session) {
    throw new Error('Failed to get session for sponsor admin user');
  }

  // Set cookie
  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'localhost';
  const cookieName = `sb-${projectRef}-auth-token`;
  
  // Set cookie with longer expiration (24 hours) to avoid expiration during tests
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    expires_in: 86400,
    token_type: 'bearer',
    user: session.user
  };

  await page.context().addCookies([
    {
      name: cookieName,
      value: JSON.stringify(sessionData),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
      expires: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
    }
  ]);

  // Navigate first, then set localStorage in page context
  await page.goto('/');
  
  // Set localStorage directly in the page (after navigation so it's captured)
  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    {
      key: cookieName,
      data: sessionData
    }
  );
  
  // Reload to ensure Supabase client reads from localStorage
  await page.reload({ waitUntil: 'networkidle' });
  
  // Wait for store to initialize and verify we're authenticated
  await page.waitForFunction(
    () => {
      const hasContent = document.querySelector('main, nav') !== null;
      const hasSpinner = document.querySelector('.animate-spin') !== null;
      const hasAuthContent = Array.from(document.querySelectorAll('button, a')).some(
        el => el.textContent?.toLowerCase().includes('sign out') || 
              el.getAttribute('href') === '/sponsor-admin'
      );
      return hasContent && !hasSpinner && hasAuthContent;
    },
    { timeout: 20000 }
  );

  // Save authenticated state (includes cookies and localStorage)
  await page.context().storageState({ path: 'playwright/.auth/sponsor-admin.json' });
  
  console.log('✅ Sponsor admin authentication state saved');
});

