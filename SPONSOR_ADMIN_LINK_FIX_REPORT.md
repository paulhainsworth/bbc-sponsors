# Sponsor Admin Link Fix Report

## Problem Identified

Users are seeing "No sponsor associated with your account" errors when accessing sponsor admin pages. This indicates that the `sponsor_admins` table is missing records linking sponsor admin users to their sponsors.

## Root Cause Analysis

### Why This Wasn't Detected in Testing

1. **Test Setup Creates Links**: The test setup script (`tests/setup/auth.setup.ts`) includes an `ensureSponsorLink()` function that creates the sponsor link for test users. This is why tests pass.

2. **Real Users Created Through Invitation Flow**: Real users (like `boots-paul@mailinator.com`) are created through the actual invitation acceptance flow, not the test setup.

3. **Potential Issues in Invitation Flow**:
   - The invitation might not have a `sponsor_id` set when created
   - The link creation in `/api/invitations/accept` might be failing silently
   - The invitation might have been accepted before the link creation logic was added

### Code Flow Analysis

1. **Invitation Creation** (`/api/invitations/send`):
   - ✅ Sets `sponsor_id` in invitation record (line 61)
   - ✅ Uses `sponsorId` from request body

2. **Invitation Acceptance** (`/api/invitations/accept`):
   - ✅ Reads `sponsor_id` from invitation (line 86)
   - ✅ Creates `sponsor_admins` link (lines 110-118)
   - ✅ Has error handling and verification

3. **Team Management Invitation** (`/sponsor-admin/team/+page.svelte`):
   - ✅ Passes `sponsorId` to invitation API (line 118)

The code flow appears correct, but existing users may have been created before the link creation logic was fully implemented, or the link creation may have failed silently.

## Solution

### 1. Diagnostic Script

Created `scripts/fix-sponsor-admin-links.ts` to:
- Find all sponsor admin users without sponsor links
- Attempt to auto-link based on email prefix matching sponsor name
- Provide SQL for manual linking when auto-link fails

### 2. Run the Fix Script

```bash
npx tsx scripts/fix-sponsor-admin-links.ts
```

This will:
1. Identify unlinked sponsor admin users
2. Attempt to match them to sponsors by email prefix
3. Create the missing `sponsor_admins` records
4. Provide SQL for manual fixes if needed

### 3. Manual Fix (if needed)

If the auto-link fails, you can manually link users:

```sql
-- Find the user ID
SELECT id, email FROM profiles WHERE email = 'boots-paul@mailinator.com';

-- Find the sponsor ID
SELECT id, name FROM sponsors WHERE name ILIKE '%boots%';

-- Create the link
INSERT INTO sponsor_admins (sponsor_id, user_id)
VALUES ('<sponsor_id>', '<user_id>')
ON CONFLICT (sponsor_id, user_id) DO NOTHING;
```

## Prevention

### Ensure Future Invitations Work Correctly

1. **Verify Invitation Creation**: When creating invitations, ensure `sponsorId` is always passed:
   ```typescript
   // In /api/invitations/send
   sponsor_id: sponsorId || null  // Should never be null for sponsor_admin role
   ```

2. **Add Validation**: Add validation to ensure sponsor_admin invitations always have a sponsor_id:
   ```typescript
   if (role === 'sponsor_admin' && !sponsorId) {
     return json({ success: false, error: 'sponsorId is required for sponsor_admin invitations' }, { status: 400 });
   }
   ```

3. **Add Logging**: Add more detailed logging in the accept flow to catch failures:
   ```typescript
   console.log('Creating sponsor admin link:', { userId, sponsorId, invitationId: invitation.id });
   ```

## Testing Gap Analysis

### Why Tests Didn't Catch This

1. **Test Users Are Pre-Linked**: Test setup creates users and immediately links them via `ensureSponsorLink()`
2. **No End-to-End Invitation Test**: Tests don't simulate the full invitation flow from creation → email → acceptance → link creation
3. **Test Database vs Production**: Test database may have different data or RLS policies

### Recommended Test Improvements

1. **Add E2E Invitation Test**:
   ```typescript
   test('sponsor admin invitation creates sponsor link', async ({ superAdminPage }) => {
     // Create sponsor
     // Send invitation
     // Accept invitation as new user
     // Verify sponsor_admins link exists
   });
   ```

2. **Add Validation Test**:
   ```typescript
   test('sponsor admin without link shows error', async ({ sponsorAdminPage }) => {
     // Remove sponsor link
     // Navigate to dashboard
     // Verify error message
   });
   ```

## Next Steps

1. ✅ Run the fix script to link existing users
2. ⚠️ Add validation to prevent future unlinked sponsor admins
3. ⚠️ Add E2E test for invitation flow
4. ⚠️ Add monitoring/logging for link creation failures

