<script lang="ts">
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/user';
  import { createClient } from '$lib/utils/supabase';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  let sponsorId: string | null = null;
  let sponsorSlug: string | null = null;
  let sponsorLoading = false;
  let sponsorLoaded = false;
  let sponsorError: string | null = null;

  const supabase = createClient();

  // Use reactive statement to check auth when store finishes loading
  // Only redirect if we're not already on the target page
  $: if (browser && !$userStore.loading) {
    const currentPath = $page.url.pathname;
    
    if (!$userStore.profile) {
      if (!currentPath.startsWith('/auth/login')) {
        goto('/auth/login?redirect=/sponsor-admin');
      }
    } else if ($userStore.profile.role !== 'sponsor_admin') {
      if (currentPath.startsWith('/sponsor-admin')) {
        goto('/');
      }
    }
  }

  // Fetch sponsor when profile is available (only once)
  $: if ($userStore.profile?.role === 'sponsor_admin' && !sponsorLoading && !sponsorId && !sponsorLoaded) {
    sponsorLoaded = true;
    loadSponsor();
  }

  async function loadSponsor() {
    if (!$userStore.profile) return;
    
    sponsorLoading = true;
    sponsorError = null;
    
    // First, verify the user has a profile with sponsor_admin role
    if ($userStore.profile.role !== 'sponsor_admin') {
      console.error('User is not a sponsor_admin:', $userStore.profile);
      sponsorError = 'User is not a sponsor admin.';
      sponsorLoading = false;
      return;
    }
    
    // Use server-side API endpoint to bypass RLS issues
    // This ensures we can always get the sponsor ID if it exists in the database
    try {
      console.log('Fetching sponsor via API endpoint...');
      console.log('User profile:', {
        id: $userStore.profile.id,
        email: $userStore.profile.email,
        role: $userStore.profile.role
      });
      
      const response = await fetch('/api/sponsor-admin/get-sponsor');
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
      
      const result = await response.json();
      console.log('API result:', result);
      
      if (!result.success) {
        console.error('API error:', result.error);
        console.error('Full API response:', result);
        sponsorError = result.error || 'No sponsor associated with your account. Please contact an administrator.';
        sponsorLoading = false;
        return;
      }
      
              if (result.sponsorId) {
                sponsorId = result.sponsorId;
                sponsorSlug = result.sponsorSlug || null;
                console.log('✅ Sponsor loaded successfully via API:', result.sponsorId, result.sponsorName);
                
                // If slug is not returned, fetch it
                if (!sponsorSlug && sponsorId) {
                  const { data: sponsorData } = await supabase
                    .from('sponsors')
                    .select('slug')
                    .eq('id', sponsorId)
                    .single();
                  if (sponsorData) {
                    sponsorSlug = sponsorData.slug;
                  }
                }
              } else {
                console.error('API returned success but no sponsorId:', result);
                sponsorError = 'No sponsor associated with your account. Please contact an administrator.';
              }
    } catch (error: any) {
      console.error('Error fetching sponsor via API:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      sponsorError = 'Failed to load sponsor. Please try refreshing the page.';
    }
    
    sponsorLoading = false;
  }

  // Loading state is true while:
  // - Store is loading
  // - We don't have a profile yet (but store finished loading)
  // - Profile doesn't have the right role (but store finished loading)
  // - We're loading sponsor data
  $: loading = $userStore.loading || 
               (!$userStore.profile && !$userStore.loading) || 
               ($userStore.profile && $userStore.profile.role !== 'sponsor_admin') ||
               sponsorLoading;
</script>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
{:else if sponsorError}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-warning/20 border border-warning rounded-lg p-6 text-center max-w-md">
      <p class="text-warning text-lg font-semibold mb-4">Error</p>
      <p class="text-warning">{sponsorError}</p>
      <a href="/" class="mt-4 inline-block text-primary hover:underline">Return to Home</a>
    </div>
  </div>
{:else if $userStore.profile?.role === 'sponsor_admin'}
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-primary text-white shadow-md">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <a href="/sponsor-admin" class="text-2xl font-bold hover:opacity-80 transition-opacity">
              Sponsor Dashboard
            </a>
            <div class="flex gap-4">
              <a href="/sponsor-admin" class="hover:opacity-80 transition-opacity">Dashboard</a>
              <a href="/sponsor-admin/profile" class="hover:opacity-80 transition-opacity">Profile</a>
              <a href="/sponsor-admin/promotions" class="hover:opacity-80 transition-opacity"
                >Promotions</a
              >
              <a href="/sponsor-admin/team" class="hover:opacity-80 transition-opacity">Team</a>
            </div>
          </div>
                  <div class="flex items-center gap-4">
                    {#if sponsorSlug}
                      <a href="/sponsors/{sponsorSlug}" class="hover:opacity-80 transition-opacity">View Page</a>
                    {/if}
            <button
              on:click={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                userStore.reset();
                goto('/');
              }}
              class="hover:opacity-80 transition-opacity"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
{/if}
