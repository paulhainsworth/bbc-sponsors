# RLS Policy Fix Report

## Problem Identified

The "No sponsor associated" error was occurring even though the `sponsor_admins` records exist in the database. The root cause was a **mismatch between the query and the RLS policy**.

## Root Cause

### RLS Policy Requirement
The RLS policy for `sponsor_admins` is:
```sql
CREATE POLICY "Users can view own sponsor admin records" ON sponsor_admins
  FOR SELECT USING (auth.uid() = user_id);
```

This policy requires that `auth.uid()` (the authenticated user's ID from the session) **exactly matches** the `user_id` in the `sponsor_admins` table.

### The Bug
The application code was querying using `$userStore.profile.id`:
```typescript
.eq('user_id', $userStore.profile.id)
```

While this should work in most cases, there can be timing issues where:
1. The profile is loaded from the database
2. But the Supabase session's `auth.uid()` hasn't been fully established
3. Or there's a mismatch between the profile ID and the session user ID

### Why Tests Didn't Catch This

1. **Test Setup Uses Service Role**: Test setup creates links using the service role key, which bypasses RLS entirely
2. **Test Sessions Are Pre-Authenticated**: Test fixtures use `storageState` with fully authenticated sessions where `auth.uid()` always matches
3. **No Real User Flow Test**: Tests don't simulate the actual invitation acceptance flow where session establishment might have timing issues

## Fix Applied

Changed all queries to use `session.user.id` instead of `$userStore.profile.id`:

**Before:**
```typescript
const { data: sponsorAdmin } = await supabase
  .from('sponsor_admins')
  .select('sponsor_id')
  .eq('user_id', $userStore.profile.id)  // ❌ Might not match auth.uid()
  .single();
```

**After:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
const { data: sponsorAdmin } = await supabase
  .from('sponsor_admins')
  .select('sponsor_id')
  .eq('user_id', session.user.id)  // ✅ Matches auth.uid() for RLS
  .single();
```

## Files Updated

1. ✅ `src/routes/sponsor-admin/+layout.svelte` - Layout sponsor loading
2. ✅ `src/routes/sponsor-admin/+page.svelte` - Dashboard sponsor loading
3. ✅ `src/routes/sponsor-admin/profile/+page.svelte` - Profile page sponsor loading
4. ✅ `src/routes/sponsor-admin/team/+page.svelte` - Team page sponsor loading
5. ✅ `src/routes/sponsor-admin/promotions/+page.svelte` - Promotions list sponsor loading
6. ✅ `src/routes/sponsor-admin/promotions/new/+page.svelte` - New promotion sponsor loading
7. ✅ `src/routes/sponsor-admin/promotions/[id]/+page.svelte` - Edit promotion sponsor loading

## Enhanced Error Logging

Added comprehensive logging to help diagnose future issues:
- Session verification
- User ID comparison (session vs profile)
- Detailed error information
- RLS policy compliance checks

## Testing Recommendation

Add a test that verifies the RLS policy works correctly:
```typescript
test('sponsor admin can query their own sponsor link', async ({ sponsorAdminPage }) => {
  // Verify the query uses session.user.id and matches auth.uid()
  // This ensures RLS policies work correctly
});
```

## Conclusion

The fix ensures that all queries use `session.user.id` which matches `auth.uid()` in the RLS policy, resolving the "No sponsor associated" error for users who have valid sponsor links in the database.

