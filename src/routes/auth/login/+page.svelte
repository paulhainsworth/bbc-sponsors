<script lang="ts">
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';

  let email = '';
  let loading = false;
  let error = '';
  let success = false;

  async function handleLogin() {
    if (!email) {
      error = 'Please enter your email address';
      return;
    }

    loading = true;
    error = '';
    success = false;

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
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
</script>

<svelte:head>
  <title>Sign In - BBC Sponsor App</title>
</svelte:head>

<div class="container mx-auto px-4 py-16">
  <div class="max-w-md mx-auto card">
    <h1 class="text-3xl font-bold mb-6 text-center">Sign In</h1>

    {#if success}
      <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
        <p class="font-semibold">Check your email!</p>
        <p class="text-sm">We've sent you a magic link to sign in. Click the link in the email to continue.</p>
      </div>
    {:else}
      <form on:submit|preventDefault={handleLogin} class="space-y-4">
        {#if error}
          <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        {/if}

        <div>
          <label for="email" class="label">Email Address</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            class="input"
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        <button type="submit" class="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      <p class="text-sm text-gray-600 mt-4 text-center">
        We'll send you a passwordless login link via email.
      </p>
    {/if}
  </div>
</div>

