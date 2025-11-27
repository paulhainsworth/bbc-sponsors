<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';
  import { format } from 'date-fns';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];
  type Promotion = Database['public']['Tables']['promotions']['Row'];

  let sponsor: Sponsor | null = null;
  let promotion: Promotion | null = null;
  let loading = true;
  let error: string | null = null;
  let copied = false;

  const supabase = createClient();

  $: slug = $page.params.slug;
  $: promotionId = $page.params.id;

  onMount(async () => {
    // Fetch sponsor by slug
    const { data: sponsorData, error: sponsorError } = await supabase
      .from('sponsors')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (sponsorError || !sponsorData) {
      error = 'Sponsor not found';
      loading = false;
      return;
    }

    sponsor = sponsorData;

    // Fetch the specific promotion
    const now = new Date().toISOString();
    const { data: promotionData, error: promotionError } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .eq('sponsor_id', sponsor.id)
      .eq('status', 'active')
      .lte('start_date', now)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .single();

    if (promotionError || !promotionData) {
      error = 'Promotion not found';
      loading = false;
      return;
    }

    promotion = promotionData;
    loading = false;
  });

  function copyCouponCode(code: string) {
    navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<svelte:head>
  <title>{promotion?.title || 'Promotion'} - {sponsor?.name || 'Sponsor'} - BBC Sponsors</title>
  <meta name="description" content={promotion?.description || ''} />
</svelte:head>

{#if loading}
  <div class="container mx-auto px-4 py-12">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  </div>
{:else if error || !sponsor || !promotion}
  <div class="container mx-auto px-4 py-12">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Promotion Not Found</h1>
      <p class="text-gray-600 mb-6">{error || 'The promotion you are looking for does not exist.'}</p>
      <a href="/sponsors/{slug}" class="text-primary hover:underline">← Back to {sponsor?.name || 'Sponsor'}</a>
    </div>
  </div>
{:else}
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <nav class="mb-6">
      <a href="/" class="text-primary hover:underline">Home</a>
      <span class="mx-2 text-gray-400">/</span>
      <a href="/sponsors/{sponsor.slug}" class="text-primary hover:underline">{sponsor.name}</a>
      <span class="mx-2 text-gray-400">/</span>
      <span class="text-gray-600">{promotion.title}</span>
    </nav>

    <!-- Promotion Details -->
    <div class="bg-white rounded-lg shadow-md p-8">
      <div class="flex items-start justify-between mb-6">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-4">
            {#if promotion.is_featured}
              <span class="px-3 py-1 bg-secondary text-white text-sm font-semibold rounded">Featured</span>
            {/if}
            <span class="px-3 py-1 bg-primary text-white text-sm font-semibold rounded capitalize">
              {promotion.promotion_type.replace('_', ' ')}
            </span>
          </div>
          <h1 class="text-4xl font-bold mb-4">{promotion.title}</h1>
          <p class="text-lg text-gray-600 mb-4">{sponsor.name}</p>
        </div>
      </div>

      <div class="prose max-w-none mb-6">
        {@html promotion.description}
      </div>

      {#if promotion.coupon_code}
        <div class="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-primary">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm text-gray-600 block mb-2">Coupon Code:</span>
              <code class="font-mono text-2xl font-bold text-primary">{promotion.coupon_code}</code>
            </div>
            <button
              on:click={() => copyCouponCode(promotion.coupon_code || '')}
              class="px-6 py-3 bg-primary text-white rounded hover:bg-primary-light transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>
      {/if}

      {#if promotion.terms}
        <div class="mb-6">
          <h3 class="text-xl font-semibold mb-3">Terms & Conditions</h3>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-gray-700 whitespace-pre-line">{promotion.terms}</p>
          </div>
        </div>
      {/if}

      <div class="flex items-center justify-between pt-6 border-t">
        <div class="text-sm text-gray-600">
          {#if promotion.end_date}
            <p>Valid until {format(new Date(promotion.end_date), 'MMMM d, yyyy')}</p>
          {:else}
            <p>Ongoing offer</p>
          {/if}
          {#if promotion.start_date}
            <p class="text-xs text-gray-500 mt-1">
              Started {format(new Date(promotion.start_date), 'MMMM d, yyyy')}
            </p>
          {/if}
        </div>
        <div class="flex gap-3">
          {#if promotion.external_link}
            <a
              href={promotion.external_link}
              target="_blank"
              rel="noopener noreferrer"
              class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors font-semibold"
            >
              Shop Now →
            </a>
          {/if}
          <a
            href="/sponsors/{sponsor.slug}"
            class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to {sponsor.name}
          </a>
        </div>
      </div>
    </div>
  </div>
{/if}


