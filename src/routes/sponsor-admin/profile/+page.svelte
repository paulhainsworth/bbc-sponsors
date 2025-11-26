<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { userStore } from '$lib/stores/user';
  import { sponsorSchema } from '$lib/utils/validators';
  import type { z } from 'zod';
  import type { Database } from '$lib/types/database.types';

  type SponsorForm = z.infer<typeof sponsorSchema>;
  type Sponsor = Database['public']['Tables']['sponsors']['Row'];

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
  let loading = true;
  let saving = false;
  let sponsor: Sponsor | null = null;
  let sponsorId: string | null = null;
  let logoFile: File | null = null;
  let logoPreview: string | null = null;
  let uploadingLogo = false;

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

  onMount(async () => {
    await loadSponsor();
  });

  async function loadSponsor() {
    if (!$userStore.profile) {
      loading = false;
      return;
    }

    // Use server-side API endpoint to get sponsor ID (bypasses RLS)
    try {
      const response = await fetch('/api/sponsor-admin/get-sponsor');
      const result = await response.json();

      if (!result.success || !result.sponsorId) {
        errors.submit = result.error || 'No sponsor associated with your account';
        loading = false;
        return;
      }

      sponsorId = result.sponsorId;

      const { data: sponsorData, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', sponsorId)
        .single();

      if (error || !sponsorData) {
        errors.submit = 'Sponsor not found';
        loading = false;
        return;
      }

      sponsor = sponsorData;

      // Set logo preview if logo exists
      if (sponsor?.logo_url) {
        logoPreview = sponsor.logo_url;
      }

      // Populate form
      if (sponsor) {
        formData = {
          name: sponsor.name,
          tagline: sponsor.tagline || '',
          description: sponsor.description || '',
          category: sponsor.category || [],
          website_url: sponsor.website_url || '',
          contact_email: sponsor.contact_email || '',
          contact_phone: sponsor.contact_phone || '',
          address_street: sponsor.address_street || '',
          address_city: sponsor.address_city || '',
          address_state: sponsor.address_state || '',
          address_zip: sponsor.address_zip || '',
          social_instagram: sponsor.social_instagram || '',
          social_facebook: sponsor.social_facebook || '',
          social_strava: sponsor.social_strava || '',
          social_twitter: sponsor.social_twitter || ''
        };
      }
    } catch (error: any) {
      console.error('Error loading sponsor:', error);
      errors.submit = 'Failed to load sponsor. Please try refreshing the page.';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    errors = {};
    saving = true;

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
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        saving = false;
        return;
      }

      if (!sponsorId) {
        errors.submit = 'Sponsor ID not found';
        saving = false;
        return;
      }

      // Update sponsor (sponsor admins can only update certain fields, not name/slug)
      const { error: updateError } = await supabase
        .from('sponsors')
        .update({
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
          social_twitter: cleanedData.social_twitter
        })
        .eq('id', sponsorId);

      if (updateError) {
        console.error('Database error:', updateError);
        errors.submit = updateError.message || 'Failed to update sponsor';
        saving = false;
        return;
      }

      // Upload logo if a new one was selected (must happen before other updates)
      if (logoFile) {
        const uploadSuccess = await uploadLogo();
        if (!uploadSuccess) {
          // Upload failed, stop form submission
          saving = false;
          return;
        }
      }

      // Reload sponsor data
      await loadSponsor();
      
      // Show success message
      alert('Profile updated successfully!');
    } catch (error) {
      errors.submit = 'An unexpected error occurred';
      console.error(error);
    } finally {
      saving = false;
    }
  }

  function handleLogoChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      logoFile = null;
      logoPreview = sponsor?.logo_url || null;
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      errors.logo = 'Invalid file type. Please upload a JPG, PNG, WebP, or SVG image.';
      logoFile = null;
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.logo = 'File too large. Maximum size is 5MB.';
      logoFile = null;
      return;
    }

    // Clear any previous errors
    delete errors.logo;
    logoFile = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function uploadLogo(): Promise<boolean> {
    if (!logoFile || !sponsorId) {
      return false;
    }

    uploadingLogo = true;
    errors.logo = '';

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await fetch('/api/sponsor-admin/upload-logo', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        errors.logo = result.error || 'Failed to upload logo';
        errors.submit = result.error || 'Failed to upload logo';
        uploadingLogo = false;
        return false;
      }

      // Update logo preview with new URL
      if (result.logoUrl) {
        logoPreview = result.logoUrl;
      }

      logoFile = null; // Clear the file after successful upload
      uploadingLogo = false;
      return true;
    } catch (error) {
      console.error('Error uploading logo:', error);
      errors.logo = 'An unexpected error occurred while uploading the logo';
      errors.submit = 'An unexpected error occurred while uploading the logo';
      uploadingLogo = false;
      return false;
    }
  }
</script>

<svelte:head>
  <title>Edit Profile - Sponsor Admin</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/sponsor-admin" class="text-white hover:opacity-80 transition-opacity">← Back to Dashboard</a>
    <h1 class="text-3xl font-bold mt-4 text-white">Edit Profile</h1>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
  {:else if errors.submit && !sponsor}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
      {errors.submit}
    </div>
  {:else if sponsor}
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

      <!-- Logo Upload -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Logo</h2>
        <div class="space-y-4">
          {#if logoPreview}
            <div class="flex items-start gap-4">
              <img
                src={logoPreview}
                alt="Sponsor logo"
                class="w-32 h-32 object-contain bg-gray-100 rounded-lg border border-gray-300 p-2"
              />
              <div class="flex-1">
                <p class="text-sm text-gray-600 mb-2">
                  Recommended dimensions: 512x512 pixels (square). Supports JPG, PNG, WebP, and SVG formats.
                </p>
                <div>
                  <label for="logo" class="block">
                    <span class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors cursor-pointer inline-block">
                      {uploadingLogo ? 'Uploading...' : 'Change Logo'}
                    </span>
                  </label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                    on:change={handleLogoChange}
                    class="hidden"
                    disabled={uploadingLogo}
                    aria-label="Upload logo"
                  />
                </div>
                {#if errors.logo}
                  <p class="text-red-600 text-sm mt-2">{errors.logo}</p>
                {/if}
              </div>
            </div>
          {:else}
            <div>
              <div>
                <label for="logo-upload" class="block">
                  <span class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors cursor-pointer inline-block">
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </span>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                  on:change={handleLogoChange}
                  class="hidden"
                  disabled={uploadingLogo}
                  aria-label="Upload logo"
                />
              </div>
              <p class="text-sm text-gray-600 mt-2">
                Recommended dimensions: 512x512 pixels (square). Supports JPG, PNG, WebP, and SVG formats. Maximum file size: 5MB.
              </p>
              {#if errors.logo}
                <p class="text-red-600 text-sm mt-2">{errors.logo}</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Basic Information -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Basic Information</h2>
        <div class="space-y-4">
          <div>
            <label for="name" class="label">Sponsor Name</label>
            <input
              id="name"
              type="text"
              value={sponsor.name}
              class="input bg-gray-100"
              disabled
            />
            <p class="text-sm text-gray-500 mt-1">Name cannot be changed. Contact an administrator to change the sponsor name.</p>
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

      <!-- Actions -->
      <div class="flex gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <a
          href="/sponsor-admin"
          class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  {/if}
</div>



