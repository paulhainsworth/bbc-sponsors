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
      // Fetch invitation by token
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (inviteError || !inviteData) {
        error = 'Invalid or expired invitation link.';
        loading = false;
        return;
      }

      // Check if already accepted
      if (inviteData.accepted_at) {
        error = 'This invitation has already been accepted.';
        loading = false;
        return;
      }

      // Check if expired
      if (new Date(inviteData.expires_at) < new Date()) {
        error = 'This invitation has expired. Please request a new invitation.';
        loading = false;
        return;
      }

      invitation = inviteData;

      // Check if user is already logged in
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session?.user) {
        // User is logged in, accept the invitation
        await acceptInvitation(session.user.id, session.user.email || inviteData.email);
      } else {
        // User needs to sign in first
        // Send magic link to the invitation email
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
      }
    } catch (err) {
      console.error('Invitation processing error:', err);
      error = 'An error occurred processing your invitation.';
      loading = false;
    }
  }

  async function acceptInvitation(userId: string, email: string) {
    try {
      // Create or update profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        role: invitation.role,
        display_name: email.split('@')[0] // Default to email username
      });

      if (profileError) {
        console.error('Profile error:', profileError);
        error = 'Failed to create profile.';
        return;
      }

      // If sponsor admin, link to sponsor
      if (invitation.role === 'sponsor_admin' && invitation.sponsor_id) {
        const { error: linkError } = await supabase.from('sponsor_admins').upsert({
          sponsor_id: invitation.sponsor_id,
          user_id: userId
        });

        if (linkError) {
          console.error('Sponsor admin link error:', linkError);
        }
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      // Update user store
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        userStore.setProfile(profile);
      }

      // Redirect based on role
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

