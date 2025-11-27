<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import type { Database } from '$lib/types/database.types';

  type Promotion = Database['public']['Tables']['promotions']['Row'] & {
    sponsors: { name: string; slug: string } | null;
    approval_status?: 'pending' | 'approved' | 'rejected' | null;
    approved_by?: string | null;
    approved_at?: string | null;
    approval_notes?: string | null;
    publish_to_site?: boolean | null;
    publish_to_slack?: boolean | null;
    slack_channel?: string | null;
  };

  let promotions: Promotion[] = [];
  let loading = true;
  let error: string | null = null;
  let filter: 'pending' | 'all' = 'pending';

  const supabase = createClient();

  onMount(async () => {
    await loadPromotions();
  });

  async function loadPromotions() {
    loading = true;
    error = null;

    try {
      let query = supabase
        .from('promotions')
        .select('*, sponsors(name, slug)')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('approval_status', 'pending').or('approval_status.is.null');
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      promotions = data || [];
    } catch (err: any) {
      console.error('Error loading promotions:', err);
      error = err.message || 'Failed to load promotions';
    } finally {
      loading = false;
    }
  }

  $: if (filter) {
    loadPromotions();
  }
</script>

<svelte:head>
  <title>Promotion Approvals - Admin</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-6">
    <h1 class="text-3xl font-bold mb-4">Promotion Approvals</h1>
    
    <div class="flex gap-4 mb-4">
      <button
        on:click={() => filter = 'pending'}
        class="px-4 py-2 rounded-lg transition-colors"
        class:bg-primary={filter === 'pending'}
        class:text-white={filter === 'pending'}
        class:bg-gray-200={filter !== 'pending'}
        class:text-gray-800={filter !== 'pending'}
      >
        Pending Approval
      </button>
      <button
        on:click={() => filter = 'all'}
        class="px-4 py-2 rounded-lg transition-colors"
        class:bg-primary={filter === 'all'}
        class:text-white={filter === 'all'}
        class:bg-gray-200={filter !== 'all'}
        class:text-gray-800={filter !== 'all'}
      >
        All Promotions
      </button>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
      {error}
    </div>
  {:else if promotions.length === 0}
    <div class="text-center py-12 bg-gray-50 rounded-lg">
      <p class="text-gray-500">
        {filter === 'pending' ? 'No promotions pending approval' : 'No promotions found'}
      </p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each promotions as promotion (promotion.id)}
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 {promotion.approval_status === 'pending' ? 'border-yellow-500' : promotion.approval_status === 'approved' ? 'border-green-500' : 'border-red-500'}">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 text-xs font-semibold rounded capitalize {promotion.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : promotion.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {promotion.approval_status}
                </span>
                {#if promotion.sponsors}
                  <span class="text-sm text-gray-600">from {promotion.sponsors.name}</span>
                {/if}
              </div>
              <h3 class="text-xl font-semibold mb-2">{promotion.title}</h3>
              <div class="prose prose-sm max-w-none mb-4">
                {@html promotion.description.substring(0, 200)}
                {promotion.description.length > 200 ? '...' : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <a
              href="/admin/promotions/{promotion.id}/approve"
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
            >
              {promotion.approval_status === 'pending' ? 'Review & Approve' : 'View Details'}
            </a>
            {#if promotion.sponsors}
              <a
                href="/sponsors/{promotion.sponsors.slug}/promotions/{promotion.id}"
                target="_blank"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Public Page
              </a>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

