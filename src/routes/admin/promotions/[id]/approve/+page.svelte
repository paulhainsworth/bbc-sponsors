<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
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

  let promotion: Promotion | null = null;
  let loading = true;
  let saving = false;
  let error: string | null = null;

  // Approval options
  let publishToSite = false;
  let publishToSlack = false;
  let isFeatured = false;
  let slackChannel = 'sponsor-news';
  let approvalNotes = '';

  const supabase = createClient();

  $: promotionId = $page.params.id;

  onMount(async () => {
    await loadPromotion();
  });

  async function loadPromotion() {
    loading = true;
    error = null;

    try {
      const { data, error: queryError } = await supabase
        .from('promotions')
        .select('*, sponsors(name, slug)')
        .eq('id', promotionId)
        .single();

      if (queryError) {
        throw queryError;
      }

      promotion = data;

      // Pre-fill approval options based on current state
      if (promotion) {
        publishToSite = promotion.publish_to_site || false;
        publishToSlack = promotion.publish_to_slack || false;
        isFeatured = promotion.is_featured || false;
        slackChannel = promotion.slack_channel || 'sponsor-news';
        approvalNotes = promotion.approval_notes || '';
      }
    } catch (err: any) {
      console.error('Error loading promotion:', err);
      error = err.message || 'Failed to load promotion';
    } finally {
      loading = false;
    }
  }

  async function handleApprove() {
    if (!promotion) return;

    saving = true;
    error = null;

    try {
      const response = await fetch('/api/admin/promotions/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promotionId: promotion.id,
          action: 'approve',
          publishToSite,
          publishToSlack,
          isFeatured,
          slackChannel: publishToSlack ? slackChannel : null,
          approvalNotes: approvalNotes.trim() || null
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve promotion');
      }

      // Redirect back to promotions list
      goto('/admin/promotions');
    } catch (err: any) {
      console.error('Error approving promotion:', err);
      error = err.message || 'Failed to approve promotion';
    } finally {
      saving = false;
    }
  }

  async function handleReject() {
    if (!promotion) return;

    const notes = window.prompt('Enter rejection reason (optional):');
    if (notes === null) return; // User cancelled

    saving = true;
    error = null;

    try {
      const response = await fetch('/api/admin/promotions/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promotionId: promotion.id,
          action: 'reject',
          approvalNotes: notes || null
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to reject promotion');
      }

      // Redirect back to promotions list
      goto('/admin/promotions');
    } catch (err: any) {
      console.error('Error rejecting promotion:', err);
      error = err.message || 'Failed to reject promotion';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Approve Promotion - Admin</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/admin/promotions" class="text-primary hover:underline">← Back to Promotions</a>
    <h1 class="text-3xl font-bold mt-4">Review Promotion</h1>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if error || !promotion}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
      {error || 'Promotion not found'}
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="px-3 py-1 text-sm font-semibold rounded capitalize {promotion.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : promotion.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            {promotion.approval_status}
          </span>
          {#if promotion.sponsors}
            <span class="text-gray-600">from <strong>{promotion.sponsors.name}</strong></span>
          {/if}
        </div>
        <h2 class="text-2xl font-bold mb-4">{promotion.title}</h2>
        <div class="prose max-w-none mb-4">
          {@html promotion.description}
        </div>

        {#if promotion.coupon_code}
          <div class="mb-4 p-3 bg-gray-50 rounded border">
            <strong>Coupon Code:</strong> <code class="font-mono">{promotion.coupon_code}</code>
          </div>
        {/if}

        {#if promotion.external_link}
          <div class="mb-4">
            <strong>External Link:</strong> <a href={promotion.external_link} target="_blank" class="text-primary hover:underline">{promotion.external_link}</a>
          </div>
        {/if}

        {#if promotion.terms}
          <div class="mb-4">
            <strong>Terms & Conditions:</strong>
            <p class="text-gray-700 whitespace-pre-line">{promotion.terms}</p>
          </div>
        {/if}

        <div class="text-sm text-gray-600">
          <p><strong>Type:</strong> {promotion.promotion_type.replace('_', ' ')}</p>
          <p><strong>Start Date:</strong> {new Date(promotion.start_date).toLocaleString()}</p>
          {#if promotion.end_date}
            <p><strong>End Date:</strong> {new Date(promotion.end_date).toLocaleString()}</p>
          {/if}
        </div>
      </div>

      {#if promotion.approval_status === 'pending'}
        <div class="border-t pt-6">
          <h3 class="text-xl font-semibold mb-4">Approval Options</h3>

          {#if error}
            <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          {/if}

          <div class="space-y-4 mb-6">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={publishToSite}
                class="w-5 h-5 text-primary rounded"
              />
              <div>
                <span class="font-semibold">Publish to Site</span>
                <p class="text-sm text-gray-600">Make this promotion visible on the public website</p>
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={publishToSlack}
                class="w-5 h-5 text-primary rounded"
              />
              <div class="flex-1">
                <span class="font-semibold">Publish to Slack</span>
                <p class="text-sm text-gray-600">Post this promotion to the #sponsor-news Slack channel</p>
                {#if publishToSlack}
                  <input
                    type="text"
                    bind:value={slackChannel}
                    placeholder="sponsor-news"
                    class="mt-2 input w-full max-w-xs"
                  />
                  <p class="text-xs text-gray-500 mt-1">Enter channel name (e.g., sponsor-news) or channel ID</p>
                {/if}
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={isFeatured}
                class="w-5 h-5 text-primary rounded"
              />
              <div>
                <span class="font-semibold">Feature on Homepage</span>
                <p class="text-sm text-gray-600">Display this promotion in the featured carousel on the homepage</p>
              </div>
            </label>
          </div>

          <div class="mb-6">
            <label for="approval-notes" class="block font-semibold mb-2">Approval Notes (Optional)</label>
            <textarea
              id="approval-notes"
              bind:value={approvalNotes}
              class="input w-full"
              rows="3"
              placeholder="Add any notes about this approval..."
            ></textarea>
          </div>

          <div class="flex gap-4">
            <button
              on:click={handleApprove}
              disabled={saving || (!publishToSite && !publishToSlack)}
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Processing...' : 'Approve Promotion'}
            </button>
            <button
              on:click={handleReject}
              disabled={saving}
              class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Processing...' : 'Reject'}
            </button>
          </div>

          {#if !publishToSite && !publishToSlack}
            <p class="text-sm text-yellow-600 mt-2">
              ⚠️ Please select at least one publishing option (Publish to Site or Publish to Slack)
            </p>
          {/if}
        </div>
      {:else}
        <div class="border-t pt-6">
          <h3 class="text-xl font-semibold mb-4">Approval Status</h3>
          <div class="space-y-2">
            <p><strong>Status:</strong> <span class="capitalize">{promotion.approval_status}</span></p>
            {#if promotion.approved_at}
              <p><strong>Approved At:</strong> {new Date(promotion.approved_at).toLocaleString()}</p>
            {/if}
            {#if promotion.approval_notes}
              <p><strong>Notes:</strong> {promotion.approval_notes}</p>
            {/if}
            <div class="mt-4">
              <p><strong>Publishing Options:</strong></p>
              <ul class="list-disc list-inside ml-4">
                <li>Publish to Site: {promotion.publish_to_site ? 'Yes' : 'No'}</li>
                <li>Publish to Slack: {promotion.publish_to_slack ? 'Yes' : 'No'}</li>
                <li>Featured on Homepage: {promotion.is_featured ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

