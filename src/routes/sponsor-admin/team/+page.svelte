<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import type { Database } from '$lib/types/database.types';

  type SponsorAdmin = Database['public']['Tables']['sponsor_admins']['Row'];
  type Profile = Database['public']['Tables']['profiles']['Row'];

  interface TeamMember {
    sponsorAdmin: SponsorAdmin;
    profile: Profile;
  }

  let teamMembers: TeamMember[] = [];
  let loading = true;
  let sponsorId: string | null = null;
  let inviteEmail = '';
  let inviting = false;
  let inviteError: string | null = null;
  let inviteSuccess = false;

  const supabase = createClient();

  onMount(async () => {
    await loadTeamMembers();
  });

  async function loadTeamMembers() {
    if (!$userStore.profile) {
      loading = false;
      return;
    }

    // Use server-side API endpoint to bypass RLS issues
    try {
      const response = await fetch('/api/sponsor-admin/team-members');
      const result = await response.json();

      if (!result.success) {
        console.error('Error fetching team members:', result.error);
        loading = false;
        return;
      }

        // Get sponsor ID for the current user
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Use the API endpoint to get sponsor ID
        const sponsorResponse = await fetch('/api/sponsor-admin/get-sponsor');
        const sponsorResult = await sponsorResponse.json();
        if (sponsorResult.success && sponsorResult.sponsorId) {
          sponsorId = sponsorResult.sponsorId;
        }
      }

      // Transform the API response to match the expected format
      // The API already includes profiles, so we can use them directly
      const sponsorAdmins = result.teamMembers.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        sponsor_id: sponsorId,
        created_at: member.created_at,
        profiles: member.profiles
      }));

      if (!sponsorAdmins || sponsorAdmins.length === 0) {
        loading = false;
        return;
      }

      // Combine sponsor admins with profiles (profiles are already included from API)
      teamMembers = sponsorAdmins
        .map((sa) => {
          const profile = sa.profiles;
          return profile ? { sponsorAdmin: sa, profile } : null;
        })
        .filter((tm): tm is TeamMember => tm !== null)
        .sort((a, b) => {
          // Sort by created_at, newest first
          return new Date(b.sponsorAdmin.created_at).getTime() - new Date(a.sponsorAdmin.created_at).getTime();
        });

      loading = false;
    } catch (error: any) {
      console.error('Error loading team members:', error);
      loading = false;
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      inviteError = 'Email is required';
      return;
    }

    if (!sponsorId) {
      inviteError = 'No sponsor associated with your account';
      return;
    }

    inviting = true;
    inviteError = null;
    inviteSuccess = false;

    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: 'sponsor_admin',
          sponsorId: sponsorId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        inviteError = data.error || 'Failed to send invitation';
        inviting = false;
        return;
      }

      inviteSuccess = true;
      inviteEmail = '';
      
      // Reload team members after a short delay
      setTimeout(() => {
        loadTeamMembers();
      }, 1000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      inviteError = 'An unexpected error occurred';
    } finally {
      inviting = false;
    }
  }

  async function removeTeamMember(teamMember: TeamMember) {
    // Don't allow removing yourself
    if (teamMember.profile.id === $userStore.profile?.id) {
      alert('You cannot remove yourself from the team');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${teamMember.profile.email} from the team?`)) {
      return;
    }

    const { error } = await supabase
      .from('sponsor_admins')
      .delete()
      .eq('id', teamMember.sponsorAdmin.id);

    if (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member');
      return;
    }

    // Reload team members
    await loadTeamMembers();
  }
</script>

<svelte:head>
  <title>Team Members - Sponsor Admin</title>
</svelte:head>

<div>
  <div class="flex items-center justify-between mb-6">
    <div>
      <a href="/sponsor-admin" class="text-white hover:opacity-80 transition-opacity">← Back to Dashboard</a>
      <h1 class="text-3xl font-bold mt-4 text-white">Team Members</h1>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12 bg-white rounded-lg shadow-md">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else}
    <!-- Invite New Member -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-2xl font-semibold mb-4">Invite Team Member</h2>
      
      {#if inviteSuccess}
        <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          <p>Invitation sent successfully! The team member will receive an email with instructions to join.</p>
        </div>
      {/if}

      {#if inviteError}
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          <p class="font-semibold">Error:</p>
          <p>{inviteError}</p>
        </div>
      {/if}

      <form
        on:submit|preventDefault={handleInvite}
        class="flex gap-4 items-end"
      >
        <div class="flex-1">
          <label for="invite-email" class="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="invite-email"
            type="email"
            bind:value={inviteEmail}
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="team-member@example.com"
            required
            disabled={inviting}
          />
        </div>
        <button
          type="submit"
          disabled={inviting || !inviteEmail.trim()}
          class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {inviting ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>
    </div>

    <!-- Team Members List -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-2xl font-semibold">Current Team Members</h2>
      </div>

      {#if teamMembers.length === 0}
        <div class="p-12 text-center text-gray-500">
          <p>No team members yet. Invite someone to get started!</p>
        </div>
      {:else}
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each teamMembers as teamMember}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {teamMember.profile.display_name || teamMember.profile.email.split('@')[0]}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{teamMember.profile.email}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                    {teamMember.profile.role.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(teamMember.sponsorAdmin.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {#if teamMember.profile.id === $userStore.profile?.id}
                    <span class="text-gray-400">You</span>
                  {:else}
                    <button
                      on:click={() => removeTeamMember(teamMember)}
                      class="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

