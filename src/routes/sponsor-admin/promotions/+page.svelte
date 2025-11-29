<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import { formatDate } from '$lib/utils/formatters';
  import type { Database } from '$lib/types/database.types';

  type Promotion = Database['public']['Tables']['promotions']['Row'] & {
    approval_status?: 'pending' | 'approved' | 'rejected' | null;
  };

  let promotions: Promotion[] = [];
  let loading = true;
  let sponsorId: string | null = null;
  let sponsorSlug: string | null = null;

  const supabase = createClient();

  onMount(async () => {
    await loadPromotions();
  });

  async function loadPromotions() {
    if (!$userStore.profile) {
      loading = false;
      return;
    }

    // Use server-side API endpoint to fetch promotions (bypasses RLS)
    try {
      const response = await fetch('/api/sponsor-admin/promotions/list');
      const result = await response.json();

      if (!result.success) {
        console.error('Error fetching promotions via API:', result.error);
        loading = false;
        return;
      }

      if (result.promotions) {
        promotions = result.promotions;
        // Get sponsor ID from first promotion if available
        if (promotions.length > 0 && promotions[0].sponsor_id) {
          sponsorId = promotions[0].sponsor_id;
        } else {
          // Fallback: get sponsor ID from API
          const sponsorResponse = await fetch('/api/sponsor-admin/get-sponsor');
          const sponsorResult = await sponsorResponse.json();
          if (sponsorResult.success && sponsorResult.sponsorId) {
            sponsorId = sponsorResult.sponsorId;
            sponsorSlug = sponsorResult.sponsorSlug || null;
          }
        }
      } else {
        promotions = [];
        // Get sponsor ID even if no promotions
        const sponsorResponse = await fetch('/api/sponsor-admin/get-sponsor');
        const sponsorResult = await sponsorResponse.json();
        if (sponsorResult.success && sponsorResult.sponsorId) {
          sponsorId = sponsorResult.sponsorId;
          sponsorSlug = sponsorResult.sponsorSlug || null;
        }
      }

      // Fetch sponsor slug if we have sponsorId but not slug
      if (sponsorId && !sponsorSlug) {
        const { data: sponsorData } = await supabase
          .from('sponsors')
          .select('slug')
          .eq('id', sponsorId)
          .single();
        if (sponsorData) {
          sponsorSlug = sponsorData.slug;
        }
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      loading = false;
    }
  }

  async function toggleStatus(promotion: Promotion) {
    const newStatus = promotion.status === 'active' ? 'draft' : 'active';
    
    // Use server-side API endpoint (bypasses RLS)
    try {
      const response = await fetch('/api/sponsor-admin/promotions/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promotionId: promotion.id,
          newStatus
        })
      });

      const result = await response.json();

      if (result.success) {
        await loadPromotions();
      } else {
        console.error('Error toggling promotion status:', result.error);
        alert(`Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} promotion: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling promotion status:', error);
      alert('An unexpected error occurred');
    }
  }

  async function deletePromotion(promotion: Promotion) {
    if (!confirm(`Are you sure you want to delete "${promotion.title}"? This action cannot be undone.`)) {
      return;
    }

    // Use server-side API endpoint (bypasses RLS)
    try {
      const response = await fetch('/api/sponsor-admin/promotions/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promotionId: promotion.id
        })
      });

      const result = await response.json();

      if (result.success) {
        await loadPromotions();
      } else {
        console.error('Error deleting promotion:', result.error);
        alert(`Failed to delete promotion: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert('An unexpected error occurred');
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
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<svelte:head>
  <title>Promotions - Sponsor Admin</title>
</svelte:head>

<div>
  <div class="flex items-center justify-between mb-6">
    <div>
      <a href="/sponsor-admin" class="text-white hover:opacity-80 transition-opacity">← Back to Dashboard</a>
      <h1 class="text-3xl font-bold mt-4 text-white" data-testid="promotions-heading">Promotions</h1>
    </div>
    <a
      href="/sponsor-admin/promotions/new"
      class="px-4 py-2 bg-white text-primary rounded-lg hover:bg-gray-100 transition-colors font-semibold"
      data-testid="create-promotion-button"
    >
      + Create Promotion
    </a>
  </div>

  {#if loading}
    <div class="text-center py-12 bg-white rounded-lg shadow-md">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if promotions.length === 0}
    <div class="bg-white rounded-lg shadow-md p-12 text-center">
      <p class="text-gray-600 mb-4">No promotions yet.</p>
      <a
        href="/sponsor-admin/promotions/new"
        class="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
        data-testid="create-promotion-button-empty"
      >
        Create Your First Promotion
      </a>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200" data-testid="promotions-table">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dates
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Featured
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each promotions as promotion}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{promotion.title}</div>
                <div class="text-sm text-gray-500 truncate max-w-xs">{promotion.description}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900 capitalize">{promotion.promotion_type.replace('_', ' ')}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col gap-1">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(promotion.status)}">
                    {promotion.status}
                  </span>
                  {#if promotion.approval_status === 'pending'}
                    <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending Approval
                    </span>
                  {:else if promotion.approval_status === 'approved'}
                    <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Approved
                    </span>
                  {:else if promotion.approval_status === 'rejected'}
                    <span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Rejected
                    </span>
                  {/if}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>Start: {formatDate(promotion.start_date)}</div>
                {#if promotion.end_date}
                  <div>End: {formatDate(promotion.end_date)}</div>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                {#if promotion.is_featured}
                  <span class="text-yellow-600">★</span>
                {:else}
                  <span class="text-gray-400">—</span>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-2">
                  {#if promotion.status === 'active' && sponsorSlug}
                    <a
                      href="/sponsors/{sponsorSlug}/promotions/{promotion.id}"
                      target="_blank"
                      class="text-primary hover:text-primary-light"
                    >
                      View Details
                    </a>
                  {/if}
                  {#if promotion.approval_status === 'pending'}
                    <span class="text-gray-400 text-sm">Awaiting Approval</span>
                  {:else}
                    <button
                      on:click={() => toggleStatus(promotion)}
                      class="text-primary hover:text-primary-light"
                      data-testid="toggle-status-button"
                    >
                      {promotion.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  {/if}
                  <a
                    href="/sponsor-admin/promotions/{promotion.id}"
                    class="text-primary hover:text-primary-light"
                    data-testid="edit-promotion-link"
                  >
                    Edit
                  </a>
                  <button
                    on:click={() => deletePromotion(promotion)}
                    class="text-red-600 hover:text-red-800"
                    data-testid="delete-promotion-button"
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
</div>



