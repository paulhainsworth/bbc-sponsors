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
      // Extract project ref from Supabase URL dynamically
      let projectRef: string | null = null;
      if (typeof window !== 'undefined') {
        // Try to extract from localStorage keys (Supabase sets keys like sb-{projectRef}-auth-token)
        const storageKeys = Object.keys(localStorage);
        const authKey = storageKeys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (authKey) {
          projectRef = authKey.replace('sb-', '').replace('-auth-token', '');
        }
      }
      
      // Only wait for session if we found a project ref (means there might be a session)
      if (projectRef && typeof window !== 'undefined') {
        const storageKey = `sb-${projectRef}-auth-token`;
        const hasSessionKey = localStorage.getItem(storageKey) !== null;
        
        // If session key exists, wait for it to be fully available
        // This handles both test environments (storageState restoration) and production
        if (hasSessionKey) {
          // Wait for localStorage to be populated (up to 3 seconds)
          // This is especially important in test environments where storageState restores async
          let attempts = 0;
          while (attempts < 30) {
            const sessionData = localStorage.getItem(storageKey);
            if (sessionData) {
              // Verify the session data is valid JSON
              try {
                const parsed = JSON.parse(sessionData);
                // Also verify it has required fields
                if (parsed.access_token && parsed.user) {
                  break;
                }
              } catch (e) {
                // Invalid JSON, wait a bit more
              }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          // Additional delay to ensure Supabase client has fully initialized
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          // No session key, just a small delay for client initialization
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        // No project ref found, minimal delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Get initial session - retry if needed
      let session = null;
      let sessionError = null;
      let attempts = 0;
      
      // More aggressive retries if we detected a session key
      const hasSessionKey = projectRef && typeof window !== 'undefined' && localStorage.getItem(`sb-${projectRef}-auth-token`) !== null;
      const maxAttempts = hasSessionKey ? 15 : 3;
      
      // If we have a session key in localStorage, try to explicitly set it first
      // This is important for test environments where storageState restores localStorage
      if (!session && hasSessionKey && projectRef && typeof window !== 'undefined') {
        const storageKey = `sb-${projectRef}-auth-token`;
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          try {
            const sessionData = JSON.parse(storedSession);
            // Verify session data is valid
            if (sessionData.access_token && sessionData.refresh_token) {
              // Try to set the session explicitly before calling getSession
              const { data: setSessionResult, error: setSessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token
              });
              if (setSessionResult?.session && !setSessionError) {
                session = setSessionResult.session;
              } else if (setSessionError) {
                console.warn('Failed to set session from localStorage:', setSessionError);
              }
            }
          } catch (e) {
            // Failed to parse session, continue to try getSession
            console.warn('Failed to parse session from localStorage:', e);
          }
        }
      }
      
      // If explicit setSession didn't work, try getSession with retries
      if (!session) {
        while (attempts < maxAttempts) {
          const result = await supabase.auth.getSession();
          session = result.data?.session;
          sessionError = result.error;
          
          if (session || sessionError) break;
          
          // If no session and no error, wait a bit and retry (client might still be reading)
          // Progressive wait times - more aggressive if session key exists
          const waitTime = hasSessionKey
            ? (attempts < 5 ? 200 : attempts < 10 ? 400 : 600)
            : 200;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          attempts++;
        }
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
        
        // Fetch user profile - with retries for test environments
        let profile = null;
        let profileError = null;
        let profileAttempts = 0;
        const maxProfileAttempts = hasSessionKey ? 10 : 3;
        
        while (profileAttempts < maxProfileAttempts && !profile && !profileError) {
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          profile = result.data;
          profileError = result.error;
          
          if (profile) {
            break; // Got profile, exit loop
          }
          
          // If error is not "not found", retry
          if (profileError && profileError.code !== 'PGRST116') {
            if (profileAttempts < maxProfileAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
              profileAttempts++;
              continue;
            }
          } else {
            break; // Not found or other error, exit
          }
        }

        if (profileError && profileError.code !== 'PGRST116') {
          // Profile might not exist yet, that's okay
          console.log('Profile not found:', profileError.message);
          userStore.setProfile(null);
        } else if (profile) {
          userStore.setProfile(profile);
        } else {
          userStore.setProfile(null);
        }
      } else {
        // No session, set both to null and mark as not loading
        userStore.setUser(null);
        userStore.setProfile(null);
      }

      // Mark loading as complete - profile is now available (or confirmed null)
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

