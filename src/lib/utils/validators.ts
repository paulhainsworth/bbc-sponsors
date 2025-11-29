import { z } from 'zod';

// Helper to validate URL or empty string
const urlOrEmpty = z.preprocess(
  (val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  },
  z.union([z.string().url('Invalid URL'), z.null()]).optional()
);

// Helper to validate email or empty string
const emailOrEmpty = z.preprocess(
  (val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  },
  z.union([z.string().email('Invalid email'), z.null()]).optional()
);

export const sponsorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  tagline: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().max(150).nullable().optional()
  ),
  description: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().max(2000).nullable().optional()
  ),
  category: z.array(z.string()).min(1, 'At least one category is required'),
  website_url: urlOrEmpty,
  contact_email: emailOrEmpty,
  contact_phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().nullable().optional()
  ),
  address_street: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().nullable().optional()
  ),
  address_city: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().nullable().optional()
  ),
  address_state: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().nullable().optional()
  ),
  address_zip: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().nullable().optional()
  ),
  social_instagram: urlOrEmpty,
  social_facebook: urlOrEmpty,
  social_strava: urlOrEmpty,
  social_twitter: urlOrEmpty
});

// Schema for sponsor updates (excludes name since it can't be changed by sponsor admins)
export const sponsorUpdateSchema = sponsorSchema.omit({ name: true });

export const promotionSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(100),
    description: z.string().min(1, 'Description is required').max(1000),
    promotion_type: z.enum(['evergreen', 'time_limited', 'coupon_code', 'external_link']),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    coupon_code: z.string().optional().nullable(),
    external_link: z.string().url('Invalid URL').optional().nullable(),
    terms: z.string().optional().nullable(),
    is_featured: z.boolean().default(false)
  })
  .refine(
    (data) => {
      if (data.promotion_type === 'time_limited' && !data.end_date) {
        return false;
      }
      return true;
    },
    {
      message: 'End date is required for time-limited promotions',
      path: ['end_date']
    }
  )
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) < new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date']
    }
  );

export const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required'),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  featured_image_url: z.string().url('Invalid URL').optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft')
});

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

