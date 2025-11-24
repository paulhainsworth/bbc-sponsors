<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';
  import SponsorGrid from '$lib/components/sponsors/SponsorGrid.svelte';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  let sponsors: Sponsor[] = [];
  let loading = true;
  let searchQuery = '';
  let selectedCategory = '';

  const supabase = createClient();

  $: filteredSponsors = sponsors.filter((sponsor) => {
    const matchesSearch = sponsor.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || sponsor.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  onMount(async () => {
    const { data: sponsorsData } = await supabase
      .from('sponsors')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (sponsorsData) {
      sponsors = sponsorsData;
    }

    loading = false;
  });

  // Get unique categories
  $: categories = [...new Set(sponsors.flatMap((s) => s.category || []))].sort();
</script>

<svelte:head>
  <title>All Sponsors - BBC Sponsors</title>
  <meta name="description" content="Browse all sponsors of the Berkeley Bicycle Club" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-primary mb-4">All Sponsors</h1>
    <p class="text-xl text-gray-600">Discover all our partner sponsors</p>
  </div>

  <div class="mb-6 flex flex-col md:flex-row gap-4">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search sponsors..."
      class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
    />
    {#if categories.length > 0}
      <select
        bind:value={selectedCategory}
        class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All Categories</option>
        {#each categories as category}
          <option value={category}>{category}</option>
        {/each}
      </select>
    {/if}
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else}
    <SponsorGrid sponsors={filteredSponsors} />
  {/if}
</div>

