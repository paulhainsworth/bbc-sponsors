<script lang="ts">
  import { userStore } from '$lib/stores/user';
  import { goto } from '$app/navigation';

  $: isAdmin = $userStore.profile?.role === 'super_admin';
  $: isSponsorAdmin = $userStore.profile?.role === 'sponsor_admin';
</script>

<header class="bg-primary text-white shadow-md">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <a href="/" class="text-2xl font-bold hover:opacity-80 transition-opacity">
        BBC Sponsors
      </a>

      <nav class="flex items-center gap-6">
        <a href="/" class="hover:opacity-80 transition-opacity">Home</a>
        <a href="/sponsors" class="hover:opacity-80 transition-opacity">Sponsors</a>
        <a href="/news" class="hover:opacity-80 transition-opacity">News</a>

        {#if $userStore.user}
          {#if isAdmin}
            <a href="/admin" class="hover:opacity-80 transition-opacity">Admin</a>
          {:else if isSponsorAdmin}
            <a href="/sponsor-admin" class="hover:opacity-80 transition-opacity">Dashboard</a>
          {/if}
          <button
            on:click={async () => {
              const { createClient } = await import('$lib/utils/supabase');
              const supabase = createClient();
              await supabase.auth.signOut();
              userStore.reset();
              goto('/');
            }}
            class="hover:opacity-80 transition-opacity"
          >
            Sign Out
          </button>
        {:else}
          <a href="/auth/login" class="hover:opacity-80 transition-opacity">Sign In</a>
        {/if}
      </nav>
    </div>
  </div>
</header>

