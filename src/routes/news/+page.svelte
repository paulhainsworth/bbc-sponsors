<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';
  import { formatDate } from '$lib/utils/formatters';
  import { goto } from '$app/navigation';

  type BlogPost = Database['public']['Tables']['blog_posts']['Row'];

  let posts: BlogPost[] = [];
  let loading = true;

  const supabase = createClient();

  onMount(async () => {
    const { data: postsData } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (postsData) {
      posts = postsData;
    }

    loading = false;
  });
</script>

<svelte:head>
  <title>Sponsor News - BBC Sponsors</title>
  <meta name="description" content="Latest news and updates from Berkeley Bicycle Club sponsors" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-primary mb-4">Sponsor News</h1>
    <p class="text-xl text-gray-600">Stay updated with the latest from our sponsors</p>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if posts.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-500">No news posts available at this time.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each posts as post (post.id)}
        <article
          class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          on:click={() => goto(`/news/${post.slug}`)}
          role="button"
          tabindex="0"
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              goto(`/news/${post.slug}`);
            }
          }}
        >
          {#if post.featured_image_url}
            <img
              src={post.featured_image_url}
              alt={post.title}
              class="w-full h-48 object-cover"
            />
          {/if}
          <div class="p-6">
            <h2 class="text-xl font-semibold mb-2 hover:text-primary transition-colors">
              {post.title}
            </h2>
            {#if post.excerpt}
              <p class="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
            {:else}
              <p class="text-gray-600 mb-4 line-clamp-3">
                {@html post.content.substring(0, 200).replace(/<[^>]*>/g, '')}...
              </p>
            {/if}
            {#if post.published_at}
              <p class="text-sm text-gray-500">{formatDate(post.published_at)}</p>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

