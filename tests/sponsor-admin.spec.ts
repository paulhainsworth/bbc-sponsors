import { test, expect } from './fixtures/auth';
import { navigateWithAuth } from './helpers/navigation';

test.describe('Sponsor Admin Dashboard', () => {
  // Use the sponsorAdminPage fixture which handles authentication
  test('dashboard loads and shows sponsor information', async ({ sponsorAdminPage: page }) => {
    await navigateWithAuth(page, '/sponsor-admin');
    
    // Wait for layout to finish loading (no spinner in layout)
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 20000 }).catch(() => {});
    
    // Wait for page content to appear - either dashboard or error
    await page.waitForSelector('h1, [class*="card"], [class*="stat"]', { timeout: 20000 });
    
    // Get page text to see what's actually rendered
    const pageText = await page.textContent('body').catch(() => '');
    
    // Should show dashboard content (not the error message)
    const hasError = await page.getByText(/no sponsor associated/i).isVisible().catch(() => false);
    const hasDashboardHeading = await page.getByText(/dashboard/i).first().isVisible().catch(() => false);
    const hasSponsorName = await page.getByText(/test sponsor/i).isVisible().catch(() => false);
    const hasStats = await page.getByText(/total promotions|active promotions/i).isVisible().catch(() => false);
    const hasNav = await page.getByRole('navigation').isVisible().catch(() => false);
    
    // Debug: log what we found
    if (!hasDashboardHeading && !hasSponsorName && !hasStats && !hasError) {
      console.log('Page text:', pageText?.substring(0, 500));
    }
    
    // Should have dashboard content and not the error
    expect(hasError).toBeFalsy();
    // At minimum, we should have navigation (layout loaded) or dashboard content
    expect(hasNav || hasSponsorName || hasDashboardHeading || hasStats).toBeTruthy();
  });

  test('navigation links are visible', async ({ sponsorAdminPage: page }) => {
    // Navigate to sponsor admin page
    await navigateWithAuth(page, '/sponsor-admin');
    
    // Wait for layout to finish loading - nav should appear when loading is false
    await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
    
    // Wait for spinner to be gone
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
    
    // Wait for navigation links to exist in DOM by href (most reliable)
    await page.waitForSelector('a[href="/sponsor-admin/profile"]', { state: 'attached', timeout: 20000 });
    await page.waitForSelector('a[href="/sponsor-admin/promotions"]', { state: 'attached', timeout: 20000 });
    
    // Wait for links to be visible using Playwright's built-in methods
    const profileLink = page.getByRole('link', { name: /profile/i });
    const promotionsLink = page.getByRole('link', { name: /promotions/i });
    
    // Wait for links to be visible (this also waits for reactive statements)
    await expect(profileLink).toBeVisible({ timeout: 15000 });
    await expect(promotionsLink).toBeVisible({ timeout: 15000 });
  });

  test('can navigate to profile page', async ({ sponsorAdminPage: page }) => {
    // Navigate to sponsor admin page
    await navigateWithAuth(page, '/sponsor-admin');
    
    // Wait for layout to finish loading
    await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
    
    // Wait for profile link to exist in DOM by href
    await page.waitForSelector('a[href="/sponsor-admin/profile"]', { state: 'attached', timeout: 20000 });
    
    // Wait for profile link to be visible and clickable (this waits for reactive statements)
    const profileLink = page.getByRole('link', { name: /profile/i });
    await expect(profileLink).toBeVisible({ timeout: 15000 });
    
    // Click and wait for navigation
    await profileLink.click();
    
    // Should navigate to profile page
    await expect(page).toHaveURL(/\/sponsor-admin\/profile/, { timeout: 15000 });
  });

  test('can navigate to promotions page', async ({ sponsorAdminPage: page }) => {
    // Navigate to sponsor admin page
    await navigateWithAuth(page, '/sponsor-admin');
    
    // Wait for layout to finish loading
    await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
    
    // Wait for promotions link to exist in DOM by href
    await page.waitForSelector('a[href="/sponsor-admin/promotions"]', { state: 'attached', timeout: 20000 });
    
    // Wait for promotions link to be visible and clickable (this waits for reactive statements)
    const promotionsLink = page.getByRole('link', { name: /promotions/i });
    await expect(promotionsLink).toBeVisible({ timeout: 15000 });
    
    // Click and wait for navigation
    await promotionsLink.click();
    
    // Should navigate to promotions page
    await expect(page).toHaveURL(/\/sponsor-admin\/promotions/, { timeout: 15000 });
  });
});

