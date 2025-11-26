import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Helper to authenticate a user in tests using real Supabase
 * This creates a real session in the test database
 */
export async function authenticateUser(
  page: Page,
  email: string,
  password?: string
) {
  // Get Supabase credentials from environment
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set in environment');
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Sign in with email (use password if provided, otherwise use magic link)
  if (password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Failed to authenticate: ${error.message}`);
    }

    // Set the session in the browser context
    await page.addInitScript(
      ({ accessToken, refreshToken, user }) => {
        // Store session in localStorage (Supabase format)
        const sessionData = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: user
        };

        // Extract project ref from URL
        const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'localhost';
        const storageKey = `sb-${projectRef}-auth-token`;

        localStorage.setItem(storageKey, JSON.stringify(sessionData));
      },
      {
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        user: data.user
      }
    );
  } else {
    // For magic link, we'll need to handle it differently
    // For now, throw an error suggesting password auth for tests
    throw new Error('Password authentication required for tests. Use authenticateUserWithPassword instead.');
  }
}

/**
 * Helper to authenticate with email and password
 */
export async function authenticateUserWithPassword(
  page: Page,
  email: string,
  password: string
) {
  return authenticateUser(page, email, password);
}

/**
 * Helper to create a test user and authenticate
 * Useful for setting up test data
 */
export async function createTestUser(
  page: Page,
  email: string,
  password: string,
  role: 'super_admin' | 'sponsor_admin' = 'sponsor_admin'
) {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role
      }
    }
  });

  if (signUpError) {
    // User might already exist, try to sign in instead
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      throw new Error(`Failed to create or sign in user: ${signInError.message}`);
    }

    // Authenticate in the page
    await authenticateUser(page, email, password);
    return signInData.user;
  }

  // Create profile (if not auto-created)
  if (signUpData.user) {
    // Wait a moment for profile trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Authenticate in the page
    await authenticateUser(page, email, password);
    return signUpData.user;
  }

  throw new Error('Failed to create test user');
}

