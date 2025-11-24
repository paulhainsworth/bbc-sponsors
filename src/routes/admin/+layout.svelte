<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/user';
  import { createClient } from '$lib/utils/supabase';

  let loading = true;

  onMount(async () => {
    // Wait for user store to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!$userStore.profile) {
      goto('/auth/login?redirect=/admin');
      return;
    }

    if ($userStore.profile.role !== 'super_admin') {
      goto('/');
      return;
    }

    loading = false;
  });
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

