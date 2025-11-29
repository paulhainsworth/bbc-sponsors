/**
 * Navigation helpers for tests
 * PHASE 1: Improved navigation with better session handling
 */

import { Page } from '@playwright/test';

/**
 * Navigate to a URL with improved session persistence handling
 * Works with Phase 1 improvements to layout and fixtures
 */
export async function navigateWithAuth(
  page: Page,
  url: string,
  options: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}
): Promise<void> {
  // Navigate to the page
  await page.goto(url, { waitUntil: options.waitUntil || 'networkidle', timeout: 30000 });
  
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  
  // PHASE 1: Give layout time to read session from localStorage (with test detection)
  // The layout now waits up to 3 seconds for storageState to restore, so we wait a bit longer
  await page.waitForTimeout(3500);
  
  // Check if we were redirected to login
  let currentUrl = new URL(page.url());
  let redirectCount = 0;
  const maxRedirects = 2;
  
  while (currentUrl.pathname.includes('/auth/login') && redirectCount < maxRedirects) {
    redirectCount++;
    
    // Wait for layout to finish initializing (it has improved session reading)
    await page.waitForTimeout(3000);
    
    // Check again
    currentUrl = new URL(page.url());
    if (!currentUrl.pathname.includes('/auth/login')) {
      break; // Success - no longer on login
    }
    
    // Still on login - try reloading to trigger layout's session reading
    if (redirectCount < maxRedirects) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.waitForTimeout(3500);
      currentUrl = new URL(page.url());
    }
  }
  
  // If still on login after all attempts, throw error
  if (currentUrl.pathname.includes('/auth/login')) {
    // Check if session exists in localStorage
    const projectRef = process.env.PUBLIC_SUPABASE_URL?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'localhost';
    const storageKey = `sb-${projectRef}-auth-token`;
    const hasSession = await page.evaluate((key) => {
      return localStorage.getItem(key) !== null;
    }, storageKey);
    
    if (!hasSession) {
      throw new Error(`Session not available - storageState did not restore session. Run: npm run test:setup`);
    } else {
      throw new Error(`Session exists in localStorage but not recognized. Layout may need more time or session may be expired.`);
    }
  }
  
  // Wait for spinner to disappear (page is loading)
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 20000 }).catch(() => {});
  
  // Wait a bit more for reactive statements to run
  await page.waitForTimeout(1000);
  
  // Verify we're on the expected page (not redirected to homepage)
  // If we were redirected, wait a bit and check if profile loads, then retry navigation
  let finalUrl = new URL(page.url());
  const expectedPath = new URL(url, 'http://localhost').pathname;
  
  // If we navigated to a specific path, verify we're still there (not redirected to /)
  if (expectedPath !== '/' && finalUrl.pathname === '/') {
    // We were redirected to homepage - wait for profile to load, then retry
    console.log('Page redirected to homepage, waiting for profile to load...');
    await page.waitForTimeout(4000); // Wait for profile to load
    
    // Check if profile is now available
    const profileAvailable = await page.evaluate(() => {
      // Check if there's a way to detect profile is loaded
      // Look for authenticated content or check localStorage
      return document.querySelector('[data-testid="nav-menu"]') !== null ||
             document.querySelector('nav') !== null ||
             window.location.pathname !== '/';
    });
    
    if (profileAvailable) {
      // Profile might be loaded now, retry navigation
      console.log('Profile appears loaded, retrying navigation...');
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.waitForTimeout(3000);
      finalUrl = new URL(page.url());
    }
    
    // Final check
    if (finalUrl.pathname === '/' && expectedPath !== '/') {
      // Check what the actual issue is
      const hasNav = await page.evaluate(() => {
        return document.querySelector('[data-testid="nav-menu"]') !== null;
      });
      
      if (hasNav) {
        // Nav is there but we're on wrong page - might be a different issue
        throw new Error(`Navigation issue: Expected ${expectedPath}, but page is at ${finalUrl.pathname}. Nav menu is present, suggesting auth worked but navigation failed.`);
      } else {
        throw new Error(`Unexpected redirect to homepage. Expected ${expectedPath}, but page redirected to ${finalUrl.pathname}. Profile may not be loaded or role may be incorrect.`);
      }
    }
  }
}
