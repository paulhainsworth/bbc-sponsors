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
      // Get initial session
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }

      userStore.setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          // Profile might not exist yet, that's okay
          console.log('Profile not found:', profileError.message);
        } else {
          userStore.setProfile(profile);
        }
      }

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

