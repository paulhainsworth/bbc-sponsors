<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { promotionSchema } from '$lib/utils/validators';
  import RichTextEditor from '$lib/components/common/RichTextEditor.svelte';
  import type { z } from 'zod';
  import type { Database } from '$lib/types/database.types';

  type PromotionForm = z.infer<typeof promotionSchema>;
  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

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
  let loading = false;
  let sponsors: Sponsor[] = [];
  let selectedSponsorId: string = '';
  let status: 'active' | 'draft' = 'active';
  let publishToSite = true;
  let publishToSlack = false;
  let slackChannel = 'sponsor-news';

  const supabase = createClient();

  $: isTimeLimited = formData.promotion_type === 'time_limited';
  $: isCouponCode = formData.promotion_type === 'coupon_code';
  $: isExternalLink = formData.promotion_type === 'external_link';

  onMount(async () => {
    await loadSponsors();
  });

  async function loadSponsors() {
    const { data, error } = await supabase
      .from('sponsors')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error loading sponsors:', error);
      errors.submit = 'Failed to load sponsors';
    } else {
      sponsors = data || [];
    }
  }

  async function handleSubmit() {
    errors = {};
    loading = true;

    if (!selectedSponsorId) {
      errors.sponsor = 'Please select a sponsor';
      loading = false;
      return;
    }

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
        loading = false;
        return;
      }

      // Create promotion via server-side API
      const response = await fetch('/api/admin/promotions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sponsor_id: selectedSponsorId,
          title: cleanedData.title,
          description: cleanedData.description,
          promotion_type: cleanedData.promotion_type,
          start_date: cleanedData.start_date,
          end_date: cleanedData.end_date,
          coupon_code: cleanedData.coupon_code,
          external_link: cleanedData.external_link,
          terms: cleanedData.terms,
          is_featured: formData.is_featured,
          status: status,
          publish_to_site: publishToSite,
          publish_to_slack: publishToSlack,
          slack_channel: publishToSlack ? slackChannel : null
        })
      });

      const apiResult = await response.json();

      if (!apiResult.success) {
        console.error('API error:', apiResult.error);
        errors.submit = apiResult.error || 'Failed to create promotion';
        loading = false;
        return;
      }

      // Redirect to promotions list
      goto('/admin/promotions');
    } catch (error) {
      errors.submit = 'An unexpected error occurred';
      console.error(error);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Create Promotion - Admin</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/admin/promotions" class="text-primary hover:underline">← Back to Promotions</a>
    <h1 class="text-3xl font-bold mt-4">Create Promotion</h1>
  </div>

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

    <!-- Sponsor Selection -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Sponsor</h2>
      <div>
        <label for="sponsor" class="label">Select Sponsor *</label>
        <select
          id="sponsor"
          bind:value={selectedSponsorId}
          class="input"
          required
        >
          <option value="">-- Select a sponsor --</option>
          {#each sponsors as sponsor}
            <option value={sponsor.id}>{sponsor.name}</option>
          {/each}
        </select>
        {#if errors.sponsor}
          <p class="text-red-600 text-sm mt-1">{errors.sponsor}</p>
        {/if}
      </div>
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
    </div>

    <!-- Publishing Options -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Publishing Options</h2>
      <div class="space-y-4">
        <div>
          <label for="status" class="label">Status</label>
          <select id="status" bind:value={status} class="input">
            <option value="active">Active (Published immediately)</option>
            <option value="draft">Draft (Save for later)</option>
          </select>
        </div>

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
            <p class="text-sm text-gray-600">Post this promotion to a Slack channel</p>
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
            bind:checked={formData.is_featured}
            class="w-5 h-5 text-primary rounded"
          />
          <div>
            <span class="font-semibold">Feature on Homepage</span>
            <p class="text-sm text-gray-600">Display this promotion in the featured carousel on the homepage</p>
          </div>
        </label>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-4 pt-4 border-t">
      <button
        type="submit"
        disabled={loading}
        class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Promotion'}
      </button>
      <a
        href="/admin/promotions"
        class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Cancel
      </a>
    </div>
  </form>
</div>

