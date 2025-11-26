/**
 * Authentication helper functions for Playwright tests
 * Handles Supabase SSR cookie format and session management
 */

import { Page } from '@playwright/test';

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: any;
}

/**
 * Sets Supabase session in page context using both cookies and localStorage
 * Supabase SSR uses cookies, but localStorage is also needed for browser client
 * Also sets session via Supabase client's setSession method for proper initialization
 */
export async function setSupabaseSession(
  page: Page,
  session: SupabaseSession,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<void> {
  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'localhost';
  const cookieName = `sb-${projectRef}-auth-token`;
  const storageKey = cookieName;

  // Set cookie (Supabase SSR reads from cookies)
  const context = page.context();
  await context.addCookies([
    {
      name: cookieName,
      value: JSON.stringify(session),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
      expires: Math.floor(session.expires_at)
    }
  ]);

  // Set localStorage and initialize Supabase client session
  await page.addInitScript(
    async ({ sessionData, key, url, anonKey }) => {
      // Set in localStorage
      localStorage.setItem(key, JSON.stringify(sessionData));
      
      // Also set session via Supabase client if available
      // This ensures the client is properly initialized
      try {
        // Try to use the Supabase client from the page
        // If the page hasn't loaded yet, this will be set when it does
        if (window && (window as any).__SUPABASE_CLIENT__) {
          const supabase = (window as any).__SUPABASE_CLIENT__;
          await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token
          });
        }
      } catch (e) {
        // If client not available yet, localStorage will be read when it initializes
        console.log('Supabase client not available yet, session will be set on page load');
      }
      
      // Trigger storage event to notify listeners
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(sessionData),
        storageArea: localStorage
      }));
    },
    {
      sessionData: session,
      key: storageKey,
      url: supabaseUrl,
      anonKey: supabaseAnonKey
    }
  );
}

/**
 * Waits for Svelte userStore to be initialized
 * Checks for authenticated content that indicates store is ready
 * Also checks if we're on login page (which means store initialized but not authenticated)
 */
export async function waitForStoreInitialization(
  page: Page,
  timeout = 20000
): Promise<void> {
  // Wait for one of these indicators that store is initialized:
  // 1. Sign out button (authenticated)
  // 2. Admin/sponsor-admin links (authenticated)
  // 3. Login page redirect (not authenticated, but store initialized)
  // 4. Any main content (store initialized, even if redirecting)
  try {
    await page.waitForFunction(
      () => {
        // Check for authenticated indicators
        const hasSignOut = Array.from(document.querySelectorAll('button')).some(
          btn => btn.textContent?.toLowerCase().includes('sign out')
        );
        const hasAdminLink = document.querySelector('a[href="/admin"]') !== null;
        const hasSponsorAdminLink = document.querySelector('a[href="/sponsor-admin"]') !== null;
        const isLoginPage = window.location.pathname.includes('/auth/login');
        const hasMainContent = document.querySelector('main, nav, [role="main"]') !== null;
        
        // Store is initialized if we see authenticated content OR we're on login page OR we have main content
        return hasSignOut || hasAdminLink || hasSponsorAdminLink || isLoginPage || hasMainContent;
      },
      { timeout }
    );
    
    // Additional wait to ensure store is fully populated
    await page.waitForTimeout(1000);
  } catch (error) {
    // If timeout, wait a bit more and continue
    console.warn('Store initialization check timed out, waiting additional 3s...');
    await page.waitForTimeout(3000);
  }
}

/**
 * Waits for the Svelte store's loading state to become false
 * This is critical for reactive statements that check !$userStore.loading
 * Also ensures the session is properly set in the browser context
 */
export async function waitForStoreLoadingComplete(
  page: Page,
  session: SupabaseSession | null = null,
  supabaseUrl: string = '',
  supabaseAnonKey: string = '',
  timeout = 20000
): Promise<void> {
  // If we have session data, ensure it's set in the browser context
  // This is needed because Supabase client needs to read from cookies/localStorage
  if (session && supabaseUrl && supabaseAnonKey) {
    // Wait for page to be ready, then set session via evaluate
    await page.waitForLoadState('domcontentloaded');
    
    // Set session in browser context by accessing the Supabase client
    // The client should read from cookies/localStorage we set earlier
    await page.evaluate(
      async ({ accessToken, refreshToken }) => {
        // Try to get the Supabase client from the page's context
        // If it's not available, the cookies/localStorage we set will be read on next navigation
        try {
          // Check if there's a global Supabase instance or if we can access it
          // The createBrowserClient should read from localStorage automatically
          const storageKey = Object.keys(localStorage).find(key => key.includes('auth-token'));
          if (storageKey) {
            const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            // Verify the session is there
            if (sessionData.access_token === accessToken) {
              return true;
            }
          }
        } catch (e) {
          console.log('Could not verify session in browser context:', e);
        }
        return false;
      },
      {
        accessToken: session.access_token,
        refreshToken: session.refresh_token
      }
    );
  }
  
  // Wait for the store to finish loading by checking for indicators
  // The store sets loading: false when setUser() or setProfile() is called
  try {
    await page.waitForFunction(
      () => {
        // Check if we're past the initial loading state
        // The root layout sets loading: false when session/profile is loaded
        // We can detect this by:
        // 1. No loading spinner on the page (layout has rendered)
        // 2. Or we're on a specific page (redirect happened)
        // 3. Or we see authenticated content
        
        const hasLoadingSpinner = document.querySelector('.animate-spin') !== null;
        const isLoginPage = window.location.pathname.includes('/auth/login');
        const hasAuthenticatedContent = Array.from(document.querySelectorAll('button, a')).some(
          el => el.textContent?.toLowerCase().includes('sign out') || 
                el.getAttribute('href') === '/admin' || 
                el.getAttribute('href') === '/sponsor-admin'
        );
        const hasMainContent = document.querySelector('main, nav') !== null;
        
        // Store is done loading if:
        // - We have main content and no spinner (normal case)
        // - We're on login page (redirect happened, store initialized)
        // - We have authenticated content (store initialized with user)
        return (!hasLoadingSpinner && hasMainContent) || isLoginPage || hasAuthenticatedContent;
      },
      { timeout }
    );
    
    // Additional wait to ensure reactive statements have run
    await page.waitForTimeout(1000);
  } catch (error) {
    console.warn('Store loading check timed out, waiting additional 2s...');
    await page.waitForTimeout(2000);
  }
}

/**
 * Waits for profile to be loaded in the store
 * Useful for pages that check $userStore.profile
 */
export async function waitForProfileLoaded(
  page: Page,
  timeout = 10000
): Promise<void> {
  // Wait for profile-dependent content
  // This could be admin nav, sponsor admin nav, or user-specific content
  try {
    await page.waitForFunction(
      () => {
        // Check if we're past the loading state
        // Loading spinners indicate store is still initializing
        const hasLoadingSpinner = document.querySelector('.animate-spin') !== null;
        const hasContent = document.querySelector('main, nav, [role="main"]') !== null;
        
        // Profile is loaded if we have content and no loading spinner
        return hasContent && !hasLoadingSpinner;
      },
      { timeout }
    );
  } catch (error) {
    console.warn('Profile load check timed out, continuing...');
  }
}

/**
 * Creates a Supabase session object from auth response
 */
export function createSessionFromAuth(
  accessToken: string,
  refreshToken: string,
  user: any,
  expiresIn = 3600
): SupabaseSession {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    expires_in: expiresIn,
    token_type: 'bearer',
    user: user
  };
}

