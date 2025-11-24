<script lang="ts">
  import type { Database } from '$lib/types/database.types';
  import { goto } from '$app/navigation';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  export let sponsor: Sponsor;

  function handleClick() {
    goto(`/sponsors/${sponsor.slug}`);
  }
</script>

<button
  on:click={handleClick}
  class="card hover:shadow-lg transition-shadow cursor-pointer text-left w-full group"
>
  <div class="flex flex-col items-center">
    {#if sponsor.logo_url}
      <img
        src={sponsor.logo_url}
        alt={sponsor.name}
        class="w-32 h-32 object-contain mb-4"
      />
    {:else}
      <div class="w-32 h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
        <span class="text-gray-400 text-2xl">{sponsor.name.charAt(0)}</span>
      </div>
    {/if}

    <h3 class="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
      {sponsor.name}
    </h3>

    {#if sponsor.tagline}
      <p class="text-sm text-gray-600 text-center mb-3">{sponsor.tagline}</p>
    {/if}

    {#if sponsor.category.length > 0}
      <div class="flex flex-wrap gap-2 justify-center">
        {#each sponsor.category as cat}
          <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{cat}</span>
        {/each}
      </div>
    {/if}
  </div>
</button>

