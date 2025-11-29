<script lang="ts">
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/user';
  import { createClient } from '$lib/utils/supabase';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  // Use reactive statement to check auth when store finishes loading
  // Only redirect if we're not already on the target page
  // PHASE 1 FIX: Wait for profile to actually be loaded before redirecting
  let profileCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  $: if (browser && !$userStore.loading) {
    // Clear any pending timeout
    if (profileCheckTimeout) {
      clearTimeout(profileCheckTimeout);
    }
    
    // Wait a bit for profile to be set (it's loaded async in root layout)
    // This is especially important in test environments where session restoration takes time
    profileCheckTimeout = setTimeout(() => {
      const currentPath = $page.url.pathname;
      
      // Only redirect if we still don't have a profile after waiting
      // This prevents premature redirects during async profile loading
      if (!$userStore.profile) {
        if (!currentPath.startsWith('/auth/login')) {
          goto('/auth/login?redirect=/admin');
        }
      } else if ($userStore.profile.role !== 'super_admin') {
        if (currentPath.startsWith('/admin')) {
          goto('/');
        }
      }
    }, 1000); // Increased delay to allow profile to be set
  }

  // Loading state is true while:
  // - Store is loading
  // - We don't have a profile yet (but store finished loading)
  // - Profile doesn't have the right role (but store finished loading)
  $: loading = $userStore.loading || 
               (!$userStore.profile && !$userStore.loading) || 
               ($userStore.profile && $userStore.profile.role !== 'super_admin');
</script>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
{:else if $userStore.profile?.role === 'super_admin'}
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-primary text-white shadow-md">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <a href="/admin" class="text-2xl font-bold hover:opacity-80 transition-opacity">
              BBC Admin
            </a>
            <div class="flex gap-4">
              <a href="/admin" class="hover:opacity-80 transition-opacity">Dashboard</a>
              <a href="/admin/sponsors" class="hover:opacity-80 transition-opacity">Sponsors</a>
              <a href="/admin/promotions" class="hover:opacity-80 transition-opacity">Promotions</a>
              <a href="/admin/posts" class="hover:opacity-80 transition-opacity">Posts</a>
              <a href="/admin/admins" class="hover:opacity-80 transition-opacity">Admins</a>
              <a href="/admin/settings" class="hover:opacity-80 transition-opacity">Settings</a>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <a href="/" class="hover:opacity-80 transition-opacity">View Site</a>
            <button
              on:click={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                userStore.reset();
                goto('/');
              }}
              class="hover:opacity-80 transition-opacity"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
{/if}

