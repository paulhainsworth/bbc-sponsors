<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import { goto } from '$app/navigation';

  let stats = {
    totalSponsors: 0,
    activeSponsors: 0,
    totalPromotions: 0,
    activePromotions: 0,
    featuredPromotions: 0,
    publishedPosts: 0
  };
  let loading = true;

  const supabase = createClient();

  onMount(async () => {
    // Fetch statistics
    const [sponsorsResult, promotionsResult, postsResult] = await Promise.all([
      supabase.from('sponsors').select('id, status', { count: 'exact' }),
      supabase
        .from('promotions')
        .select('id, status, is_featured', { count: 'exact' })
        .eq('status', 'active'),
      supabase.from('blog_posts').select('id', { count: 'exact' }).eq('status', 'published')
    ]);

    if (sponsorsResult.data) {
      stats.totalSponsors = sponsorsResult.count || 0;
      stats.activeSponsors = sponsorsResult.data.filter((s) => s.status === 'active').length;
    }

    if (promotionsResult.data) {
      stats.totalPromotions = promotionsResult.count || 0;
      stats.activePromotions = promotionsResult.data.length;
      stats.featuredPromotions = promotionsResult.data.filter((p) => p.is_featured).length;
    }

    if (postsResult.data) {
      stats.publishedPosts = postsResult.count || 0;
    }

    loading = false;
  });
</script>

<svelte:head>
  <title>Admin Dashboard - BBC Sponsors</title>
</svelte:head>

<div>
  <h1 class="text-3xl font-bold mb-8">Admin Dashboard</h1>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else}
    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Total Sponsors</h3>
        <p class="text-3xl font-bold text-primary">{stats.totalSponsors}</p>
        <p class="text-sm text-gray-500 mt-2">{stats.activeSponsors} active</p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Active Promotions</h3>
        <p class="text-3xl font-bold text-primary">{stats.activePromotions}</p>
        <p class="text-sm text-gray-500 mt-2">{stats.featuredPromotions} featured</p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Published Posts</h3>
        <p class="text-3xl font-bold text-primary">{stats.publishedPosts}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="/admin/sponsors/new"
          class="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-center"
        >
          Add New Sponsor
        </a>
        <a
          href="/admin/posts/new"
          class="px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors text-center"
        >
          Create Blog Post
        </a>
        <a
          href="/admin/admins"
          class="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-center"
        >
          Manage Admins
        </a>
        <a
          href="/admin/settings"
          class="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-center"
        >
          Settings
        </a>
      </div>
    </div>
  {/if}
</div>

