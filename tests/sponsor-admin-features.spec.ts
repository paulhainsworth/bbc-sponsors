import { test, expect } from './fixtures/auth';

test.describe('Sponsor Admin Features', () => {
  test.describe('Dashboard', () => {
    test('dashboard loads and displays statistics', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin', { waitUntil: 'networkidle' });
      
      // Re-verify session is available after navigation
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Wait for dashboard content
      await page.waitForSelector('h1', { state: 'visible', timeout: 20000 });
      
      // Check for dashboard heading
      const heading = page.getByText(/dashboard/i).first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      
      // Check for statistics cards
      const totalPromotions = page.getByText(/total promotions/i);
      const activePromotions = page.getByText(/active promotions/i);
      const featuredPromotions = page.getByText(/featured promotions/i);
      
      await expect(totalPromotions).toBeVisible({ timeout: 15000 });
      await expect(activePromotions).toBeVisible({ timeout: 15000 });
      await expect(featuredPromotions).toBeVisible({ timeout: 15000 });
    });

    test('dashboard shows quick action buttons', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Check for quick action buttons
      const editProfileBtn = page.getByRole('link', { name: /edit profile/i });
      const createPromotionBtn = page.getByRole('link', { name: /create promotion/i });
      const viewPublicPageBtn = page.getByRole('link', { name: /view public page/i });
      
      await expect(editProfileBtn).toBeVisible({ timeout: 15000 });
      await expect(createPromotionBtn).toBeVisible({ timeout: 15000 });
      await expect(viewPublicPageBtn).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Profile Management', () => {
    test('can view and edit sponsor profile', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/profile', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/profile/, { timeout: 20000 });
      
      // Wait for layout and form to load
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      await page.waitForSelector('form', { state: 'visible', timeout: 20000 });
      
      // Check for profile fields
      await expect(page.getByLabel(/tagline/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByLabel(/description/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByLabel(/website url/i)).toBeVisible({ timeout: 15000 });
      
      // Edit tagline
      const taglineField = page.getByLabel(/tagline/i);
      await taglineField.clear();
      await taglineField.fill('Updated Test Tagline');
      
      // Save changes
      const saveButton = page.getByRole('button', { name: /save changes/i });
      await expect(saveButton).toBeVisible({ timeout: 15000 });
      await saveButton.click();
      
      // Wait for success (alert or redirect)
      await page.waitForTimeout(2000);
    });

    test('profile form shows read-only name field', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/profile', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/profile/, { timeout: 20000 });
      
      // Wait for layout and form to load
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      await page.waitForSelector('form', { state: 'visible', timeout: 20000 });
      
      // Check that name field is disabled
      const nameField = page.getByLabel(/sponsor name/i);
      await expect(nameField).toBeDisabled({ timeout: 15000 });
    });
  });

  test.describe('Promotions Management', () => {
    test('can view promotions list', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/promotions', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/promotions/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Check for promotions page heading
      const heading = page.getByText(/promotions/i).first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      
      // Check for create button
      const createButton = page.getByRole('link', { name: /create promotion/i });
      await expect(createButton).toBeVisible({ timeout: 15000 });
    });

    test('can create a new promotion', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/promotions/new', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/promotions\/new/, { timeout: 20000 });
      
      // Wait for layout and form to load
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      await page.waitForSelector('form', { state: 'visible', timeout: 20000 });
      
      // Fill in promotion form
      await page.getByLabel(/title/i).fill('Test Promotion');
      await page.getByLabel(/description/i).fill('This is a test promotion');
      
      // Select promotion type
      const typeSelect = page.getByLabel(/promotion type/i);
      await typeSelect.selectOption('evergreen');
      
      // Create promotion
      const createButton = page.getByRole('button', { name: /create promotion/i });
      await createButton.click();
      
      // Should redirect to promotions list
      await page.waitForURL(/\/sponsor-admin\/promotions/, { timeout: 15000 });
    });

    test('can edit a promotion', async ({ sponsorAdminPage: page }) => {
      // First, create a promotion
      await page.goto('/sponsor-admin/promotions/new', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/promotions\/new/, { timeout: 20000 });
      
      // Wait for layout and form
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      await page.waitForSelector('form', { state: 'visible', timeout: 20000 });
      
      await page.getByLabel(/title/i).fill('Promotion to Edit');
      await page.getByLabel(/description/i).fill('Initial description');
      await page.getByRole('button', { name: /create promotion/i }).click();
      
      await page.waitForURL(/\/sponsor-admin\/promotions/, { timeout: 15000 });
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      
      // Find and click edit link for the promotion
      const editLink = page.getByRole('link', { name: /edit/i }).first();
      await expect(editLink).toBeVisible({ timeout: 15000 });
      await editLink.click();
      
      // Wait for edit page
      await page.waitForURL(/\/sponsor-admin\/promotions\/[^/]+/, { timeout: 15000 });
      await page.waitForSelector('form', { state: 'visible', timeout: 20000 });
      
      // Update description
      const descriptionField = page.getByLabel(/description/i);
      await descriptionField.clear();
      await descriptionField.fill('Updated description');
      
      // Save changes
      const saveButton = page.getByRole('button', { name: /save changes/i });
      await saveButton.click();
      
      // Should redirect back to promotions list
      await page.waitForURL(/\/sponsor-admin\/promotions/, { timeout: 15000 });
    });

    test('can delete a promotion', async ({ sponsorAdminPage: page }) => {
      // Create a promotion first
      await page.goto('/sponsor-admin/promotions/new', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/promotions\/new/, { timeout: 20000 });
      
      // Wait for layout and form
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      await page.waitForSelector('form', { state: 'visible', timeout: 20000 });
      
      await page.getByLabel(/title/i).fill('Promotion to Delete');
      await page.getByLabel(/description/i).fill('This will be deleted');
      await page.getByRole('button', { name: /create promotion/i }).click();
      
      await page.waitForURL(/\/sponsor-admin\/promotions/, { timeout: 15000 });
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      
      // Mock the confirm dialog to return true
      page.on('dialog', dialog => dialog.accept());
      
      // Find and click delete button
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      await expect(deleteButton).toBeVisible({ timeout: 15000 });
      await deleteButton.click();
      
      // Wait for deletion to complete
      await page.waitForTimeout(2000);
    });

    test('can toggle promotion status', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/promotions', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/promotions/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Look for activate/deactivate button
      const toggleButton = page.getByRole('button', { name: /activate|deactivate/i }).first();
      const buttonExists = await toggleButton.isVisible().catch(() => false);
      
      if (buttonExists) {
        await toggleButton.click();
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Team Member Management', () => {
    test('can view team members page', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/team', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/team/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Check for team members heading
      const heading = page.getByText(/team members/i).first();
      await expect(heading).toBeVisible({ timeout: 15000 });
    });

    test('can see invite form', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/team', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/team/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Check for invite form
      const inviteHeading = page.getByText(/invite team member/i);
      const emailInput = page.getByLabel(/email address/i);
      const sendButton = page.getByRole('button', { name: /send invitation/i });
      
      await expect(inviteHeading).toBeVisible({ timeout: 15000 });
      await expect(emailInput).toBeVisible({ timeout: 15000 });
      await expect(sendButton).toBeVisible({ timeout: 15000 });
    });

    test('can invite a team member', async ({ sponsorAdminPage: page }) => {
      // Mock the invitation API
      await page.route('**/api/invitations/send*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            emailSent: true,
            message: 'Invitation email sent successfully'
          })
        });
      });

      await page.goto('/sponsor-admin/team', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/team/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Fill in invite form
      const emailInput = page.getByLabel(/email address/i);
      await emailInput.fill('new-team-member@mailinator.com');
      
      // Send invitation
      const sendButton = page.getByRole('button', { name: /send invitation/i });
      await sendButton.click();
      
      // Wait for success message
      await page.waitForSelector('text=/invitation sent|success/i', { timeout: 15000 }).catch(() => {});
    });

    test('can view current team members', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/team', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/team/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Check for team members table or list
      const tableHeading = page.getByText(/current team members/i);
      await expect(tableHeading).toBeVisible({ timeout: 15000 });
      
      // Check if table exists (even if empty)
      const tableExists = await page.locator('table').isVisible().catch(() => false);
      const emptyStateExists = await page.getByText(/no team members/i).isVisible().catch(() => false);
      expect(tableExists || emptyStateExists).toBeTruthy();
    });

    test('cannot remove yourself from team', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin/team', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin\/team/, { timeout: 20000 });
      
      // Wait for layout to finish loading
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Mock alert dialog
      let alertMessage = '';
      page.on('dialog', dialog => {
        alertMessage = dialog.message();
        dialog.accept();
      });
      
      // Try to find "You" text (should be visible for current user)
      const youText = page.getByText(/^you$/i);
      const youExists = await youText.isVisible().catch(() => false);
      
      if (youExists) {
        // Should not have a remove button for yourself
        // Check that "You" row doesn't have a remove button
        const youRow = youText.locator('..').locator('..'); // Go up to table row
        const removeInYouRow = await youRow.getByRole('button', { name: /remove/i }).isVisible().catch(() => false);
        expect(removeInYouRow).toBeFalsy();
      }
    });
  });

  test.describe('Navigation', () => {
    test('can navigate between all sponsor admin pages', async ({ sponsorAdminPage: page }) => {
      await page.goto('/sponsor-admin', { waitUntil: 'networkidle' });
      
      if ((page as any).ensureSessionAvailable) {
        await (page as any).ensureSessionAvailable();
      }
      
      await page.waitForURL(/\/sponsor-admin/, { timeout: 20000 });
      
      // Wait for navigation to be visible
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 25000 }).catch(() => {});
      
      // Navigate to Profile
      const profileLink = page.getByRole('link', { name: /profile/i });
      await expect(profileLink).toBeVisible({ timeout: 15000 });
      await profileLink.click();
      await page.waitForURL(/\/sponsor-admin\/profile/, { timeout: 15000 });
      
      // Wait for nav again after navigation
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      
      // Navigate to Promotions
      const promotionsLink = page.getByRole('link', { name: /promotions/i });
      await expect(promotionsLink).toBeVisible({ timeout: 15000 });
      await promotionsLink.click();
      await page.waitForURL(/\/sponsor-admin\/promotions/, { timeout: 15000 });
      
      // Wait for nav again
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      
      // Navigate to Team
      const teamLink = page.getByRole('link', { name: /team/i });
      await expect(teamLink).toBeVisible({ timeout: 15000 });
      await teamLink.click();
      await page.waitForURL(/\/sponsor-admin\/team/, { timeout: 15000 });
      
      // Wait for nav again
      await page.waitForSelector('nav', { state: 'visible', timeout: 30000 });
      
      // Navigate back to Dashboard
      const dashboardLink = page.getByRole('link', { name: /dashboard/i });
      await expect(dashboardLink).toBeVisible({ timeout: 15000 });
      await dashboardLink.click();
      await page.waitForURL(/\/sponsor-admin$/, { timeout: 15000 });
    });
  });
});

