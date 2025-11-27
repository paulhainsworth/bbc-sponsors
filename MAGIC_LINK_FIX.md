# Magic Link URL Fix

## Problem Identified

The magic link URL sent by Supabase doesn't preserve query parameters when redirecting. 

**The URL sent:**
```
https://uibbpcbshfkjcsnoscup.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=http://localhost:5173/auth/callback?token=INVITATION_TOKEN
```

**What happens:**
- Supabase's verification endpoint redirects to `http://localhost:5173/auth/callback`
- But it **drops the query parameters** (`?token=INVITATION_TOKEN`)
- So the callback page doesn't know which invitation to accept

## Solution Implemented

### 1. Enhanced Callback Handler

Updated `src/routes/auth/callback/+page.server.ts` to:
- First check if there's a `token` query parameter (if Supabase preserves it)
- If not, look up the pending invitation by the authenticated user's email
- Redirect to the accept-invitation page with the correct token

This ensures that even if Supabase drops the query parameters, we can still find the invitation.

### 2. How It Works

1. User clicks magic link → Supabase verifies → Redirects to `/auth/callback`
2. Callback handler exchanges code for session
3. Gets the user's email from the session
4. Looks up pending invitation by email in the database
5. Redirects to `/auth/accept-invitation?token=INVITATION_TOKEN`

## Why This Works

- The invitation is linked to the email address
- After authentication, we know the user's email
- We can look up their pending invitation
- This bypasses the need for query parameters in the redirect URL

## Testing

1. Create a new sponsor with an admin email
2. Check the email for the magic link
3. Click the magic link
4. Should redirect to `/auth/accept-invitation?token=...` even if the original redirect URL lost the token


