# Playwright Test Suite

This directory contains end-to-end tests for the BBC Sponsor application using Playwright with **real Supabase authentication**.

## Setup

1. **Create a test Supabase project** (recommended) or use your existing project
   - Go to https://supabase.com and create a new project for testing
   - This keeps test data separate from production

2. **Configure environment variables**
   - Copy `.env.example` to `.env.local` in the project root (not in tests/)
   - Fill in your Supabase credentials:
     ```env
     PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ```

3. **Set up test users** (optional)
   - The fixtures will create test users automatically if they don't exist
   - Or set these in `.env.local`:
     ```env
     TEST_ADMIN_EMAIL=admin@test.com
     TEST_ADMIN_PASSWORD=admin-password-123
     TEST_SPONSOR_ADMIN_EMAIL=sponsor@test.com
     TEST_SPONSOR_ADMIN_PASSWORD=sponsor-password-123
     ```

4. **Ensure test users have correct roles**
   - After first run, you may need to manually set user roles in Supabase:
     - Go to Supabase Dashboard → Authentication → Users
     - Edit the test users and set their `role` in user metadata or profiles table

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI (interactive mode - great for debugging)
npm run test:ui

# Run tests in headed mode (see the browser)
npm run test:headed

# Run tests in debug mode (step through tests)
npm run test:debug

# Run specific test file
npm test -- tests/auth.spec.ts
```

## Test Structure

- `auth.spec.ts` - Authentication flow tests (login, validation, errors)
- `sponsor-admin.spec.ts` - Sponsor admin dashboard tests (uses real auth)
- `sponsor-creation.spec.ts` - Sponsor creation workflow tests (uses real auth)
- `fixtures/auth.ts` - Authentication fixtures for tests
- `helpers/` - Helper functions

## Authentication Fixtures

Tests use Playwright fixtures for authentication:

- `sponsorAdminPage` - Automatically authenticates as a sponsor admin
- `superAdminPage` - Automatically authenticates as a super admin
- `authenticatedPage` - Authenticates with a generic test user

Example:
```typescript
test('my test', async ({ sponsorAdminPage: page }) => {
  // page is already authenticated as sponsor admin
  await page.goto('/sponsor-admin');
  // ... test code
});
```

## Best Practices

1. **Use semantic selectors**: Prefer `getByRole()`, `getByLabel()`, `getByText()` over CSS selectors
2. **Test with real data**: Tests use real Supabase, so they test the actual flow
3. **Test error states**: Always test both success and failure scenarios
4. **Keep tests independent**: Each test should work in isolation

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

Make sure to set environment variables in your CI/CD platform:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

## Troubleshooting

**Tests fail with "No session" or redirect to login:**
- Check that `.env.local` has correct Supabase credentials
- Verify test users exist and have correct roles
- Check browser console for errors

**Tests are slow:**
- This is normal - tests use real Supabase API calls
- Consider using a dedicated test database for faster performance

**Authentication not working:**
- Check that test users have profiles in the `profiles` table
- Verify RLS policies allow test users to access data
- Check that user roles are set correctly
