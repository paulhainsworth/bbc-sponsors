<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';

  let loading = true;
  let error: string | null = null;
  let success = false;
  let invitation: any = null;

  const supabase = createClient();

  $: token = $page.url.searchParams.get('token');

  onMount(async () => {
    if (!token) {
      error = 'Invalid invitation link. No token provided.';
      loading = false;
      return;
    }

    await processInvitation();
  });

  async function processInvitation() {
    try {
      // First, check if there's an access token in the URL hash (from magic link)
      // This happens when user clicks the email link directly
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // If we have tokens in the hash, set the session
      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Error setting session from hash:', sessionError);
        } else if (sessionData?.session) {
          // Session is set, now process the invitation
          await processInvitationWithSession(sessionData.session);
          return;
        }
      }

      // Wait for session to be available (user might have come from callback)
      // Check if user is already logged in
      let sessionCheckAttempts = 0;
      let session = null;
      
      while (sessionCheckAttempts < 5) {
        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          session = currentSession;
          break;
        }
        
        // Wait a bit before checking again (in case session is still being set)
        if (sessionCheckAttempts < 4) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        sessionCheckAttempts++;
      }

      if (session?.user) {
        // User is logged in, process the invitation
        await processInvitationWithSession(session);
      } else {
        // User is not logged in, fetch invitation and send magic link
        await processInvitationWithoutSession();
      }
    } catch (err) {
      console.error('Invitation processing error:', err);
      error = 'An error occurred processing your invitation.';
      loading = false;
    }
  }

  async function processInvitationWithSession(session: any) {
    try {
      // Fetch invitation by token using API endpoint (bypasses RLS)
      const response = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
      const result = await response.json();

      if (!result.success || !result.invitation) {
        console.error('Invitation validation failed:', result.error);
        error = result.error || 'Invalid or expired invitation link.';
        loading = false;
        return;
      }

      const inviteData = result.invitation;
      invitation = inviteData;

      // User is logged in, accept the invitation
      await acceptInvitation(session.user.id, session.user.email || inviteData.email);
    } catch (err) {
      console.error('Error processing invitation with session:', err);
      error = 'An error occurred processing your invitation.';
      loading = false;
    }
  }

  async function processInvitationWithoutSession() {
    try {
      // Fetch invitation by token using API endpoint (bypasses RLS)
      const response = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
      const result = await response.json();

      if (!result.success || !result.invitation) {
        console.error('Invitation validation failed:', result.error);
        error = result.error || 'Invalid or expired invitation link.';
        loading = false;
        return;
      }

      const inviteData = result.invitation;
      invitation = inviteData;

      // User needs to sign in - send magic link to the invitation email
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: inviteData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/accept-invitation?token=${token}`
        }
      });

      if (signInError) {
        error = signInError.message;
        loading = false;
      } else {
        success = true;
        loading = false;
      }
    } catch (err) {
      console.error('Error processing invitation without session:', err);
      error = 'An error occurred processing your invitation.';
      loading = false;
    }
  }

  async function acceptInvitation(userId: string, email: string) {
    try {
      loading = true; // Keep loading while processing

      // Use API endpoint to accept invitation (bypasses RLS)
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          userId: userId,
          email: email,
          role: invitation.role,
          sponsorId: invitation.sponsor_id
        })
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Accept invitation API error:', result.error);
        error = result.error || 'Failed to accept invitation.';
        loading = false;
        return;
      }

      console.log('Invitation accepted successfully');

      // Update user store
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        userStore.setProfile(profile);
      }

      // Redirect based on role (don't set loading = false since we're redirecting)
      if (invitation.role === 'super_admin') {
        goto('/admin');
      } else if (invitation.role === 'sponsor_admin') {
        goto('/sponsor-admin');
      } else {
        goto('/');
      }
    } catch (err) {
      console.error('Accept invitation error:', err);
      error = 'Failed to accept invitation.';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Accept Invitation - BBC Sponsors</title>
</svelte:head>

<div class="container mx-auto px-4 py-16">
  <div class="max-w-md mx-auto card">
    <h1 class="text-3xl font-bold mb-6 text-center">Accept Invitation</h1>

    {#if loading}
      <div class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p class="mt-4 text-gray-600">Processing your invitation...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
        <p class="font-semibold">Error</p>
        <p>{error}</p>
      </div>
      <a href="/" class="block text-center text-primary hover:underline">Return to Home</a>
    {:else if success}
      <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
        <p class="font-semibold">Check your email!</p>
        <p class="text-sm mt-2">
          We've sent a magic link to <strong>{invitation?.email}</strong>. Click the link in the email to
          complete your account setup and accept the invitation.
        </p>
      </div>
      <a href="/" class="block text-center text-primary hover:underline">Return to Home</a>
    {/if}
  </div>
</div>

