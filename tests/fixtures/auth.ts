import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  setSupabaseSession,
  waitForStoreInitialization,
  waitForStoreLoadingComplete,
  waitForProfileLoaded,
  createSessionFromAuth
} from '../helpers/auth-helper';

// Get Supabase credentials from environment
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set in .env.local for tests');
}

// Create admin client for user management (bypasses email confirmation)
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

type AuthFixtures = {
  authenticatedPage: any;
  superAdminPage: any;
  sponsorAdminPage: any;
};

export const test = base.extend<AuthFixtures>({
  // Authenticated page with a test user
  authenticatedPage: async ({ page }, use) => {
    // Create a test user and authenticate
    const testEmail = `test-${Date.now()}@test.com`;
    const testPassword = 'test-password-123';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Sign up test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw new Error(`Failed to create test user: ${signUpError.message}`);
    }

    // Sign in to get session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      throw new Error(`Failed to sign in test user: ${signInError.message}`);
    }

    if (!signInData.session) {
      throw new Error('No session returned from sign in');
    }

    // Create session object
    const session = createSessionFromAuth(
      signInData.session.access_token,
      signInData.session.refresh_token,
      signInData.user
    );

    // Set session using helper
    await setSupabaseSession(page, session, supabaseUrl, supabaseAnonKey);

    // Navigate to home to trigger store initialization
    await page.goto('/');
    
    // Wait for stores to initialize
    await waitForStoreInitialization(page);
    
    // Reload page to ensure session is picked up from cookies/localStorage
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait again for stores to update after reload
    await waitForStoreInitialization(page);
    
    // Extra wait to ensure profile is loaded
    await page.waitForTimeout(2000);

    await use(page);

    // Cleanup: sign out
    await supabase.auth.signOut();
  },

  // Super admin authenticated page - uses storageState
  superAdminPage: async ({ browser }, use) => {
    // Create a new context with the saved admin authentication state
    // storageState automatically restores both cookies and localStorage
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page = await context.newPage();

    // Helper function to ensure session is available after navigation
    const ensureSessionAvailable = async () => {
      // First, ensure localStorage has the session
      await page.waitForFunction(
        () => {
          const projectRef = 'uibbpcbshfkjcsnoscup';
          const storageKey = `sb-${projectRef}-auth-token`;
          const sessionData = localStorage.getItem(storageKey);
          return sessionData !== null;
        },
        { timeout: 10000 }
      );
      
      // Trigger Supabase client to re-read session by dispatching storage event
      // This simulates what happens when localStorage changes
      await page.evaluate(() => {
        const projectRef = 'uibbpcbshfkjcsnoscup';
        const storageKey = `sb-${projectRef}-auth-token`;
        const sessionData = localStorage.getItem(storageKey);
        if (sessionData) {
          // Dispatch storage event to notify Supabase client
          window.dispatchEvent(new StorageEvent('storage', {
            key: storageKey,
            newValue: sessionData,
            storageArea: localStorage
          }));
        }
      });
      
      // Wait a moment for Supabase client to process the event
      await page.waitForTimeout(1000);
      
      // Wait for the root layout's onMount to complete and store to initialize
      // We check for the absence of loading spinner AND presence of authenticated content
      await page.waitForFunction(
        () => {
          const hasSpinner = document.querySelector('.animate-spin') !== null;
          if (hasSpinner) return false;
          
          // Check for authenticated indicators (means store has user/profile)
          const hasSignOut = Array.from(document.querySelectorAll('button, a')).some(
            el => el.textContent?.toLowerCase().includes('sign out')
          );
          const hasAdminLink = document.querySelector('a[href="/admin"]') !== null;
          
          return hasSignOut || hasAdminLink;
        },
        { timeout: 30000 }
      );
      
      // Additional wait for profile to load
      await waitForProfileLoaded(page);
      await page.waitForTimeout(1500);
    };

    // Navigate to home to initialize stores
    await page.goto('/', { waitUntil: 'networkidle' });
    await ensureSessionAvailable();

    // Expose helper to tests so they can re-verify session after navigation
    (page as any).ensureSessionAvailable = ensureSessionAvailable;

    await use(page);

    await context.close();
  },

  // Sponsor admin authenticated page - uses storageState
  sponsorAdminPage: async ({ browser }, use) => {
    // Create a new context with the saved sponsor admin authentication state
    // storageState automatically restores both cookies and localStorage
    const context = await browser.newContext({
      storageState: 'playwright/.auth/sponsor-admin.json',
    });
    const page = await context.newPage();

    // Helper function to ensure session is available after navigation
    const ensureSessionAvailable = async () => {
      // First, ensure localStorage has the session
      await page.waitForFunction(
        () => {
          const projectRef = 'uibbpcbshfkjcsnoscup';
          const storageKey = `sb-${projectRef}-auth-token`;
          const sessionData = localStorage.getItem(storageKey);
          return sessionData !== null;
        },
        { timeout: 10000 }
      );
      
      // Trigger Supabase client to re-read session by dispatching storage event
      // This simulates what happens when localStorage changes
      await page.evaluate(() => {
        const projectRef = 'uibbpcbshfkjcsnoscup';
        const storageKey = `sb-${projectRef}-auth-token`;
        const sessionData = localStorage.getItem(storageKey);
        if (sessionData) {
          // Dispatch storage event to notify Supabase client
          window.dispatchEvent(new StorageEvent('storage', {
            key: storageKey,
            newValue: sessionData,
            storageArea: localStorage
          }));
        }
      });
      
      // Wait a moment for Supabase client to process the event
      await page.waitForTimeout(1000);
      
      // Wait for the root layout's onMount to complete and store to initialize
      // We check for the absence of loading spinner AND presence of authenticated content
      await page.waitForFunction(
        () => {
          const hasSpinner = document.querySelector('.animate-spin') !== null;
          if (hasSpinner) return false;
          
          // Check for authenticated indicators (means store has user/profile)
          const hasSignOut = Array.from(document.querySelectorAll('button, a')).some(
            el => el.textContent?.toLowerCase().includes('sign out')
          );
          const hasSponsorAdminLink = document.querySelector('a[href="/sponsor-admin"]') !== null;
          
          return hasSignOut || hasSponsorAdminLink;
        },
        { timeout: 30000 }
      );
      
      // Additional wait for profile to load
      await waitForStoreInitialization(page);
      await waitForProfileLoaded(page);
      await page.waitForTimeout(1500);
    };

    // Navigate to home to initialize stores
    await page.goto('/', { waitUntil: 'networkidle' });
    await ensureSessionAvailable();

    // Expose helper to tests so they can re-verify session after navigation
    (page as any).ensureSessionAvailable = ensureSessionAvailable;

    await use(page);

    await context.close();
  },
});

export { expect } from '@playwright/test';

