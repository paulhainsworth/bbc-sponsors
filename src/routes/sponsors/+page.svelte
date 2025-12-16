<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  let sponsors: Sponsor[] = [];
  let loading = true;
  let searchQuery = '';
  let selectedCategory = 'All';

  const supabase = createClient();

  // Category colors using BBC colors
  const categoryColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    'Bike Shops': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-400 to-emerald-600' },
    'Apparel': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-400 to-purple-600' },
    'Nutrition': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', gradient: 'from-orange-400 to-orange-600' },
    'Services': { bg: 'bg-secondary/10', text: 'text-secondary-dark', border: 'border-secondary/30', gradient: 'from-secondary to-secondary-dark' },
    'Accessories': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', gradient: 'from-sky-400 to-sky-600' },
    'Components': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', gradient: 'from-rose-400 to-rose-600' },
    'Other': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', gradient: 'from-gray-400 to-gray-600' }
  };

  function getCategoryColor(category: string) {
    return categoryColors[category] || categoryColors['Other'];
  }

  $: filteredSponsors = sponsors.filter((sponsor) => {
    const matchesSearch = sponsor.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || sponsor.category?.includes(selectedCategory);
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
  $: categories = ['All', ...new Set(sponsors.flatMap((s) => s.category || []))].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  function handleSponsorClick(sponsor: Sponsor) {
    goto(`/sponsors/${sponsor.slug}`);
  }
</script>

<svelte:head>
  <title>All Sponsors - BBC Sponsors</title>
  <meta name="description" content="Browse all sponsors of the Berkeley Bicycle Club" />
</svelte:head>

<!-- Hero Section -->
<div class="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary">
  <div class="absolute inset-0 noise-overlay"></div>
  
  <!-- Decorative elements -->
  <div class="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
  <div class="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
  
  <div class="relative z-10 container mx-auto px-4 py-16 md:py-24">
    <div class="max-w-2xl">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-6">
        <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
        <span class="text-white/80 text-xs font-medium tracking-wide uppercase">Supporting Local Cycling</span>
      </div>
      <h1 class="font-display text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
        Our Amazing<br />
        <span class="text-secondary">Sponsors</span>
      </h1>
      <p class="text-white/70 text-lg leading-relaxed">
        Discover exclusive offers from partners who share our passion for cycling and community.
      </p>
    </div>
    
    <!-- Floating bike illustration -->
    <div class="hidden md:block absolute right-12 top-1/2 -translate-y-1/2 text-8xl opacity-20 animate-float">
      🚲
    </div>
  </div>
</div>

<!-- Main Content -->
<main class="container mx-auto px-4 py-12 -mt-8 relative z-20">
  
  <!-- Search and Filter Bar -->
  <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-10">
    <div class="flex flex-col md:flex-row gap-4 items-center">
      <!-- Search -->
      <div class="relative flex-1 w-full">
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search sponsors..."
          class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>
      
      <!-- Category Pills -->
      <div class="flex items-center gap-2 flex-wrap justify-center md:justify-end">
        {#each categories as category}
          <button
            on:click={() => selectedCategory = category}
            class="px-4 py-2 rounded-xl text-sm font-medium transition-all {
              selectedCategory === category
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }"
          >
            {category}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Results count -->
  <div class="flex items-center gap-3 mb-6">
    <div class="w-1 h-6 bg-gradient-to-b from-secondary to-secondary-dark rounded-full"></div>
    <h2 class="font-display text-2xl font-semibold text-gray-800">
      {filteredSponsors.length} Sponsor{filteredSponsors.length !== 1 ? 's' : ''}
    </h2>
  </div>

  {#if loading}
    <div class="text-center py-16">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p class="mt-4 text-gray-500">Loading sponsors...</p>
    </div>
  {:else if filteredSponsors.length === 0}
    <div class="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <div class="text-6xl mb-4">🔍</div>
      <h3 class="font-display text-xl font-semibold text-gray-800 mb-2">No sponsors found</h3>
      <p class="text-gray-500">Try adjusting your search or filter criteria.</p>
    </div>
  {:else}
    <!-- Sponsor Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each filteredSponsors as sponsor, index}
        {@const primaryCategory = sponsor.category?.[0] || 'Other'}
        {@const colors = getCategoryColor(primaryCategory)}
        <button
          on:click={() => handleSponsorClick(sponsor)}
          class="card-hover group relative bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer text-left"
          style="animation-delay: {index * 0.05}s"
        >
          <!-- Decorative top gradient -->
          <div class="h-1.5 bg-gradient-to-r {colors.gradient}"></div>
          
          <div class="p-6">
            <!-- Logo / Initial -->
            <div class="relative mb-5">
              <div class="w-16 h-16 rounded-2xl {colors.bg} {colors.border} border-2 flex items-center justify-center transition-transform group-hover:scale-110 overflow-hidden">
                {#if sponsor.logo_url}
                  <img src={sponsor.logo_url} alt={sponsor.name} class="w-full h-full object-contain p-2" />
                {:else}
                  <span class="font-display font-bold text-2xl {colors.text}">
                    {sponsor.name.charAt(0)}
                  </span>
                {/if}
              </div>
              
              <!-- Hover effect ring -->
              <div class="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-transparent group-hover:border-secondary/50 transition-all scale-110 opacity-0 group-hover:opacity-100"></div>
            </div>
            
            <!-- Content -->
            <h3 class="font-display font-semibold text-lg text-gray-900 mb-1 group-hover:text-primary transition-colors">
              {sponsor.name}
            </h3>
            
            {#if sponsor.tagline}
              <p class="text-sm text-gray-500 mb-3 line-clamp-2">{sponsor.tagline}</p>
            {/if}
            
            <!-- Categories -->
            {#if sponsor.category && sponsor.category.length > 0}
              <div class="flex flex-wrap gap-1.5 mb-4">
                {#each sponsor.category.slice(0, 2) as cat}
                  {@const catColors = getCategoryColor(cat)}
                  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium {catColors.bg} {catColors.text}">
                    {cat}
                  </span>
                {/each}
                {#if sponsor.category.length > 2}
                  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                    +{sponsor.category.length - 2}
                  </span>
                {/if}
              </div>
            {/if}
            
            <!-- View offers link -->
            <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-sm text-gray-500">View offers</span>
              <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-secondary group-hover:text-primary transition-all transform group-hover:translate-x-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Stats Section -->
  <section class="mt-20 py-12 px-8 bg-gradient-to-br from-primary to-primary-dark rounded-3xl relative overflow-hidden">
    <div class="absolute inset-0 noise-overlay"></div>
    <div class="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
    
    <div class="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div>
        <div class="font-display text-4xl font-bold text-secondary mb-2">{sponsors.length}</div>
        <div class="text-white/70 text-sm">Active Sponsors</div>
      </div>
      <div>
        <div class="font-display text-4xl font-bold text-secondary mb-2">50+</div>
        <div class="text-white/70 text-sm">Exclusive Offers</div>
      </div>
      <div>
        <div class="font-display text-4xl font-bold text-secondary mb-2">850+</div>
        <div class="text-white/70 text-sm">Club Members</div>
      </div>
      <div>
        <div class="font-display text-4xl font-bold text-secondary mb-2">$15K+</div>
        <div class="text-white/70 text-sm">Saved by Members</div>
      </div>
    </div>
  </section>
</main>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
