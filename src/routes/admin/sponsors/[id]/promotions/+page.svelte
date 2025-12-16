<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { createClient } from '$lib/utils/supabase';
  import { formatDate } from '$lib/utils/formatters';
  import type { Database } from '$lib/types/database.types';

  type Promotion = Database['public']['Tables']['promotions']['Row'];
  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  let promotions: Promotion[] = [];
  let sponsor: Sponsor | null = null;
  let loading = true;
  let error = '';

  $: sponsorId = $page.params.id;

  const supabase = createClient();

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    error = '';

    try {
      // Load sponsor info
      const { data: sponsorData, error: sponsorError } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', sponsorId)
        .single();

      if (sponsorError || !sponsorData) {
        error = 'Sponsor not found';
        loading = false;
        return;
      }
      sponsor = sponsorData;

      // Load promotions via API
      const response = await fetch(`/api/admin/sponsors/promotions?sponsorId=${sponsorId}`);
      const result = await response.json();

      if (result.success) {
        promotions = result.promotions || [];
      } else {
        error = result.error || 'Failed to load promotions';
      }
    } catch (err) {
      console.error('Error loading data:', err);
      error = 'An error occurred while loading data';
    } finally {
      loading = false;
    }
  }

  async function deletePromotion(promotion: Promotion) {
    if (!confirm(`Are you sure you want to delete "${promotion.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sponsors/promotions?promotionId=${promotion.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
      } else {
        alert(`Failed to delete promotion: ${result.error}`);
      }
    } catch (err) {
      console.error('Error deleting promotion:', err);
      alert('An error occurred while deleting the promotion');
    }
  }

  async function toggleFeatured(promotion: Promotion) {
    try {
      const response = await fetch('/api/admin/sponsors/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: promotion.id,
          is_featured: !promotion.is_featured
        })
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
      } else {
        alert(`Failed to update promotion: ${result.error}`);
      }
    } catch (err) {
      console.error('Error updating promotion:', err);
      alert('An error occurred while updating the promotion');
    }
  }

  async function toggleStatus(promotion: Promotion) {
    const newStatus = promotion.status === 'active' ? 'draft' : 'active';
    
    try {
      const response = await fetch('/api/admin/sponsors/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: promotion.id,
          status: newStatus
        })
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
      } else {
        alert(`Failed to update promotion: ${result.error}`);
      }
    } catch (err) {
      console.error('Error updating promotion:', err);
      alert('An error occurred while updating the promotion');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<svelte:head>
  <title>{sponsor?.name || 'Sponsor'} Promotions - Admin</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/admin/sponsors/{sponsorId}" class="text-primary hover:underline">← Back to Sponsor</a>
    <h1 class="text-3xl font-bold mt-4">
      {#if sponsor}
        {sponsor.name} - Promotions
      {:else}
        Promotions
      {/if}
    </h1>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
      {error}
    </div>
  {:else}
    <div class="flex justify-between items-center mb-6">
      <p class="text-gray-600">{promotions.length} promotion{promotions.length !== 1 ? 's' : ''}</p>
      <a
        href="/admin/sponsors/{sponsorId}/promotions/new"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
      >
        + Create Promotion
      </a>
    </div>

    {#if promotions.length === 0}
      <div class="bg-white rounded-lg shadow-md p-12 text-center">
        <p class="text-gray-600 mb-4">No promotions yet for this sponsor.</p>
        <a
          href="/admin/sponsors/{sponsorId}/promotions/new"
          class="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
        >
          Create First Promotion
        </a>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each promotions as promotion}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{promotion.title}</div>
                  <div class="text-sm text-gray-500 truncate max-w-xs">{@html promotion.description.substring(0, 100)}{promotion.description.length > 100 ? '...' : ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-900 capitalize">{promotion.promotion_type.replace('_', ' ')}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(promotion.status)}">
                    {promotion.status.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>Start: {formatDate(promotion.start_date)}</div>
                  {#if promotion.end_date}
                    <div>End: {formatDate(promotion.end_date)}</div>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button
                    on:click={() => toggleFeatured(promotion)}
                    class="text-xl transition-colors {promotion.is_featured ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-yellow-400'}"
                    title={promotion.is_featured ? 'Remove from featured' : 'Add to featured'}
                  >
                    ★
                  </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end gap-3">
                    <button
                      on:click={() => toggleStatus(promotion)}
                      class="text-primary hover:text-primary-light"
                    >
                      {promotion.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <a
                      href="/admin/sponsors/{sponsorId}/promotions/{promotion.id}"
                      class="text-primary hover:text-primary-light"
                    >
                      Edit
                    </a>
                    <button
                      on:click={() => deletePromotion(promotion)}
                      class="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>



