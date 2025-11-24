import { writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserStore {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

function createUserStore() {
  const { subscribe, set, update } = writable<UserStore>({
    user: null,
    profile: null,
    loading: true
  });

  return {
    subscribe,
    setUser: (user: User | null) => {
      update((state) => ({ ...state, user, loading: false }));
    },
    setProfile: (profile: Profile | null) => {
      update((state) => ({ ...state, profile, loading: false }));
    },
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, loading }));
    },
    reset: () => {
      set({ user: null, profile: null, loading: false });
    }
  };
}

export const userStore = createUserStore();

