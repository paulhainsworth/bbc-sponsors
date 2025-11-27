<script lang="ts">
  import { userStore } from '$lib/stores/user';
  import { goto } from '$app/navigation';

  $: isAdmin = $userStore.profile?.role === 'super_admin';
  $: isSponsorAdmin = $userStore.profile?.role === 'sponsor_admin';
  $: isLoading = $userStore.loading;
  $: isAuthenticated = !!$userStore.user;
  
  let sponsorName: string | null = null;
  let sponsorNameLoading = false;
  let sponsorNameLoaded = false;

  // Extract first name from display_name or email
  $: firstName = $userStore.profile?.display_name
    ? $userStore.profile.display_name.split(' ')[0]
    : $userStore.user?.email?.split('@')[0] || 'User';

  // Fetch sponsor name for sponsor admins (only once when authenticated and loaded)
  $: if (isSponsorAdmin && isAuthenticated && !isLoading && !sponsorNameLoaded && !sponsorNameLoading) {
    loadSponsorName();
  }

  async function loadSponsorName() {
    if (!isSponsorAdmin || sponsorNameLoading || sponsorNameLoaded) return;
    
    sponsorNameLoading = true;
    try {
      const response = await fetch('/api/sponsor-admin/get-sponsor');
      const result = await response.json();
      
      if (result.success && result.sponsorName) {
        sponsorName = result.sponsorName;
      }
      sponsorNameLoaded = true;
    } catch (error) {
      console.error('Error loading sponsor name:', error);
      sponsorNameLoaded = true; // Mark as loaded even on error to prevent retries
    } finally {
      sponsorNameLoading = false;
    }
  }
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

        {#if isLoading}
          <!-- Show placeholder with same width as "Sign In" to prevent layout shift -->
          <span class="invisible">Sign In</span>
        {:else if isAuthenticated}
          <span class="text-sm opacity-90">
            Welcome, {firstName}
            {#if isSponsorAdmin && sponsorName}
              <span class="opacity-75"> - Managing {sponsorName}</span>
            {/if}
          </span>
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

