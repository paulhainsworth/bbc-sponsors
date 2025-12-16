<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/utils/supabase';
  import { sponsorSchema, generateSlug } from '$lib/utils/validators';
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
  
  // Logo upload state
  let logoFile: File | null = null;
  let logoPreview: string | null = null;
  let uploadingLogo = false;
  let logoError = '';

  const supabase = createClient();

  $: sponsorId = $page.params.id;

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

  function handleLogoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      logoFile = input.files[0];
      logoPreview = URL.createObjectURL(logoFile);
      logoError = '';
    }
  }

  async function uploadLogo() {
    if (!logoFile || !sponsorId) return;
    
    uploadingLogo = true;
    logoError = '';
    
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('sponsorId', sponsorId);
      
      const response = await fetch('/api/admin/sponsors/upload-logo', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local sponsor data with new logo URL
        if (sponsor) {
          sponsor = { ...sponsor, logo_url: result.logoUrl };
        }
        logoFile = null;
        logoPreview = null;
      } else {
        logoError = result.error || 'Failed to upload logo';
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      logoError = 'An error occurred while uploading the logo';
    } finally {
      uploadingLogo = false;
    }
  }

  async function loadSponsor() {
    if (!sponsorId) {
      loading = false;
      return;
    }

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

    // Populate form
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

    loading = false;
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
        console.error('Validation errors:', result.error.errors);
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        saving = false;
        return;
      }

      // Generate slug if name changed
      let newSlug = sponsor?.slug;
      if (sponsor?.name !== cleanedData.name) {
        const baseSlug = generateSlug(cleanedData.name);
        newSlug = baseSlug;
        
        // Check if slug already exists for a different sponsor
        const { data: existingSponsor } = await supabase
          .from('sponsors')
          .select('id')
          .eq('slug', baseSlug)
          .neq('id', sponsorId)
          .single();
        
        // If slug exists, append a number to make it unique
        if (existingSponsor) {
          let counter = 1;
          let uniqueSlug = `${baseSlug}-${counter}`;
          let slugExists = true;
          
          while (slugExists) {
            const { data: checkSponsor } = await supabase
              .from('sponsors')
              .select('id')
              .eq('slug', uniqueSlug)
              .neq('id', sponsorId)
              .single();
            
            if (!checkSponsor) {
              slugExists = false;
              newSlug = uniqueSlug;
            } else {
              counter++;
              uniqueSlug = `${baseSlug}-${counter}`;
            }
          }
        }
      }

      // Update sponsor
      const { error: updateError } = await supabase
        .from('sponsors')
        .update({
          name: cleanedData.name,
          slug: newSlug || sponsor?.slug,
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

      // Redirect to sponsor list
      goto('/admin/sponsors');
    } catch (error) {
      errors.submit = 'An unexpected error occurred';
      console.error(error);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Edit Sponsor - Admin</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/admin/sponsors" class="text-primary hover:underline">← Back to Sponsors</a>
    <h1 class="text-3xl font-bold mt-4">Edit Sponsor</h1>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if errors.submit && !sponsor}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
      {errors.submit}
    </div>
  {:else}
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
        <h2 class="text-xl font-semibold mb-4">Sponsor Logo</h2>
        <div class="flex items-start gap-6">
          <div class="flex-shrink-0">
            {#if logoPreview}
              <img src={logoPreview} alt="Logo preview" class="w-32 h-32 object-contain border rounded-lg bg-gray-50" />
            {:else if sponsor?.logo_url}
              <img src={sponsor.logo_url} alt="{sponsor.name} logo" class="w-32 h-32 object-contain border rounded-lg bg-gray-50" />
            {:else}
              <div class="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                No logo
              </div>
            {/if}
          </div>
          <div class="flex-grow">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
              on:change={handleLogoSelect}
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light file:cursor-pointer"
            />
            <p class="text-sm text-gray-500 mt-2">Accepted formats: JPEG, PNG, WebP, SVG. Max size: 5MB</p>
            {#if logoFile}
              <button
                type="button"
                on:click={uploadLogo}
                disabled={uploadingLogo}
                class="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
            {/if}
            {#if logoError}
              <p class="text-red-600 text-sm mt-2">{logoError}</p>
            {/if}
          </div>
        </div>
      </div>

      <!-- Promotions Management Link -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Promotions</h2>
        <a
          href="/admin/sponsors/{sponsorId}/promotions"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
        >
          <span>Manage Promotions</span>
          <span>→</span>
        </a>
        <p class="text-sm text-gray-500 mt-2">Create, edit, and manage promotions for this sponsor.</p>
      </div>

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

      <!-- Status -->
      {#if sponsor}
        <div>
          <h2 class="text-xl font-semibold mb-4">Status</h2>
          <div>
            <label class="label">Current Status: {sponsor.status}</label>
            <div class="mt-2">
              <select
                id="status"
                bind:value={sponsor.status}
                on:change={async (e) => {
                  if (!sponsor) return;
                  const newStatus = e.currentTarget.value;
                  if (newStatus !== 'pending' && newStatus !== 'active' && newStatus !== 'inactive') {
                    return;
                  }
                  const { error } = await supabase
                    .from('sponsors')
                    .update({ status: newStatus })
                    .eq('id', sponsorId);
                  if (!error && sponsor) {
                    sponsor = { ...sponsor, status: newStatus };
                  }
                }}
                class="input"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      {/if}

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
          href="/admin/sponsors"
          class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  {/if}
</div>

