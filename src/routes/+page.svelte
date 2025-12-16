<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { formatDate } from '$lib/utils/formatters';
  import type { Database } from '$lib/types/database.types';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];
  type Promotion = Database['public']['Tables']['promotions']['Row'] & {
    sponsor?: Sponsor;
  };

  let sponsors: Sponsor[] = [];
  let featuredPromotion: Promotion | null = null;
  let loading = true;

  const supabase = createClient();

  // Category colors
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

  onMount(async () => {
    try {
      // Fetch active sponsors
      const { data: sponsorsData, error: sponsorsError } = await supabase
        .from('sponsors')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (sponsorsError) {
        console.error('Error fetching sponsors:', sponsorsError.message, sponsorsError);
      } else if (sponsorsData) {
        sponsors = sponsorsData;
      }

      // Fetch featured promotion with sponsor info
      const now = new Date().toISOString();
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*, sponsor:sponsors(*)')
        .eq('is_featured', true)
        .eq('status', 'active')
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!promotionsError && promotionsData) {
        featuredPromotion = promotionsData;
      }
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      loading = false;
    }
  });

  function handleSponsorClick(sponsor: Sponsor) {
    goto(`/sponsors/${sponsor.slug}`);
  }

  function getTimeUntilEnd(endDate: string | null): string {
    if (!endDate) return '';
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days === 0) return 'Ends today';
    if (days === 1) return 'Ends tomorrow';
    if (days < 7) return `${days} days left`;
    if (days < 30) return `${Math.floor(days / 7)} weeks left`;
    return `${Math.floor(days / 30)} months left`;
  }
</script>

<svelte:head>
  <title>BBC Sponsor App - Home</title>
  <meta name="description" content="Discover sponsor offers and promotions from Berkeley Bicycle Club partners" />
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
        Berkeley Bicycle Club<br />
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
  
  {#if loading}
    <div class="text-center py-16">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p class="mt-4 text-gray-500">Loading...</p>
    </div>
  {:else}
    <!-- Featured Offer -->
    {#if featuredPromotion}
      <section class="mb-16">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-1 h-6 bg-gradient-to-b from-secondary to-secondary-dark rounded-full"></div>
          <h2 class="font-display text-2xl font-semibold text-gray-800">Featured Offer</h2>
        </div>
        
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-light to-primary p-1">
          <div class="absolute inset-0 bg-gradient-to-r from-secondary/20 via-transparent to-secondary/20"></div>
          <div class="relative bg-primary rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
            
            <!-- Image/Logo area -->
            <div class="relative w-48 h-48 flex-shrink-0">
              <div class="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary-dark rounded-2xl"></div>
              <div class="absolute inset-0 flex items-center justify-center p-4">
                {#if featuredPromotion.image_url}
                  <img src={featuredPromotion.image_url} alt={featuredPromotion.title} class="max-w-full max-h-full object-contain rounded-lg" />
                {:else if featuredPromotion.sponsor?.logo_url}
                  <img src={featuredPromotion.sponsor.logo_url} alt={featuredPromotion.sponsor?.name} class="max-w-full max-h-full object-contain" />
                {:else}
                  <span class="text-6xl">🎉</span>
                {/if}
              </div>
              <div class="absolute -top-2 -right-2 px-3 py-1 bg-secondary rounded-full text-xs font-semibold text-primary">
                EXCLUSIVE
              </div>
            </div>
            
            <!-- Content -->
            <div class="flex-1 text-center md:text-left">
              {#if featuredPromotion.end_date}
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-medium mb-4">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(featuredPromotion.end_date)} • {getTimeUntilEnd(featuredPromotion.end_date)}
                </div>
              {/if}
              
              <h3 class="font-display text-2xl md:text-3xl font-bold text-white mb-2">
                {featuredPromotion.title}
              </h3>
              {#if featuredPromotion.sponsor}
                <p class="text-secondary font-medium mb-4">from {featuredPromotion.sponsor.name}</p>
              {/if}
              <div class="text-white/70 mb-8 max-w-lg prose prose-invert prose-sm">
                {@html featuredPromotion.description}
              </div>
              
              <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a 
                  href="/sponsors/{featuredPromotion.sponsor?.slug}"
                  class="px-6 py-3 bg-gradient-to-r from-secondary to-secondary-dark text-primary font-semibold rounded-xl hover:from-secondary-light hover:to-secondary transition-all shadow-lg shadow-secondary/25"
                >
                  View Details
                </a>
                {#if featuredPromotion.coupon_code}
                  <div class="px-6 py-3 border border-white/20 text-white font-medium rounded-xl bg-white/5">
                    Code: <span class="font-bold">{featuredPromotion.coupon_code}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </section>
    {/if}

    <!-- All Sponsors -->
    <section>
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <div class="w-1 h-6 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
          <h2 class="font-display text-2xl font-semibold text-gray-800">All Sponsors</h2>
        </div>
        
        <a 
          href="/sponsors" 
          class="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          View All →
        </a>
      </div>

      {#if sponsors.length === 0}
        <div class="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div class="text-6xl mb-4">🏪</div>
          <h3 class="font-display text-xl font-semibold text-gray-800 mb-2">No sponsors yet</h3>
          <p class="text-gray-500">Check back soon for exclusive sponsor offers.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each sponsors.slice(0, 8) as sponsor, index}
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
                  <div class="flex flex-wrap gap-1.5">
                    {#each sponsor.category.slice(0, 2) as cat}
                      {@const catColors = getCategoryColor(cat)}
                      <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium {catColors.bg} {catColors.text}">
                        {cat}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>
            </button>
          {/each}
        </div>

        {#if sponsors.length > 8}
          <div class="text-center mt-10">
            <a 
              href="/sponsors" 
              class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-light transition-all shadow-lg"
            >
              View All {sponsors.length} Sponsors
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        {/if}
      {/if}
    </section>

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
  {/if}
</main>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .prose-invert {
    --tw-prose-body: rgba(255, 255, 255, 0.7);
    --tw-prose-links: #FDB515;
  }
</style>
