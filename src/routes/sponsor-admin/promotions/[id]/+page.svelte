<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import { promotionSchema } from '$lib/utils/validators';
  import RichTextEditor from '$lib/components/common/RichTextEditor.svelte';
  import type { z } from 'zod';
  import type { Database } from '$lib/types/database.types';

  type PromotionForm = z.infer<typeof promotionSchema>;
  type Promotion = Database['public']['Tables']['promotions']['Row'];

  let formData: PromotionForm = {
    title: '',
    description: '',
    promotion_type: 'evergreen',
    start_date: '',
    end_date: '',
    coupon_code: '',
    external_link: '',
    terms: '',
    is_featured: false
  };

  let errors: Record<string, string> = {};
  let loading = true;
  let saving = false;
  let promotion: Promotion | null = null;
  let sponsorId: string | null = null;

  const supabase = createClient();

  $: promotionId = $page.params.id;
  $: isTimeLimited = formData.promotion_type === 'time_limited';
  $: isCouponCode = formData.promotion_type === 'coupon_code';
  $: isExternalLink = formData.promotion_type === 'external_link';

  onMount(async () => {
    await loadPromotion();
  });

  async function loadPromotion() {
    if (!promotionId || !$userStore.profile) {
      loading = false;
      return;
    }

    // Use server-side API endpoint to get sponsor ID (bypasses RLS)
    try {
      const response = await fetch('/api/sponsor-admin/get-sponsor');
      const result = await response.json();

      if (!result.success || !result.sponsorId) {
        errors.submit = result.error || 'No sponsor associated with your account';
        loading = false;
        return;
      }

      sponsorId = result.sponsorId;

      // Fetch promotion
      const { data: promotionData, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .eq('sponsor_id', sponsorId)
        .single();

      if (error || !promotionData) {
        errors.submit = 'Promotion not found';
        loading = false;
        return;
      }

      promotion = promotionData;

      // Populate form
      const startDate = promotion.start_date ? new Date(promotion.start_date).toISOString().slice(0, 16) : '';
      const endDate = promotion.end_date ? new Date(promotion.end_date).toISOString().slice(0, 16) : '';

      formData = {
        title: promotion.title,
        description: promotion.description,
        promotion_type: promotion.promotion_type,
        start_date: startDate,
        end_date: endDate,
        coupon_code: promotion.coupon_code || '',
        external_link: promotion.external_link || '',
        terms: promotion.terms || '',
        is_featured: false // Sponsor admins cannot change this - always false in form
      };
    } catch (error: any) {
      console.error('Error loading promotion:', error);
      errors.submit = 'Failed to load promotion. Please try refreshing the page.';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    errors = {};
    saving = true;

    try {
      // Clean up empty strings to null
      const cleanedData = {
        ...formData,
        start_date: formData.start_date?.trim() || new Date().toISOString(),
        end_date: formData.end_date?.trim() || null,
        coupon_code: formData.coupon_code?.trim() || null,
        external_link: formData.external_link?.trim() || null,
        terms: formData.terms?.trim() || null
      };

      // Validate form
      const result = promotionSchema.safeParse(cleanedData);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        saving = false;
        return;
      }

      if (!promotionId) {
        errors.submit = 'Promotion ID not found';
        saving = false;
        return;
      }

      // Update promotion via server-side API (bypasses RLS)
      const response = await fetch('/api/sponsor-admin/promotions/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promotionId,
          title: cleanedData.title,
          description: cleanedData.description,
          promotion_type: cleanedData.promotion_type,
          start_date: cleanedData.start_date,
          end_date: cleanedData.end_date,
          coupon_code: cleanedData.coupon_code,
          external_link: cleanedData.external_link,
          terms: cleanedData.terms
          // Note: is_featured is not included - sponsor admins cannot change this
          // Only super admins can feature promotions via the admin panel
        })
      });

      const apiResult = await response.json();

      if (!apiResult.success) {
        console.error('API error:', apiResult.error);
        errors.submit = apiResult.error || 'Failed to update promotion';
        saving = false;
        return;
      }

      // Redirect to promotions list
      goto('/sponsor-admin/promotions');
    } catch (error) {
      errors.submit = 'An unexpected error occurred';
      console.error(error);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Edit Promotion - Sponsor Admin</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/sponsor-admin/promotions" class="text-white hover:opacity-80 transition-opacity">← Back to Promotions</a>
    <h1 class="text-3xl font-bold mt-4 text-white">Edit Promotion</h1>
  </div>

  {#if loading}
    <div class="text-center py-12 bg-white rounded-lg shadow-md">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if errors.submit && !promotion}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded bg-white">
      {errors.submit}
    </div>
  {:else if promotion}
    <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow-md p-6 space-y-6">
      {#if errors.submit}
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          <p class="font-semibold">Error:</p>
          <p>{errors.submit}</p>
        </div>
      {/if}

      {#if Object.keys(errors).length > 0 && !errors.submit}
        <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          <p class="font-semibold">Please fix the following errors:</p>
          <ul class="list-disc list-inside mt-2">
            {#each Object.entries(errors) as [field, message]}
              {#if field !== 'submit'}
                <li>{field}: {message}</li>
              {/if}
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Status Info -->
      <div class="bg-gray-50 border border-gray-200 rounded p-4">
        <p class="text-sm text-gray-600">
          <strong>Status:</strong> <span class="capitalize">{promotion.status}</span>
        </p>
      </div>

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
            {#if errors.end_date}
              <p class="text-red-600 text-sm mt-1">{errors.end_date}</p>
            {/if}
          </div>
        </div>
      </div>

      <!-- Promotion-Specific Fields -->
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
              required
              placeholder="SAVE20"
            />
          </div>
        </div>
      {/if}

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
              required
              placeholder="https://example.com/promo"
            />
            {#if errors.external_link}
              <p class="text-red-600 text-sm mt-1">{errors.external_link}</p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Additional Information -->
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

        <div class="mt-4">
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <a
          href="/sponsor-admin/promotions"
          class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  {/if}
</div>



