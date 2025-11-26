import { Page } from '@playwright/test';

/**
 * Helper function to mock authentication for tests
 * This mocks the Supabase API calls that populate the userStore
 */
export async function mockAuth(page: Page, user: { id: string; email: string; role: 'super_admin' | 'sponsor_admin' }) {
  // Mock Supabase session check - this is called by getSession()
  await page.route('**/auth/v1/user*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user)
    });
  });

  // Mock the session endpoint that getSession() uses
  await page.route('**/auth/v1/token*', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: user
        })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: user
        })
      });
    }
  });

  // Mock profiles API (called by root layout to populate userStore)
  // Handle both single and multiple query formats
  await page.route('**/rest/v1/profiles*', route => {
    const url = route.request().url();
    const userId = user.id;
    
    // Check if this request is for our user
    if (url.includes(`id=eq.${userId}`) || url.includes(`id=${userId}`)) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Content-Range': '0-0/1'
        },
        body: JSON.stringify([{
          id: user.id,
          email: user.email,
          role: user.role,
          display_name: user.email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      });
    } else {
      route.continue();
    }
  });

  // Set up context to simulate authenticated session before page loads
  // Supabase stores session in localStorage with a key based on the project URL
  await page.addInitScript((userData, supabaseUrl) => {
    const sessionData = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: userData
    };
    
    // Supabase SSR uses a key format: sb-<project-ref>-auth-token
    // Extract project ref from URL (e.g., https://xxx.supabase.co -> xxx)
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'localhost';
    const storageKey = `sb-${projectRef}-auth-token`;
    
    // Store session in localStorage (Supabase browser client reads from here)
    localStorage.setItem(storageKey, JSON.stringify(sessionData));
    
    // Also try common variations
    localStorage.setItem('sb-auth-token', JSON.stringify(sessionData));
    
    // Mock the session object that getSession() returns
    (window as any).__SUPABASE_SESSION__ = {
      data: { session: sessionData },
      error: null
    };
  }, user, process.env.PUBLIC_SUPABASE_URL || 'https://localhost.supabase.co');
}

