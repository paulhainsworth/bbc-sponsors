<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/user';
  import { createClient } from '$lib/utils/supabase';

  let loading = true;
  let sponsorId: string | null = null;

  onMount(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!$userStore.profile) {
      goto('/auth/login?redirect=/sponsor-admin');
      return;
    }

    if ($userStore.profile.role !== 'sponsor_admin') {
      goto('/');
      return;
    }

    // Fetch sponsor for this admin
    const supabase = createClient();
    const { data: sponsorAdmin } = await supabase
      .from('sponsor_admins')
      .select('sponsor_id')
      .eq('user_id', $userStore.profile.id)
      .single();

    if (sponsorAdmin) {
      sponsorId = sponsorAdmin.sponsor_id;
    }

    loading = false;
  });
</script>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
{:else if $userStore.profile?.role === 'sponsor_admin' && sponsorId}
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-primary text-white shadow-md">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <a href="/sponsor-admin" class="text-2xl font-bold hover:opacity-80 transition-opacity">
              Sponsor Dashboard
            </a>
            <div class="flex gap-4">
              <a href="/sponsor-admin" class="hover:opacity-80 transition-opacity">Dashboard</a>
              <a href="/sponsor-admin/profile" class="hover:opacity-80 transition-opacity">Profile</a>
              <a href="/sponsor-admin/promotions" class="hover:opacity-80 transition-opacity"
                >Promotions</a
              >
              <a href="/sponsor-admin/team" class="hover:opacity-80 transition-opacity">Team</a>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <a href="/sponsors/{sponsorId}" class="hover:opacity-80 transition-opacity">View Page</a>
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

