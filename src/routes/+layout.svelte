<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import Header from '$lib/components/common/Header.svelte';
  import Footer from '$lib/components/common/Footer.svelte';

  const supabase = createClient();

  onMount(async () => {
    try {
      // Wait for Supabase client to be ready and localStorage to be accessible
      // This is especially important in test environments where storageState is restored
      // Check if localStorage has a session before calling getSession()
      const projectRef = typeof window !== 'undefined' 
        ? (window.location.hostname.includes('localhost') ? 'uibbpcbshfkjcsnoscup' : null)
        : null;
      
      if (projectRef && typeof window !== 'undefined') {
        const storageKey = `sb-${projectRef}-auth-token`;
        let attempts = 0;
        
        // Wait for session to be in localStorage (up to 2 seconds)
        while (attempts < 10) {
          const sessionData = localStorage.getItem(storageKey);
          if (sessionData) break;
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
      }
      
      // Small delay to ensure Supabase client has initialized
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get initial session - retry if needed (for test environments)
      let session = null;
      let sessionError = null;
      let attempts = 0;
      
      while (attempts < 5) {
        const result = await supabase.auth.getSession();
        session = result.data?.session;
        sessionError = result.error;
        
        if (session || sessionError) break;
        
        // If no session and no error, wait a bit and retry (client might still be reading)
        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
      }
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        userStore.setUser(null);
        userStore.setProfile(null);
        userStore.setLoading(false);
        return;
      }

      if (session?.user) {
        userStore.setUser(session.user);
        
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          // Profile might not exist yet, that's okay
          console.log('Profile not found:', profileError.message);
          userStore.setProfile(null);
        } else {
          userStore.setProfile(profile);
        }
      } else {
        // No session, set both to null and mark as not loading
        userStore.setUser(null);
        userStore.setProfile(null);
      }

      // Mark loading as complete
      userStore.setLoading(false);

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        userStore.setUser(session?.user ?? null);

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profileError && profile) {
            userStore.setProfile(profile);
          }
        } else {
          userStore.setProfile(null);
        }
      });
    } catch (error) {
      console.error('Layout initialization error:', error);
      userStore.setLoading(false);
    }
  });
</script>

<div class="min-h-screen flex flex-col">
  <Header />
  <main class="flex-grow">
    <slot />
  </main>
  <Footer />
</div>

