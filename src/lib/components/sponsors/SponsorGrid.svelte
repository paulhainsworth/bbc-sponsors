<script lang="ts">
  import type { Database } from '$lib/types/database.types';
  import SponsorCard from './SponsorCard.svelte';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  export let sponsors: Sponsor[] = [];
</script>

{#if sponsors.length === 0}
  <div class="text-center py-12 text-gray-500">
    <p>No sponsors available at this time.</p>
  </div>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {#each sponsors as sponsor (sponsor.id)}
      <SponsorCard {sponsor} />
    {/each}
  </div>
{/if}

