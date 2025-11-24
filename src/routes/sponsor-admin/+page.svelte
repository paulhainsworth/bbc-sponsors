<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import type { Database } from '$lib/types/database.types';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];
  type Promotion = Database['public']['Tables']['promotions']['Row'];

  let sponsor: Sponsor | null = null;
  let promotions: Promotion[] = [];
  let loading = true;

  const supabase = createClient();

  onMount(async () => {
    if (!$userStore.profile) return;

    // Get sponsor for this admin
    const { data: sponsorAdmin } = await supabase
      .from('sponsor_admins')
      .select('sponsor_id')
      .eq('user_id', $userStore.profile.id)
      .single();

    if (!sponsorAdmin) {
      loading = false;
      return;
    }

    // Fetch sponsor
    const { data: sponsorData } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', sponsorAdmin.sponsor_id)
      .single();

    if (sponsorData) {
      sponsor = sponsorData;
    }

    // Fetch promotions
    const { data: promotionsData } = await supabase
      .from('promotions')
      .select('*')
      .eq('sponsor_id', sponsorAdmin.sponsor_id)
      .order('created_at', { ascending: false });

    if (promotionsData) {
      promotions = promotionsData;
    }

    loading = false;
  });
</script>

<svelte:head>
  <title>Sponsor Dashboard</title>
</svelte:head>

<div>
  <h1 class="text-3xl font-bold mb-8">
    {#if sponsor}
      {sponsor.name} Dashboard
    {:else}
      Dashboard
    {/if}
  </h1>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if !sponsor}
    <div class="bg-warning/20 border border-warning rounded-lg p-6">
      <p class="text-warning">No sponsor associated with your account. Please contact an administrator.</p>
    </div>
  {:else}
    <!-- Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Total Promotions</h3>
        <p class="text-3xl font-bold text-primary">{promotions.length}</p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Active Promotions</h3>
        <p class="text-3xl font-bold text-success">
          {promotions.filter((p) => p.status === 'active').length}
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Featured Promotions</h3>
        <p class="text-3xl font-bold text-secondary">
          {promotions.filter((p) => p.is_featured && p.status === 'active').length}
        </p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-2xl font-semibold mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/sponsor-admin/profile"
          class="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-center"
        >
          Edit Profile
        </a>
        <a
          href="/sponsor-admin/promotions/new"
          class="px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors text-center"
        >
          Create Promotion
        </a>
        <a
          href="/sponsors/{sponsor.slug}"
          target="_blank"
          class="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-center"
        >
          View Public Page
        </a>
      </div>
    </div>

    <!-- Recent Promotions -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-semibold">Recent Promotions</h2>
        <a
          href="/sponsor-admin/promotions"
          class="text-primary hover:underline"
        >
          View All →
        </a>
      </div>

      {#if promotions.length === 0}
        <div class="text-center py-12 text-gray-500">
          <p>No promotions yet. Create your first promotion to get started!</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each promotions.slice(0, 5) as promotion}
            <div class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold">{promotion.title}</h3>
                  <p class="text-sm text-gray-600">{promotion.status}</p>
                </div>
                <a
                  href="/sponsor-admin/promotions/{promotion.id}"
                  class="text-primary hover:underline text-sm"
                >
                  Edit →
                </a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

