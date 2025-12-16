<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import RichTextEditor from '$lib/components/common/RichTextEditor.svelte';
  import type { Database } from '$lib/types/database.types';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  let sponsor: Sponsor | null = null;
  let loading = true;
  let saving = false;
  let error = '';
  let errors: Record<string, string> = {};

  // Form data
  let formData = {
    title: '',
    description: '',
    promotion_type: 'evergreen',
    start_date: '',
    end_date: '',
    coupon_code: '',
    external_link: '',
    terms: '',
    is_featured: false,
    status: 'active'
  };

  $: sponsorId = $page.params.id;
  $: isTimeLimited = formData.promotion_type === 'time_limited';
  $: isCouponCode = formData.promotion_type === 'coupon_code';
  $: isExternalLink = formData.promotion_type === 'external_link';

  const supabase = createClient();

  onMount(async () => {
    // Load sponsor info
    const { data: sponsorData, error: sponsorError } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', sponsorId)
      .single();

    if (sponsorError || !sponsorData) {
      error = 'Sponsor not found';
    } else {
      sponsor = sponsorData;
    }
    loading = false;
  });

  async function handleSubmit() {
    errors = {};
    saving = true;

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        errors.title = 'Title is required';
      }
      if (!formData.description.trim()) {
        errors.description = 'Description is required';
      }
      if (isExternalLink && !formData.external_link.trim()) {
        errors.external_link = 'External link is required for this promotion type';
      }
      if (isCouponCode && !formData.coupon_code.trim()) {
        errors.coupon_code = 'Coupon code is required for this promotion type';
      }

      if (Object.keys(errors).length > 0) {
        saving = false;
        return;
      }

      const response = await fetch('/api/admin/sponsors/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          promotion_type: formData.promotion_type,
          start_date: formData.start_date || new Date().toISOString(),
          end_date: formData.end_date || null,
          coupon_code: formData.coupon_code.trim() || null,
          external_link: formData.external_link.trim() || null,
          terms: formData.terms.trim() || null,
          is_featured: formData.is_featured,
          status: formData.status
        })
      });

      const result = await response.json();

      if (result.success) {
        goto(`/admin/sponsors/${sponsorId}/promotions`);
      } else {
        error = result.error || 'Failed to create promotion';
      }
    } catch (err) {
      console.error('Error creating promotion:', err);
      error = 'An error occurred while creating the promotion';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Create Promotion - {sponsor?.name || 'Admin'}</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/admin/sponsors/{sponsorId}/promotions" class="text-primary hover:underline">← Back to Promotions</a>
    <h1 class="text-3xl font-bold mt-4">
      Create Promotion
      {#if sponsor}
        <span class="text-xl font-normal text-gray-500">for {sponsor.name}</span>
      {/if}
    </h1>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if error && !sponsor}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
      {error}
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow-md p-6 space-y-6">
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      {/if}

      <!-- Basic Information -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Basic Information</h2>
        <div class="space-y-4">
          <div>
            <label for="title" class="label">Title *</label>
            <input
              id="title"
              type="text"
              bind:value={formData.title}
              class="input"
              required
              maxlength="100"
            />
            {#if errors.title}
              <p class="text-red-600 text-sm mt-1">{errors.title}</p>
            {/if}
          </div>

          <div>
            <label for="description" class="label">Description *</label>
            <RichTextEditor
              bind:value={formData.description}
              placeholder="Enter promotion description..."
              maxLength={1000}
            />
            {#if errors.description}
              <p class="text-red-600 text-sm mt-1">{errors.description}</p>
            {/if}
          </div>

          <div>
            <label for="promotion_type" class="label">Promotion Type *</label>
            <select id="promotion_type" bind:value={formData.promotion_type} class="input">
              <option value="evergreen">Evergreen (Ongoing)</option>
              <option value="time_limited">Time Limited</option>
              <option value="coupon_code">Coupon Code</option>
              <option value="external_link">External Link</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Status & Featured -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Status & Visibility</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="status" class="label">Status</label>
            <select id="status" bind:value={formData.status} class="input">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div class="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="is_featured"
              bind:checked={formData.is_featured}
              class="w-5 h-5 text-primary rounded"
            />
            <label for="is_featured" class="text-sm font-medium">
              Featured Promotion <span class="text-yellow-500">★</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Dates -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Dates</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="start_date" class="label">Start Date</label>
            <input
              id="start_date"
              type="datetime-local"
              bind:value={formData.start_date}
              class="input"
            />
          </div>
          <div>
            <label for="end_date" class="label">End Date {isTimeLimited ? '*' : ''}</label>
            <input
              id="end_date"
              type="datetime-local"
              bind:value={formData.end_date}
              class="input"
              required={isTimeLimited}
            />
          </div>
        </div>
      </div>

      <!-- Coupon Code -->
      {#if isCouponCode}
        <div>
          <h2 class="text-xl font-semibold mb-4">Coupon Code</h2>
          <div>
            <label for="coupon_code" class="label">Coupon Code *</label>
            <input
              id="coupon_code"
              type="text"
              bind:value={formData.coupon_code}
              class="input"
              placeholder="SAVE20"
            />
            {#if errors.coupon_code}
              <p class="text-red-600 text-sm mt-1">{errors.coupon_code}</p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- External Link -->
      {#if isExternalLink}
        <div>
          <h2 class="text-xl font-semibold mb-4">External Link</h2>
          <div>
            <label for="external_link" class="label">Link URL *</label>
            <input
              id="external_link"
              type="url"
              bind:value={formData.external_link}
              class="input"
              placeholder="https://example.com/promo"
            />
            {#if errors.external_link}
              <p class="text-red-600 text-sm mt-1">{errors.external_link}</p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Terms -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Additional Information</h2>
        <div>
          <label for="terms" class="label">Terms & Conditions</label>
          <textarea
            id="terms"
            bind:value={formData.terms}
            class="input"
            rows="3"
            placeholder="Enter terms and conditions..."
          ></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Promotion'}
        </button>
        <a
          href="/admin/sponsors/{sponsorId}/promotions"
          class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  {/if}
</div>



