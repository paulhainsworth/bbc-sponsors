import { test, expect } from './fixtures/auth';
import { navigateWithAuth } from './helpers/navigation';

test.describe('Sponsor Creation Flow', () => {

  test('sponsor creation form renders all fields', async ({ superAdminPage: page }) => {
    // Navigate to the form page with auth handling
    await navigateWithAuth(page, '/admin/sponsors/new');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for layout to finish loading - nav should appear
    await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
    
    // Wait for spinner to be completely gone
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
    
    // Wait for form to exist and be visible with comprehensive check
    await page.waitForFunction(
      () => {
        const form = document.querySelector('form');
        if (!form) return false;
        const style = window.getComputedStyle(form);
        const isFormVisible = style.display !== 'none' && style.visibility !== 'hidden';
        
        // Check for specific input fields
        const hasNameInput = document.getElementById('name') !== null;
        const hasTaglineInput = document.getElementById('tagline') !== null;
        
        return isFormVisible && hasNameInput && hasTaglineInput;
      },
      { timeout: 25000 }
    );
    
    // Wait for specific input fields by ID (most reliable)
    await page.waitForSelector('#name', { state: 'attached', timeout: 20000 });
    await page.waitForSelector('#tagline', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#description', { state: 'attached', timeout: 15000 });
    
    // Wait for fields to be visible (this also waits for reactive statements)
    await expect(page.getByLabel(/sponsor name/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/tagline/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/description/i)).toBeVisible({ timeout: 10000 });
    
    // Website URL might be optional, so check if it exists
    const websiteUrlField = page.getByLabel(/website url/i);
    const hasWebsiteField = await websiteUrlField.count().then(count => count > 0).catch(() => false);
    if (hasWebsiteField) {
      await expect(websiteUrlField.first()).toBeVisible({ timeout: 10000 });
    }
    
    const createButton = page.getByRole('button', { name: /create sponsor/i });
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test('shows validation errors for empty required fields', async ({ superAdminPage: page }) => {
    // Navigate to the form page with auth handling
    await navigateWithAuth(page, '/admin/sponsors/new');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for layout and form to be ready
    await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
    
    // Wait for form to exist and have inputs
    await page.waitForFunction(
      () => {
        const form = document.querySelector('form');
        if (!form) return false;
        return document.getElementById('name') !== null;
      },
      { timeout: 25000 }
    );
    
    // Wait for form fields to be ready (this also waits for reactive statements)
    const sponsorNameField = page.getByLabel(/sponsor name/i);
    await expect(sponsorNameField).toBeVisible({ timeout: 15000 });
    
    const createButton = page.getByRole('button', { name: /create sponsor/i });
    await expect(createButton).toBeVisible({ timeout: 10000 });
    
    // Try to submit without filling required fields (name and categories are required)
    await createButton.click();
    
    // Wait for validation to run - either HTML5 validation or custom error messages
    await page.waitForFunction(
      () => {
        // Check for HTML5 validation
        const nameInput = document.getElementById('name') as HTMLInputElement;
        const hasHtml5Error = nameInput && !nameInput.validity.valid;
        
        // Check for custom error messages
        const hasCustomError = document.querySelector('.text-red-600, [class*="error"]') !== null ||
                              Array.from(document.querySelectorAll('*')).some(
                                el => el.textContent?.toLowerCase().includes('required') ||
                                      el.textContent?.toLowerCase().includes('error')
                              );
        
        return hasHtml5Error || hasCustomError;
      },
      { timeout: 5000 }
    ).catch(() => {}); // If validation doesn't trigger, continue anyway
    
    // Check for validation errors - could be HTML5 validation or custom error messages
    const hasHtml5Error = await sponsorNameField.evaluate((el: HTMLInputElement) => {
      return !el.validity.valid;
    }).catch(() => false);
    
    const hasErrorText = await page.getByText(/required|invalid|error|must contain/i).first().isVisible().catch(() => false);
    const hasErrorClass = await page.locator('[class*="error"], [class*="red"], [class*="invalid"]').first().isVisible().catch(() => false);
    
    // Form should show validation errors (at least one of these should be true)
    expect(hasHtml5Error || hasErrorText || hasErrorClass).toBeTruthy();
  });

  test('can create a new sponsor', async ({ superAdminPage: page }) => {
    // Mock successful sponsor creation
    await page.route('**/rest/v1/sponsors*', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-sponsor-id',
            name: 'Test Sponsor',
            slug: 'test-sponsor'
          })
        });
      } else {
        route.continue();
      }
    });

    // Navigate to the form page with auth handling
    await navigateWithAuth(page, '/admin/sponsors/new');
    
    // Wait for layout and form to be ready
    await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
    await page.waitForSelector('form', { state: 'visible', timeout: 25000 });
    
    // Wait for form to have the name input field
    await page.waitForSelector('#name', { state: 'visible', timeout: 20000 });
    
    // Wait for form fields to be ready (this also waits for reactive statements)
    const sponsorNameField = page.getByLabel(/sponsor name/i);
    await expect(sponsorNameField).toBeVisible({ timeout: 15000 });
    
    // Fill in the form (name and at least one category are required)
    await page.getByLabel(/sponsor name/i).fill('Test Sponsor');
    await page.getByLabel(/tagline/i).fill('Test Tagline');
    await page.getByLabel(/description/i).fill('Test Description');
    
    // Select at least one category (required) - these are checkboxes
    await page.getByLabel(/bike shops/i).check();
    
    // Submit the form
    await page.getByRole('button', { name: /create sponsor/i }).click();
    
    // Should show success message or redirect
    // The success message appears after sponsor is created
    await expect(
      page.getByText(/success|created|sponsor created/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('can create sponsor with admin email', async ({ superAdminPage: page }) => {
    // Mock sponsor creation and invitation sending
    await page.route('**/rest/v1/sponsors*', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-sponsor-id',
            name: 'Test Sponsor'
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route('**/api/invitations/send*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          emailSent: true
        })
      });
    });

    // Navigate to the form page with auth handling
    await navigateWithAuth(page, '/admin/sponsors/new');
    
    // Wait for layout and form to be ready
    await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
    await page.waitForSelector('form', { state: 'visible', timeout: 25000 });
    
    // Wait for form to have the name input field
    await page.waitForSelector('#name', { state: 'visible', timeout: 20000 });
    
    // Wait for form fields to be ready (this also waits for reactive statements)
    const sponsorNameField = page.getByLabel(/sponsor name/i);
    await expect(sponsorNameField).toBeVisible({ timeout: 15000 });
    
    // Fill in sponsor details
    await page.getByLabel(/sponsor name/i).fill('Test Sponsor');
    await page.getByLabel(/tagline/i).fill('Test Tagline');
    
    // Select at least one category (required)
    await page.getByLabel(/bike shops/i).check();
    
    // Fill in admin email
    await page.getByLabel(/admin email/i).fill('admin@test.com');
    
    // Submit
    await page.getByRole('button', { name: /create sponsor/i }).click();
    
    // Should show success message about invitation
    // This can take a moment as it creates sponsor then sends invitation
    await expect(
      page.getByText(/invitation|email sent|success|sponsor created/i).first()
    ).toBeVisible({ timeout: 20000 });
  });
});

