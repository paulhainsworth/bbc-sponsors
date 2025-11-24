<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';
  import { goto } from '$app/navigation';
  import { formatDate } from '$lib/utils/formatters';

  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  let sponsors: Sponsor[] = [];
  let loading = true;
  let searchQuery = '';

  const supabase = createClient();

  $: filteredSponsors = sponsors.filter((sponsor) =>
    sponsor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  onMount(async () => {
    await loadSponsors();
  });

  async function loadSponsors() {
    const { data: sponsorsData } = await supabase
      .from('sponsors')
      .select('*')
      .order('name');

    if (sponsorsData) {
      sponsors = sponsorsData;
    }

    loading = false;
  }

  async function toggleStatus(sponsor: Sponsor) {
    const newStatus = sponsor.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('sponsors')
      .update({ status: newStatus })
      .eq('id', sponsor.id);

    if (!error) {
      await loadSponsors();
    }
  }

  async function deleteSponsor(sponsor: Sponsor) {
    if (!confirm(`Are you sure you want to delete ${sponsor.name}? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase.from('sponsors').delete().eq('id', sponsor.id);

    if (!error) {
      await loadSponsors();
    }
  }
</script>

<svelte:head>
  <title>Manage Sponsors - Admin</title>
</svelte:head>

<div>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold">Manage Sponsors</h1>
    <a
      href="/admin/sponsors/new"
      class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
    >
      + Add New Sponsor
    </a>
  </div>

  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="mb-4">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search sponsors..."
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    {:else if filteredSponsors.length === 0}
      <div class="text-center py-12 text-gray-500">
        <p>No sponsors found.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-3 px-4 font-semibold">Logo</th>
              <th class="text-left py-3 px-4 font-semibold">Name</th>
              <th class="text-left py-3 px-4 font-semibold">Category</th>
              <th class="text-left py-3 px-4 font-semibold">Status</th>
              <th class="text-left py-3 px-4 font-semibold">Updated</th>
              <th class="text-right py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredSponsors as sponsor (sponsor.id)}
              <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4">
                  {#if sponsor.logo_url}
                    <img src={sponsor.logo_url} alt={sponsor.name} class="w-12 h-12 object-contain" />
                  {:else}
                    <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <span class="text-gray-400">{sponsor.name.charAt(0)}</span>
                    </div>
                  {/if}
                </td>
                <td class="py-3 px-4">
                  <a
                    href="/sponsors/{sponsor.slug}"
                    target="_blank"
                    class="text-primary hover:underline font-medium"
                  >
                    {sponsor.name}
                  </a>
                </td>
                <td class="py-3 px-4">
                  {#if sponsor.category && sponsor.category.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each sponsor.category.slice(0, 2) as cat}
                        <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{cat}</span>
                      {/each}
                    </div>
                  {/if}
                </td>
                <td class="py-3 px-4">
                  <span
                    class="px-2 py-1 rounded text-xs font-semibold {sponsor.status === 'active'
                      ? 'bg-success text-white'
                      : sponsor.status === 'pending'
                        ? 'bg-warning text-white'
                        : 'bg-gray-300 text-gray-700'}"
                  >
                    {sponsor.status}
                  </span>
                </td>
                <td class="py-3 px-4 text-sm text-gray-600">
                  {formatDate(sponsor.updated_at)}
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      on:click={() => goto(`/admin/sponsors/${sponsor.id}`)}
                      class="text-primary hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      on:click={() => toggleStatus(sponsor)}
                      class="text-warning hover:underline text-sm"
                    >
                      {sponsor.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      on:click={() => deleteSponsor(sponsor)}
                      class="text-error hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

