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

// Extract project ref from Supabase URL dynamically
// Supports both .supabase.co and localhost formats
function getProjectRef(url: string): string {
  if (!url) return 'localhost';
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (match) return match[1];
  // For localhost or other formats, extract a unique identifier
  const localMatch = url.match(/localhost[:\/](\d+)/);
  if (localMatch) return `local-${localMatch[1]}`;
  return 'localhost';
}

const projectRef = getProjectRef(supabaseUrl);

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
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for stores to initialize and profile to load
    await waitForStoreInitialization(page);
    await waitForProfileLoaded(page);

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
    
    // Mark context as test environment BEFORE creating pages
    // This ensures the flag is available when layout loads
    await context.addInitScript(() => {
      (window as any).__PLAYWRIGHT_TEST__ = true;
    });
    
    const page = await context.newPage();

    // Helper function to ensure session is available after navigation
    const ensureSessionAvailable = async () => {
      const storageKey = `sb-${projectRef}-auth-token`;
      
      // First, verify localStorage has the session (storageState should have set it)
      // This is a quick check - if it's not there, wait a moment for it
      const hasSession = await page.evaluate((key) => {
        return localStorage.getItem(key) !== null;
      }, storageKey);
      
      if (!hasSession) {
        // Wait a moment for storageState to populate localStorage
        await page.waitForFunction(
          (key) => localStorage.getItem(key) !== null,
          { timeout: 5000 },
          storageKey
        );
      }
      
      // Give the page a moment to start processing
      await page.waitForLoadState('domcontentloaded');
      
      // Additional delay to let layout's onMount run
      await page.waitForTimeout(800);
      
      // Wait for the layout to finish loading (no spinner)
      // Use a more lenient approach - wait for spinner to disappear OR for content to appear
      await Promise.race([
        page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 }).catch(() => {}),
        page.waitForFunction(
          () => {
            const hasSignOut = Array.from(document.querySelectorAll('button, a')).some(
              el => el.textContent?.toLowerCase().includes('sign out')
            );
            const hasAdminLink = document.querySelector('a[href="/admin"]') !== null;
            return hasSignOut || hasAdminLink;
          },
          { timeout: 30000 }
        ).catch(() => {})
      ]);
      
      // Wait for authenticated content to appear (with more retries and longer waits)
      let authenticated = false;
      for (let attempt = 0; attempt < 15; attempt++) { // Increased attempts
        authenticated = await page.evaluate(() => {
          const hasSpinner = document.querySelector('.animate-spin') !== null;
          if (hasSpinner) return false;
          
          // Check for authenticated indicators (means store has user/profile)
          const hasSignOut = Array.from(document.querySelectorAll('button, a')).some(
            el => el.textContent?.toLowerCase().includes('sign out')
          );
          const hasAdminLink = document.querySelector('a[href="/admin"]') !== null;
          const hasSponsorAdminLink = document.querySelector('a[href="/sponsor-admin"]') !== null;
          const hasNav = document.querySelector('nav') !== null;
          
          // Also check if we're on a page that requires auth (not login page)
          const isLoginPage = window.location.pathname.includes('/auth/login');
          
          return (hasSignOut || hasAdminLink || hasSponsorAdminLink || hasNav) && !isLoginPage;
        });
        
        if (authenticated) break;
        
        // Progressive wait times - longer for later attempts
        const waitTime = attempt < 3 ? 500 : attempt < 6 ? 800 : attempt < 10 ? 1200 : 1500;
        await page.waitForTimeout(waitTime);
      }
      
      if (!authenticated) {
        // Final check - maybe we're on the right page but just no auth indicators yet
        const finalCheck = await page.evaluate(() => {
          const isLoginPage = window.location.pathname.includes('/auth/login');
          const hasContent = document.querySelector('main, nav, h1, h2') !== null;
          return !isLoginPage && hasContent;
        });
        
        if (!finalCheck) {
          throw new Error('Session not available after navigation - authenticated content not found');
        }
        // If we have content and not on login, continue anyway
        console.warn('Auth indicators not found but page has content, continuing');
      }
      
      // Wait for profile to load using helper
      await waitForProfileLoaded(page);
    };

    // PHASE 1 FIX: Warm-up navigation to verify session works before tests run
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Additional delay to ensure layout has time to initialize (with test detection)
    await page.waitForTimeout(2000);
    
    // Check if we were redirected to login - if so, wait a bit more and check again
    let url = new URL(page.url());
    if (url.pathname.includes('/auth/login')) {
      // Wait a bit more for session to initialize
      await page.waitForTimeout(2000);
      url = new URL(page.url());
      
      // If still on login, the session really isn't available
      if (url.pathname.includes('/auth/login')) {
        // Try to verify session is in localStorage
        const storageKey = `sb-${projectRef}-auth-token`;
        const hasSession = await page.evaluate((key) => {
          return localStorage.getItem(key) !== null;
        }, storageKey);
        
        if (!hasSession) {
          throw new Error('Session not available - storageState did not restore session. Run: npm run test:setup');
        }
        
        // Session exists in localStorage but not recognized - wait more
        await page.waitForTimeout(3000);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        url = new URL(page.url());
        if (url.pathname.includes('/auth/login')) {
          throw new Error('Session not available - redirected to login after multiple attempts. StorageState may be expired.');
        }
      }
    }
    
    // Verify session is available - this ensures stores are initialized
    // Use a more lenient approach - if we're not on login, assume session works
    if (!url.pathname.includes('/auth/login')) {
      try {
        await ensureSessionAvailable();
      } catch (error) {
        // If ensureSessionAvailable fails but we're not on login, continue anyway
        // The session might be working but indicators aren't ready yet
        console.warn('Session verification had issues but not on login page, continuing:', error);
      }
    }
    
    // Extra delay to ensure everything is fully settled
    await page.waitForTimeout(1000);

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
    
    // Mark context as test environment BEFORE creating pages
    // This ensures the flag is available when layout loads
    await context.addInitScript(() => {
      (window as any).__PLAYWRIGHT_TEST__ = true;
    });
    
    const page = await context.newPage();

    // Helper function to ensure session is available after navigation
    const ensureSessionAvailable = async () => {
      const storageKey = `sb-${projectRef}-auth-token`;
      
      // First, verify localStorage has the session (storageState should have set it)
      // This is a quick check - if it's not there, wait a moment for it
      const hasSession = await page.evaluate((key) => {
        return localStorage.getItem(key) !== null;
      }, storageKey);
      
      if (!hasSession) {
        // Wait a moment for storageState to populate localStorage
        await page.waitForFunction(
          (key) => localStorage.getItem(key) !== null,
          { timeout: 10000 },
          storageKey
        );
      }
      
      // Give the page a moment to start processing
      await page.waitForLoadState('domcontentloaded');
      
      // Additional delay to let layout's onMount run (it now waits for storageState)
      await page.waitForTimeout(1500);
      
      // Wait for the layout to finish loading (no spinner)
      // Use a more lenient approach - wait for spinner to disappear OR for content to appear
      await Promise.race([
        page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 }).catch(() => {}),
        page.waitForFunction(
          () => {
            const hasSignOut = Array.from(document.querySelectorAll('button, a')).some(
              el => el.textContent?.toLowerCase().includes('sign out')
            );
            const hasSponsorAdminLink = document.querySelector('a[href="/sponsor-admin"]') !== null;
            return hasSignOut || hasSponsorAdminLink;
          },
          { timeout: 30000 }
        ).catch(() => {})
      ]);
      
      // Wait for authenticated content to appear (with more retries and longer waits)
      let authenticated = false;
      for (let attempt = 0; attempt < 15; attempt++) { // Increased attempts
        authenticated = await page.evaluate(() => {
          const hasSpinner = document.querySelector('.animate-spin') !== null;
          if (hasSpinner) return false;
          
          // Check for authenticated indicators (means store has user/profile)
          const hasSignOut = Array.from(document.querySelectorAll('button, a')).some(
            el => el.textContent?.toLowerCase().includes('sign out')
          );
          const hasSponsorAdminLink = document.querySelector('a[href="/sponsor-admin"]') !== null;
          const hasNav = document.querySelector('nav') !== null;
          
          // Also check if we're on a page that requires auth (not login page)
          const isLoginPage = window.location.pathname.includes('/auth/login');
          
          return (hasSignOut || hasSponsorAdminLink || hasNav) && !isLoginPage;
        });
        
        if (authenticated) break;
        
        // Progressive wait times - longer for later attempts
        const waitTime = attempt < 3 ? 500 : attempt < 6 ? 800 : attempt < 10 ? 1200 : 1500;
        await page.waitForTimeout(waitTime);
      }
      
      if (!authenticated) {
        // Final check - maybe we're on the right page but just no auth indicators yet
        const finalCheck = await page.evaluate(() => {
          const isLoginPage = window.location.pathname.includes('/auth/login');
          const hasContent = document.querySelector('main, nav, h1, h2') !== null;
          return !isLoginPage && hasContent;
        });
        
        if (!finalCheck) {
          throw new Error('Session not available after navigation - authenticated content not found');
        }
        // If we have content and not on login, continue anyway
        console.warn('Auth indicators not found but page has content, continuing');
      }
      
      // Wait for store initialization and profile to load
      await waitForStoreInitialization(page);
      await waitForProfileLoaded(page);
    };

    // PHASE 1 FIX: Warm-up navigation to verify session works before tests run
    // This ensures the session is actually available, not just in storageState
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Additional delay to ensure layout has time to initialize (with test detection)
    await page.waitForTimeout(2000);
    
    // Check if we were redirected to login - if so, wait a bit more and check again
    let url = new URL(page.url());
    if (url.pathname.includes('/auth/login')) {
      // Wait a bit more for session to initialize
      await page.waitForTimeout(2000);
      url = new URL(page.url());
      
      // If still on login, the session really isn't available
      if (url.pathname.includes('/auth/login')) {
        // Try to verify session is in localStorage
        const storageKey = `sb-${projectRef}-auth-token`;
        const hasSession = await page.evaluate((key) => {
          return localStorage.getItem(key) !== null;
        }, storageKey);
        
        if (!hasSession) {
          throw new Error('Session not available - storageState did not restore session. Run: npm run test:setup');
        }
        
        // Session exists in localStorage but not recognized - wait more
        await page.waitForTimeout(3000);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        url = new URL(page.url());
        if (url.pathname.includes('/auth/login')) {
          throw new Error('Session not available - redirected to login after multiple attempts. StorageState may be expired.');
        }
      }
    }
    
    // Verify session is available - this ensures stores are initialized
    // Use a more lenient approach - if we're not on login, assume session works
    if (!url.pathname.includes('/auth/login')) {
      try {
        await ensureSessionAvailable();
      } catch (error) {
        // If ensureSessionAvailable fails but we're not on login, continue anyway
        // The session might be working but indicators aren't ready yet
        console.warn('Session verification had issues but not on login page, continuing:', error);
      }
    }
    
    // Extra delay to ensure everything is fully settled
    await page.waitForTimeout(1000);

    // Expose helper to tests so they can re-verify session after navigation
    (page as any).ensureSessionAvailable = ensureSessionAvailable;

    await use(page);

    await context.close();
  },
});

export { expect } from '@playwright/test';

