<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import type { PageData } from './$types';

  export let data: PageData;
  
  let error = '';
  let processing = true;

  onMount(async () => {
    const supabase = createClient();
    const redirectTo = data.redirectTo || '/';
    
    // Check if there's a hash fragment with tokens (implicit flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Handle implicit flow (hash fragment)
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (sessionError) {
        console.error('Error setting session:', sessionError);
        error = sessionError.message;
        processing = false;
        return;
      }
      
      if (sessionData.session?.user) {
        userStore.setUser(sessionData.session.user);
        
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (profile) {
          userStore.setProfile(profile);
        }
        userStore.setLoading(false);
      }
      
      // Use window.location for a full page navigation to ensure cookies are read
      window.location.href = redirectTo;
      return;
    }
    
    // Check if there's an error in the hash
    const hashError = hashParams.get('error');
    const hashErrorDescription = hashParams.get('error_description');
    if (hashError) {
      error = hashErrorDescription || hashError;
      processing = false;
      return;
    }
    
    // No hash fragment tokens - check if we have a session from server-side code exchange
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      userStore.setUser(session.user);
      
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        userStore.setProfile(profile);
      }
      userStore.setLoading(false);
      
      // Use window.location for a full page navigation
      window.location.href = redirectTo;
    } else {
      // No session found
      error = 'Authentication failed. Please try signing in again.';
      processing = false;
    }
  });
</script>

<div class="container mx-auto px-4 py-16 text-center">
  {#if error}
    <div class="max-w-md mx-auto">
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
        <p class="font-semibold">Sign In Error</p>
        <p class="text-sm">{error}</p>
      </div>
      <a href="/auth/login" class="btn btn-primary">Try Again</a>
    </div>
  {:else if processing}
    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <p class="mt-4 text-gray-600">Completing sign in...</p>
  {/if}
</div>

