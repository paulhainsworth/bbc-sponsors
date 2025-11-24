<script lang="ts">
  import { onMount } from 'svelte';
  import type { Database } from '$lib/types/database.types';
  import { formatExpirationDate } from '$lib/utils/formatters';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';

  type Promotion = Database['public']['Tables']['promotions']['Row'];

  export let promotions: Promotion[] = [];

  const supabase = createClient();
  let currentIndex = 0;
  let autoplayInterval: ReturnType<typeof setInterval>;
  let sponsorSlugs: Record<string, string> = {};

  onMount(async () => {
    // Fetch sponsor slugs for promotions
    if (promotions.length > 0) {
      const sponsorIds = [...new Set(promotions.map((p) => p.sponsor_id))];
      const { data: sponsorsData } = await supabase
        .from('sponsors')
        .select('id, slug')
        .in('id', sponsorIds);

      if (sponsorsData) {
        sponsorSlugs = Object.fromEntries(sponsorsData.map((s) => [s.id, s.slug]));
      }
    }

    if (promotions.length > 1) {
      autoplayInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % promotions.length;
      }, 5000);
    }

    return () => {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
      }
    };
  });

  function handlePromotionClick(promotion: Promotion) {
    const slug = sponsorSlugs[promotion.sponsor_id];
    if (slug) {
      goto(`/sponsors/${slug}`);
    } else if (promotion.external_link) {
      window.open(promotion.external_link, '_blank');
    }
  }

  function goToSlide(index: number) {
    currentIndex = index;
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      if (promotions.length > 1) {
        autoplayInterval = setInterval(() => {
          currentIndex = (currentIndex + 1) % promotions.length;
        }, 5000);
      }
    }
  }
</script>

{#if promotions.length > 0}
  <div class="relative" on:mouseenter={() => { if (autoplayInterval) clearInterval(autoplayInterval); }} on:mouseleave={() => {
    if (promotions.length > 1) {
      autoplayInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % promotions.length;
      }, 5000);
    }
  }}>
    <div class="overflow-hidden rounded-lg">
      <div class="flex transition-transform duration-500 ease-in-out" style="transform: translateX(-{currentIndex * 100}%)">
        {#each promotions as promotion (promotion.id)}
          <div class="min-w-full flex-shrink-0">
            <div class="card bg-gradient-to-r from-primary to-primary-dark text-white">
              <div class="flex flex-col md:flex-row items-center gap-6">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="bg-secondary text-gray-900 px-2 py-1 rounded text-sm font-semibold">
                      Featured
                    </span>
                    {#if promotion.end_date}
                      <span class="text-sm opacity-90">
                        {formatExpirationDate(promotion.end_date)}
                      </span>
                    {/if}
                  </div>
                  <h3 class="text-2xl font-bold mb-2">{promotion.title}</h3>
                  <p class="text-white/90 mb-4 line-clamp-2">{promotion.description}</p>
                  {#if promotion.coupon_code}
                    <div class="flex items-center gap-2 mb-4">
                      <span class="font-mono bg-white/20 px-3 py-1 rounded">
                        {promotion.coupon_code}
                      </span>
                      <button
                        class="text-sm underline hover:no-underline"
                        on:click|stopPropagation={() => {
                          navigator.clipboard.writeText(promotion.coupon_code || '');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  {/if}
                  <button
                    class="btn btn-secondary"
                    on:click={() => handlePromotionClick(promotion)}
                  >
                    {promotion.external_link ? 'Shop Now' : 'View Details'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    {#if promotions.length > 1}
      <div class="flex justify-center gap-2 mt-4">
        {#each promotions as _, i}
          <button
            class="w-2 h-2 rounded-full {i === currentIndex ? 'bg-primary' : 'bg-gray-300'}"
            on:click={() => goToSlide(i)}
          ></button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
