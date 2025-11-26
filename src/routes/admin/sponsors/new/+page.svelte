<script lang="ts">
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { sponsorSchema, generateSlug } from '$lib/utils/validators';
  import type { z } from 'zod';

  type SponsorForm = z.infer<typeof sponsorSchema>;

  let formData: SponsorForm = {
    name: '',
    tagline: '',
    description: '',
    category: [],
    website_url: '',
    contact_email: '',
    contact_phone: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    social_instagram: '',
    social_facebook: '',
    social_strava: '',
    social_twitter: ''
  };

  let errors: Record<string, string> = {};
  let loading = false;
  let adminEmail = '';
  let adminName = '';
  let invitationMessage = '';

  const supabase = createClient();

  const categoryOptions = [
    'Bike Shops',
    'Apparel',
    'Nutrition',
    'Services',
    'Accessories',
    'Components',
    'Other'
  ];

  async function handleSubmit() {
    errors = {};
    loading = true;

    try {
      // Clean up empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        tagline: formData.tagline?.trim() || null,
        description: formData.description?.trim() || null,
        website_url: formData.website_url?.trim() || null,
        contact_email: formData.contact_email?.trim() || null,
        contact_phone: formData.contact_phone?.trim() || null,
        address_street: formData.address_street?.trim() || null,
        address_city: formData.address_city?.trim() || null,
        address_state: formData.address_state?.trim() || null,
        address_zip: formData.address_zip?.trim() || null,
        social_instagram: formData.social_instagram?.trim() || null,
        social_facebook: formData.social_facebook?.trim() || null,
        social_strava: formData.social_strava?.trim() || null,
        social_twitter: formData.social_twitter?.trim() || null
      };

      // Validate form
      const result = sponsorSchema.safeParse(cleanedData);
      if (!result.success) {
        console.error('Validation errors:', result.error.errors);
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        loading = false;
        return;
      }

      // Generate slug
      const slug = generateSlug(cleanedData.name);

      // Create sponsor
      const { data: sponsor, error: sponsorError } = await supabase
        .from('sponsors')
        .insert({
          name: cleanedData.name,
          slug,
          tagline: cleanedData.tagline,
          description: cleanedData.description,
          category: cleanedData.category,
          website_url: cleanedData.website_url,
          contact_email: cleanedData.contact_email,
          contact_phone: cleanedData.contact_phone,
          address_street: cleanedData.address_street,
          address_city: cleanedData.address_city,
          address_state: cleanedData.address_state,
          address_zip: cleanedData.address_zip,
          social_instagram: cleanedData.social_instagram,
          social_facebook: cleanedData.social_facebook,
          social_strava: cleanedData.social_strava,
          social_twitter: cleanedData.social_twitter,
          status: 'pending'
        })
        .select()
        .single();

      if (sponsorError) {
        console.error('Database error:', sponsorError);
        errors.submit = sponsorError.message || 'Failed to create sponsor';
        loading = false;
        return;
      }

      // If admin email provided, create invitation
      if (adminEmail && sponsor) {
        try {
          // Add timeout to prevent hanging (20 seconds)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const response = await fetch('/api/invitations/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: adminEmail.trim(),
              role: 'sponsor_admin',
              sponsorId: sponsor.id,
              sponsorName: cleanedData.name,
              adminName: adminName.trim() || null
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          const result = await response.json();

          if (!result.success) {
            console.error('Failed to send invitation:', result.error);
            invitationMessage = `Sponsor created successfully!\n\n❌ Invitation Error: ${result.error}\n\nPlease send this invitation URL manually:\n${result.invitationUrl || 'URL not available'}`;
          } else {
            if (result.emailSent) {
              invitationMessage = `✅ Sponsor created and invitation email sent to ${adminEmail}`;
            } else if (result.warning) {
              invitationMessage = `✅ Sponsor created successfully!\n\n⚠️ ${result.message}\n\n📧 Invitation URL (copy and send manually):\n${result.invitationUrl}\n\nNote: Automatic email sending failed. You can send this URL to ${adminEmail} manually.`;
            } else {
              invitationMessage = `✅ Sponsor created!\n\n📧 Invitation URL:\n${result.invitationUrl}`;
            }
          }
        } catch (error: any) {
          console.error('Error sending invitation:', error);
          if (error.name === 'AbortError') {
            invitationMessage = `Sponsor created successfully!\n\n⚠️ Invitation request timed out.\n\nPlease try sending the invitation again or check your network connection.`;
          } else {
            invitationMessage = `Sponsor created successfully!\n\n⚠️ Invitation could not be sent automatically.\n\nError: ${error?.message || 'Unknown error'}\n\nPlease check:\n1. SUPABASE_SERVICE_ROLE_KEY is set in .env.local\n2. Check browser console for details`;
          }
        }
      }

      // Show success message with invitation details
      if (invitationMessage) {
        alert(invitationMessage);
        // Also log to console for debugging
        console.log('Invitation result:', invitationMessage);
      }

      // Redirect to sponsor list
      goto('/admin/sponsors');
    } catch (error) {
      errors.submit = 'An unexpected error occurred';
      console.error(error);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Add New Sponsor - Admin</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/admin/sponsors" class="text-primary hover:underline">← Back to Sponsors</a>
    <h1 class="text-3xl font-bold mt-4">Add New Sponsor</h1>
  </div>

  <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow-md p-6 space-y-6">
    {#if errors.submit}
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
        <p class="font-semibold">Error:</p>
        <p>{errors.submit}</p>
      </div>
    {/if}

    {#if Object.keys(errors).length > 0 && !errors.submit}
      <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
        <p class="font-semibold">Please fix the following errors:</p>
        <ul class="list-disc list-inside mt-2">
          {#each Object.entries(errors) as [field, message]}
            {#if field !== 'submit'}
              <li>{field}: {message}</li>
            {/if}
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Basic Information -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Basic Information</h2>
      <div class="space-y-4">
        <div>
          <label for="name" class="label">Sponsor Name *</label>
          <input
            id="name"
            type="text"
            bind:value={formData.name}
            class="input"
            required
          />
          {#if errors.name}
            <p class="text-red-600 text-sm mt-1">{errors.name}</p>
          {/if}
        </div>

        <div>
          <label for="tagline" class="label">Tagline</label>
          <input
            id="tagline"
            type="text"
            bind:value={formData.tagline}
            class="input"
            maxlength="150"
            placeholder="Short tagline (max 150 characters)"
          />
        </div>

        <div>
          <label for="description" class="label">Description</label>
          <textarea
            id="description"
            bind:value={formData.description}
            class="input"
            rows="4"
            maxlength="2000"
            placeholder="Detailed description of the sponsor"
          ></textarea>
        </div>

        <div>
          <label class="label">Categories *</label>
          <div class="flex flex-wrap gap-2">
            {#each categoryOptions as option}
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.category.includes(option)}
                  on:change={(e) => {
                    if (e.currentTarget.checked) {
                      formData.category = [...formData.category, option];
                    } else {
                      formData.category = formData.category.filter((c) => c !== option);
                    }
                  }}
                />
                <span>{option}</span>
              </label>
            {/each}
          </div>
          {#if errors.category}
            <p class="text-red-600 text-sm mt-1">{errors.category}</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Contact Information -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Contact Information</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="website_url" class="label">Website URL</label>
          <input
            id="website_url"
            type="url"
            bind:value={formData.website_url}
            class="input"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label for="contact_email" class="label">Contact Email</label>
          <input
            id="contact_email"
            type="email"
            bind:value={formData.contact_email}
            class="input"
          />
        </div>

        <div>
          <label for="contact_phone" class="label">Contact Phone</label>
          <input
            id="contact_phone"
            type="tel"
            bind:value={formData.contact_phone}
            class="input"
          />
        </div>
      </div>
    </div>

    <!-- Address -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Address</h2>
      <div class="space-y-4">
        <div>
          <label for="address_street" class="label">Street Address</label>
          <input
            id="address_street"
            type="text"
            bind:value={formData.address_street}
            class="input"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="address_city" class="label">City</label>
            <input
              id="address_city"
              type="text"
              bind:value={formData.address_city}
              class="input"
            />
          </div>

          <div>
            <label for="address_state" class="label">State</label>
            <input
              id="address_state"
              type="text"
              bind:value={formData.address_state}
              class="input"
            />
          </div>

          <div>
            <label for="address_zip" class="label">ZIP Code</label>
            <input
              id="address_zip"
              type="text"
              bind:value={formData.address_zip}
              class="input"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Social Media -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Social Media</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="social_instagram" class="label">Instagram URL</label>
          <input
            id="social_instagram"
            type="url"
            bind:value={formData.social_instagram}
            class="input"
            placeholder="https://instagram.com/..."
          />
        </div>

        <div>
          <label for="social_facebook" class="label">Facebook URL</label>
          <input
            id="social_facebook"
            type="url"
            bind:value={formData.social_facebook}
            class="input"
            placeholder="https://facebook.com/..."
          />
        </div>

        <div>
          <label for="social_strava" class="label">Strava URL</label>
          <input
            id="social_strava"
            type="url"
            bind:value={formData.social_strava}
            class="input"
            placeholder="https://strava.com/..."
          />
        </div>

        <div>
          <label for="social_twitter" class="label">Twitter/X URL</label>
          <input
            id="social_twitter"
            type="url"
            bind:value={formData.social_twitter}
            class="input"
            placeholder="https://twitter.com/..."
          />
        </div>
      </div>
    </div>

    <!-- Sponsor Admin (Optional) -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Sponsor Administrator (Optional)</h2>
      <p class="text-sm text-gray-600 mb-4">
        Invite a sponsor administrator to manage this sponsor's profile and promotions.
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="admin_name" class="label">Admin Name</label>
          <input
            id="admin_name"
            type="text"
            bind:value={adminName}
            class="input"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label for="admin_email" class="label">Admin Email</label>
          <input
            id="admin_email"
            type="email"
            bind:value={adminEmail}
            class="input"
            placeholder="admin@sponsor.com"
          />
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-4 pt-4 border-t">
      <button
        type="submit"
        disabled={loading}
        class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Sponsor'}
      </button>
      <a
        href="/admin/sponsors"
        class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Cancel
      </a>
    </div>
  </form>
</div>

