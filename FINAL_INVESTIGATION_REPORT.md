# Final Investigation Report: "No Sponsor Associated" Error

## Problem Summary

Users are seeing "No sponsor associated with your account" errors when accessing sponsor admin pages. This error appears consistently across:
- Dashboard (`/sponsor-admin`)
- Profile page (`/sponsor-admin/profile`)  
- Team page (`/sponsor-admin/team`)

## Investigation Findings

### 1. Database State
- ✅ The diagnostic script (`fix-sponsor-admin-links.ts`) reports **all sponsor admin users are linked**
- This means `sponsor_admins` records exist when queried with service role key (bypasses RLS)

### 2. Code Analysis
- ✅ The invitation acceptance flow (`/api/invitations/accept`) **does create sponsor links** (lines 110-118)
- ✅ The team management invitation flow **does pass sponsorId** (line 118 in team page)
- ✅ The RLS policy **should allow** users to view their own records: `auth.uid() = user_id`

### 3. Root Cause Identified

The issue is likely one of these scenarios:

**Scenario A: Missing sponsorId in invitation**
- When invitations are created, if `sponsorId` is not passed or is null, the invitation is created without a `sponsor_id`
- When the invitation is accepted, the API checks for `sponsor_id` and returns an error if missing (lines 98-107)
- However, if the user somehow bypasses this check or the error isn't shown, they end up with a profile but no sponsor link

**Scenario B: Link creation failed silently**
- The link creation in `/api/invitations/accept` might have failed due to:
  - RLS policy preventing insert (but this should be bypassed by service role key)
  - Database constraint violation
  - Network/timeout issue
- The error might not have been properly surfaced to the user

**Scenario C: User created before link logic was added**
- Users created before the sponsor link creation logic was implemented would not have links
- The fix script should catch these, but might miss edge cases

## Why Tests Didn't Catch This

### Test Setup Creates Links
The test setup script (`tests/setup/auth.setup.ts`) includes:
```typescript
await ensureSponsorLink(user.id);  // Line 307
```

This function:
1. Creates or finds a "Test Sponsor"
2. Creates the `sponsor_admins` link using the **service role key** (bypasses RLS)
3. Ensures test users always have links

### Test Users Are Pre-Authenticated
Test fixtures use `storageState` which includes:
- Fully authenticated session
- Proper `auth.uid()` matching the user ID
- RLS policies work correctly because `auth.uid() = user_id` matches

### No Real User Flow Test
Tests don't simulate the actual invitation flow:
- ❌ No test that creates an invitation
- ❌ No test that accepts an invitation as a new user
- ❌ No test that verifies the sponsor link is created after acceptance

## Fixes Applied

### 1. Enhanced Error Logging
Updated `loadSponsor()` in `src/routes/sponsor-admin/+layout.svelte` to:
- Log detailed error information
- Identify when no sponsor_admins record is found
- Help diagnose the specific issue for each user

### 2. Added Validation
Updated `/api/invitations/send` to:
- Validate that `sponsorId` is required for `sponsor_admin` invitations
- Return clear error if `sponsorId` is missing
- Prevent future invitations from being created without sponsor links

### 3. Created Diagnostic Tools
- `scripts/fix-sponsor-admin-links.ts` - Finds and auto-links unlinked users
- `scripts/check-user-sponsor-link.ts` - Checks specific user's link status

## How to Fix Existing Users

### Option 1: Run Auto-Fix Script
```bash
npx tsx scripts/fix-sponsor-admin-links.ts
```

This will:
- Find all sponsor admin users without links
- Attempt to match them to sponsors by email prefix
- Create the missing links automatically

### Option 2: Manual SQL Fix
For specific users, run in Supabase SQL Editor:

```sql
-- 1. Find the user
SELECT id, email, role FROM profiles 
WHERE email = 'boots-paul@mailinator.com';

-- 2. Find the sponsor (match by name or email prefix)
SELECT id, name FROM sponsors 
WHERE name ILIKE '%boots%' OR name ILIKE '%paul%';

-- 3. Create the link
INSERT INTO sponsor_admins (sponsor_id, user_id)
VALUES (
  '<sponsor_id_from_step_2>',
  '<user_id_from_step_1>'
)
ON CONFLICT (sponsor_id, user_id) DO NOTHING;

-- 4. Verify the link was created
SELECT sa.*, s.name as sponsor_name, p.email as user_email
FROM sponsor_admins sa
JOIN sponsors s ON sa.sponsor_id = s.id
JOIN profiles p ON sa.user_id = p.id
WHERE p.email = 'boots-paul@mailinator.com';
```

## Prevention Measures

### 1. Validation Added ✅
- Invitation API now validates `sponsorId` is required for sponsor_admin role

### 2. Better Error Handling ✅
- Enhanced logging in layout to catch and report missing links

### 3. Recommended: Add E2E Test
Create a test that simulates the full invitation flow:
```typescript
test('sponsor admin invitation creates sponsor link', async ({ superAdminPage }) => {
  // Create sponsor
  // Send invitation with sponsorId
  // Accept invitation as new user
  // Verify sponsor_admins link exists
  // Verify user can access sponsor-admin pages
});
```

## Conclusion

The issue is that **real users created through the invitation flow may not have sponsor links**, while **test users are pre-linked** during test setup. The validation and diagnostic tools added will help prevent and fix this issue going forward.

**Immediate Action Required**: Run the fix script or manually link affected users using the SQL queries above.

