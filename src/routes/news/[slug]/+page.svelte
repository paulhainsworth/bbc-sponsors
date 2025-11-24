<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { createClient } from '$lib/utils/supabase';
  import type { Database } from '$lib/types/database.types';
  import { formatDate } from '$lib/utils/formatters';

  type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

  let post: BlogPost | null = null;
  let relatedSponsors: Sponsor[] = [];
  let loading = true;
  let error: string | null = null;

  const supabase = createClient();

  $: slug = $page.params.slug;

  onMount(async () => {
    const { data: postData, error: postError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (postError || !postData) {
      error = 'Post not found';
      loading = false;
      return;
    }

    post = postData;

    // Fetch related sponsors
    const { data: sponsorIds } = await supabase
      .from('blog_post_sponsors')
      .select('sponsor_id')
      .eq('post_id', post.id);

    if (sponsorIds && sponsorIds.length > 0) {
      const ids = sponsorIds.map((s) => s.sponsor_id);
      const { data: sponsorsData } = await supabase
        .from('sponsors')
        .select('*')
        .in('id', ids)
        .eq('status', 'active');

      if (sponsorsData) {
        relatedSponsors = sponsorsData;
      }
    }

    loading = false;
  });
</script>

<svelte:head>
  <title>{post?.title || 'Post'} - BBC Sponsor News</title>
  <meta name="description" content={post?.excerpt || ''} />
</svelte:head>

{#if loading}
  <div class="container mx-auto px-4 py-12">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  </div>
{:else if error || !post}
  <div class="container mx-auto px-4 py-12">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Post Not Found</h1>
      <p class="text-gray-600 mb-6">{error || 'The post you are looking for does not exist.'}</p>
      <a href="/news" class="text-primary hover:underline">Return to News</a>
    </div>
  </div>
{:else}
  <article class="container mx-auto px-4 py-8 max-w-4xl">
    <a href="/news" class="text-primary hover:underline mb-6 inline-block">← Back to News</a>

    {#if post.featured_image_url}
      <img
        src={post.featured_image_url}
        alt={post.title}
        class="w-full h-64 md:h-96 object-cover rounded-lg mb-8"
      />
    {/if}

    <header class="mb-8">
      <h1 class="text-4xl font-bold mb-4">{post.title}</h1>
      {#if post.published_at}
        <p class="text-gray-600">{formatDate(post.published_at)}</p>
      {/if}
    </header>

    <div class="prose max-w-none mb-8">
      {@html post.content}
    </div>

    {#if relatedSponsors.length > 0}
      <section class="mt-12 pt-8 border-t border-gray-200">
        <h2 class="text-2xl font-semibold mb-4">Related Sponsors</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each relatedSponsors as sponsor}
            <a
              href="/sponsors/{sponsor.slug}"
              class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              {#if sponsor.logo_url}
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  class="w-16 h-16 object-contain mb-2"
                />
              {/if}
              <h3 class="font-semibold">{sponsor.name}</h3>
              {#if sponsor.tagline}
                <p class="text-sm text-gray-600">{sponsor.tagline}</p>
              {/if}
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </article>
{/if}

