<script lang="ts">
  import { page } from '$app/stores';
  import { userStore } from '$lib/stores/user';
  import { goto } from '$app/navigation';

  $: isAdmin = $userStore.profile?.role === 'super_admin';
  $: isSponsorAdmin = $userStore.profile?.role === 'sponsor_admin';
  $: isLoading = $userStore.loading;
  $: isAuthenticated = !!$userStore.user;
  $: currentPath = $page.url.pathname;
  
  let sponsorName: string | null = null;
  let sponsorNameLoading = false;
  let sponsorNameLoaded = false;

  // Extract first name from display_name or email
  $: firstName = $userStore.profile?.display_name
    ? $userStore.profile.display_name.split(' ')[0]
    : $userStore.user?.email?.split('@')[0] || 'User';

  // Fetch sponsor name for sponsor admins (only once when authenticated and loaded)
  $: if (isSponsorAdmin && isAuthenticated && !isLoading && !sponsorNameLoaded && !sponsorNameLoading) {
    loadSponsorName();
  }

  async function loadSponsorName() {
    if (!isSponsorAdmin || sponsorNameLoading || sponsorNameLoaded) return;
    
    sponsorNameLoading = true;
    try {
      const response = await fetch('/api/sponsor-admin/get-sponsor');
      const result = await response.json();
      
      if (result.success && result.sponsorName) {
        sponsorName = result.sponsorName;
      }
      sponsorNameLoaded = true;
    } catch (error) {
      console.error('Error loading sponsor name:', error);
      sponsorNameLoaded = true;
    } finally {
      sponsorNameLoading = false;
    }
  }

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }
</script>

<header class="bg-gradient-to-r from-primary via-primary to-primary-light text-white shadow-lg relative overflow-hidden">
  <div class="absolute inset-0 noise-overlay"></div>
  
  <div class="container mx-auto px-4 py-4 relative z-10">
    <div class="flex items-center justify-between">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-secondary-dark flex items-center justify-center shadow-lg">
          <span class="text-primary font-bold text-sm">BBC</span>
        </div>
        <span class="font-display font-semibold text-xl tracking-tight hidden sm:block">Berkeley Bicycle Club</span>
      </a>

      <!-- Navigation -->
      <nav class="flex items-center gap-2 md:gap-6">
        <a 
          href="/" 
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all {isActive('/') && currentPath === '/' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}"
        >
          Home
        </a>
        <a 
          href="/sponsors" 
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all {isActive('/sponsors') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}"
        >
          Sponsors
        </a>
        <a 
          href="/news" 
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all {isActive('/news') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}"
        >
          News
        </a>

        {#if isLoading}
          <span class="w-8 h-8 rounded-full bg-white/10 animate-pulse"></span>
        {:else if isAuthenticated}
          <!-- User Menu -->
          <div class="flex items-center gap-3 ml-2 pl-4 border-l border-white/20">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span class="text-xs font-medium">{firstName.charAt(0).toUpperCase()}</span>
              </div>
              <div class="hidden md:block text-sm">
                <span class="text-white/90">{firstName}</span>
                {#if isSponsorAdmin && sponsorName}
                  <span class="text-white/50 text-xs block">Managing {sponsorName}</span>
                {/if}
              </div>
            </div>
            
            {#if isAdmin}
              <a 
                href="/admin" 
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary text-primary hover:bg-secondary-light transition-all"
              >
                Admin
              </a>
            {:else if isSponsorAdmin}
              <a 
                href="/sponsor-admin" 
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary text-primary hover:bg-secondary-light transition-all"
              >
                Dashboard
              </a>
            {/if}
            
            <button
              on:click={async () => {
                const { createClient } = await import('$lib/utils/supabase');
                const supabase = createClient();
                await supabase.auth.signOut();
                userStore.reset();
                goto('/');
              }}
              class="px-3 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              Sign Out
            </button>
          </div>
        {:else}
          <a 
            href="/auth/login" 
            class="ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-primary hover:bg-secondary-light transition-all shadow-md"
          >
            Sign In
          </a>
        {/if}
      </nav>
    </div>
  </div>
</header>
