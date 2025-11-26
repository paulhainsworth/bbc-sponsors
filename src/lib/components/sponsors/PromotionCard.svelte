<script lang="ts">
  import { format, formatDistanceToNow } from 'date-fns';
  import type { Database } from '$lib/types/database.types';
  import { PUBLIC_APP_URL } from '$env/static/public';

  type Promotion = Database['public']['Tables']['promotions']['Row'];
  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  export let promotion: Promotion;
  export let sponsor: Sponsor;

  let copied = false;

  function copyCouponCode(code: string) {
    navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function getPromotionUrl() {
    return `${PUBLIC_APP_URL}/sponsors/${sponsor.slug}/promotions/${promotion.id}`;
  }

  $: isExpiringSoon = promotion.end_date
    ? new Date(promotion.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;
  $: daysRemaining = promotion.end_date
    ? formatDistanceToNow(new Date(promotion.end_date), { addSuffix: true })
    : null;
</script>

<div class="bg-white rounded-lg shadow-md p-6 border-l-4 {promotion.is_featured ? 'border-secondary' : 'border-primary'}">
  <div class="flex items-start justify-between mb-4">
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-2">
        {#if promotion.is_featured}
          <span class="px-2 py-1 bg-secondary text-white text-xs font-semibold rounded">Featured</span>
        {/if}
        {#if isExpiringSoon && promotion.end_date}
          <span class="px-2 py-1 bg-warning text-white text-xs font-semibold rounded">
            Expires {daysRemaining}
          </span>
        {/if}
      </div>
      <h3 class="text-xl font-semibold mb-2">{promotion.title}</h3>
    </div>
  </div>

  <div class="prose max-w-none mb-4">
    {@html promotion.description}
  </div>

  {#if promotion.coupon_code}
    <div class="mb-4 p-3 bg-gray-50 rounded border border-dashed border-gray-300">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm text-gray-600">Coupon Code:</span>
          <code class="block mt-1 font-mono text-lg font-bold text-primary">{promotion.coupon_code}</code>
        </div>
        <button
          on:click={() => copyCouponCode(promotion.coupon_code || '')}
          class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-light transition-colors text-sm"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  {/if}

  {#if promotion.terms}
    <details class="mb-4">
      <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">Terms & Conditions</summary>
      <p class="mt-2 text-sm text-gray-700 whitespace-pre-line">{promotion.terms}</p>
    </details>
  {/if}

  <div class="flex items-center justify-between">
    <div class="text-sm text-gray-600">
      {#if promotion.end_date}
        Valid until {format(new Date(promotion.end_date), 'MMM d, yyyy')}
      {:else}
        Ongoing offer
      {/if}
    </div>
    <div class="flex gap-2">
      {#if promotion.external_link}
        <a
          href={promotion.external_link}
          target="_blank"
          rel="noopener noreferrer"
          class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-light transition-colors"
        >
          Shop Now →
        </a>
      {:else}
        <a
          href={getPromotionUrl()}
          class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-light transition-colors"
        >
          View Details →
        </a>
      {/if}
    </div>
  </div>
</div>

