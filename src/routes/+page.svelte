<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';
  import SponsorGrid from '$lib/components/sponsors/SponsorGrid.svelte';
  import FeaturedCarousel from '$lib/components/sponsors/FeaturedCarousel.svelte';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];
  type Promotion = Database['public']['Tables']['promotions']['Row'];

  let sponsors: Sponsor[] = [];
  let featuredPromotions: Promotion[] = [];
  let loading = true;

  const supabase = createClient();

  onMount(async () => {
    try {
      // Fetch active sponsors
      const { data: sponsorsData, error: sponsorsError } = await supabase
        .from('sponsors')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (sponsorsError) {
        console.error('Error fetching sponsors:', sponsorsError);
      } else if (sponsorsData) {
        sponsors = sponsorsData;
      }

      // Fetch featured promotions
      // Filter: is_featured = true, status = 'active', start_date <= now, (end_date IS NULL OR end_date >= now)
      const now = new Date().toISOString();
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'active')
        .lte('start_date', now) // Promotion has started
        .or(`end_date.is.null,end_date.gte.${now}`) // No end date OR hasn't ended yet
        .order('created_at', { ascending: false })
        .limit(8);

      if (promotionsError) {
        console.error('Error fetching promotions:', promotionsError);
      } else if (promotionsData) {
        featuredPromotions = promotionsData;
      }
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>BBC Sponsor App - Home</title>
  <meta name="description" content="Discover sponsor offers and promotions from Berkeley Bicycle Club partners" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-primary mb-4">Berkeley Bicycle Club Sponsors</h1>
    <p class="text-xl text-gray-600">Discover exclusive offers from our partner sponsors</p>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else}
    {#if featuredPromotions.length > 0}
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-6">Featured Offers</h2>
        <FeaturedCarousel promotions={featuredPromotions} />
      </section>
    {/if}

    <section>
      <h2 class="text-2xl font-semibold mb-6">All Sponsors</h2>
      <SponsorGrid sponsors={sponsors} />
    </section>
  {/if}
</div>

