<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';
  import { format } from 'date-fns';
  import PromotionCard from '$lib/components/sponsors/PromotionCard.svelte';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];
  type Promotion = Database['public']['Tables']['promotions']['Row'];

  let sponsor: Sponsor | null = null;
  let promotions: Promotion[] = [];
  let loading = true;
  let error: string | null = null;

  const supabase = createClient();

  $: slug = $page.params.slug;

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

    // Fetch active promotions for this sponsor
    const { data: promotionsData } = await supabase
      .from('promotions')
      .select('*')
      .eq('sponsor_id', sponsor.id)
      .eq('status', 'active')
      .gte('start_date', new Date().toISOString())
      .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (promotionsData) {
      promotions = promotionsData;
    }

    loading = false;
  });

  function copyCouponCode(code: string) {
    navigator.clipboard.writeText(code);
    // TODO: Show toast notification
  }
</script>

<svelte:head>
  <title>{sponsor?.name || 'Sponsor'} - BBC Sponsors</title>
  <meta name="description" content={sponsor?.tagline || ''} />
</svelte:head>

{#if loading}
  <div class="container mx-auto px-4 py-12">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  </div>
{:else if error || !sponsor}
  <div class="container mx-auto px-4 py-12">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Sponsor Not Found</h1>
      <p class="text-gray-600 mb-6">{error || 'The sponsor you are looking for does not exist.'}</p>
      <a href="/" class="text-primary hover:underline">Return to Home</a>
    </div>
  </div>
{:else}
  <!-- Hero Section -->
  {#if sponsor.banner_url}
    <div class="w-full h-64 md:h-96 bg-gray-200 overflow-hidden">
      <img src={sponsor.banner_url} alt={sponsor.name} class="w-full h-full object-cover" />
    </div>
  {/if}

  <div class="container mx-auto px-4 py-8">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
      {#if sponsor.logo_url}
        <img
          src={sponsor.logo_url}
          alt={sponsor.name}
          class="w-32 h-32 md:w-48 md:h-48 object-contain bg-white rounded-lg shadow-md p-4"
        />
      {/if}
      <div class="flex-1">
        <h1 class="text-4xl font-bold mb-2">{sponsor.name}</h1>
        {#if sponsor.tagline}
          <p class="text-xl text-gray-600 mb-4">{sponsor.tagline}</p>
        {/if}
        {#if sponsor.category && sponsor.category.length > 0}
          <div class="flex flex-wrap gap-2 mb-4">
            {#each sponsor.category as cat}
              <span class="px-3 py-1 bg-secondary text-white rounded-full text-sm">{cat}</span>
            {/each}
          </div>
        {/if}
        {#if sponsor.website_url}
          <a
            href={sponsor.website_url}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
          >
            Visit Website →
          </a>
        {/if}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main Content -->
      <div class="lg:col-span-2">
        <!-- About Section -->
        {#if sponsor.description}
          <section class="mb-8">
            <h2 class="text-2xl font-semibold mb-4">About</h2>
            <div class="prose max-w-none">
              {@html sponsor.description}
            </div>
          </section>
        {/if}

        <!-- Active Promotions -->
        <section>
          <h2 class="text-2xl font-semibold mb-6">Current Offers</h2>
          {#if promotions.length === 0}
            <div class="text-center py-12 bg-gray-50 rounded-lg">
              <p class="text-gray-500">No active promotions at this time.</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each promotions as promotion (promotion.id)}
                <PromotionCard {promotion} {sponsor} />
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <!-- Sidebar -->
      <div class="lg:col-span-1">
        <!-- Contact Information -->
        <section class="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold mb-4">Contact Information</h3>
          <div class="space-y-3">
            {#if sponsor.contact_email}
              <div>
                <span class="text-sm text-gray-600">Email:</span>
                <a href="mailto:{sponsor.contact_email}" class="block text-primary hover:underline">
                  {sponsor.contact_email}
                </a>
              </div>
            {/if}
            {#if sponsor.contact_phone}
              <div>
                <span class="text-sm text-gray-600">Phone:</span>
                <a href="tel:{sponsor.contact_phone}" class="block text-primary hover:underline">
                  {sponsor.contact_phone}
                </a>
              </div>
            {/if}
            {#if sponsor.address_street}
              <div>
                <span class="text-sm text-gray-600">Address:</span>
                <address class="not-italic text-sm">
                  {sponsor.address_street}
                  {#if sponsor.address_city}
                    <br />
                    {sponsor.address_city}
                    {#if sponsor.address_state}, {sponsor.address_state}{/if}
                    {#if sponsor.address_zip} {sponsor.address_zip}{/if}
                  {/if}
                </address>
              </div>
            {/if}
          </div>
        </section>

        <!-- Social Media -->
        {#if sponsor.social_instagram || sponsor.social_facebook || sponsor.social_strava || sponsor.social_twitter}
          <section class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">Follow Us</h3>
            <div class="flex flex-wrap gap-3">
              {#if sponsor.social_instagram}
                <a
                  href={sponsor.social_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  Instagram
                </a>
              {/if}
              {#if sponsor.social_facebook}
                <a
                  href={sponsor.social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  Facebook
                </a>
              {/if}
              {#if sponsor.social_strava}
                <a
                  href={sponsor.social_strava}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  Strava
                </a>
              {/if}
              {#if sponsor.social_twitter}
                <a
                  href={sponsor.social_twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  Twitter
                </a>
              {/if}
            </div>
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}

