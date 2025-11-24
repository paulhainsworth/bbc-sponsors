export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          role: 'super_admin' | 'sponsor_admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role: 'super_admin' | 'sponsor_admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'super_admin' | 'sponsor_admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      sponsors: {
        Row: {
          id: string;
          name: string;
          slug: string;
          tagline: string | null;
          description: string | null;
          logo_url: string | null;
          banner_url: string | null;
          category: string[];
          website_url: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          address_street: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          social_instagram: string | null;
          social_facebook: string | null;
          social_strava: string | null;
          social_twitter: string | null;
          status: 'pending' | 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          tagline?: string | null;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          category?: string[];
          website_url?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address_street?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          social_instagram?: string | null;
          social_facebook?: string | null;
          social_strava?: string | null;
          social_twitter?: string | null;
          status?: 'pending' | 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          tagline?: string | null;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          category?: string[];
          website_url?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address_street?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          social_instagram?: string | null;
          social_facebook?: string | null;
          social_strava?: string | null;
          social_twitter?: string | null;
          status?: 'pending' | 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
      };
      sponsor_admins: {
        Row: {
          id: string;
          sponsor_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      promotions: {
        Row: {
          id: string;
          sponsor_id: string;
          title: string;
          description: string;
          promotion_type: 'evergreen' | 'time_limited' | 'coupon_code' | 'external_link';
          start_date: string;
          end_date: string | null;
          coupon_code: string | null;
          external_link: string | null;
          terms: string | null;
          is_featured: boolean;
          status: 'draft' | 'active' | 'expired' | 'archived';
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          title: string;
          description: string;
          promotion_type: 'evergreen' | 'time_limited' | 'coupon_code' | 'external_link';
          start_date?: string;
          end_date?: string | null;
          coupon_code?: string | null;
          external_link?: string | null;
          terms?: string | null;
          is_featured?: boolean;
          status?: 'draft' | 'active' | 'expired' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          title?: string;
          description?: string;
          promotion_type?: 'evergreen' | 'time_limited' | 'coupon_code' | 'external_link';
          start_date?: string;
          end_date?: string | null;
          coupon_code?: string | null;
          external_link?: string | null;
          terms?: string | null;
          is_featured?: boolean;
          status?: 'draft' | 'active' | 'expired' | 'archived';
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string;
          featured_image_url: string | null;
          author_id: string;
          status: 'draft' | 'published' | 'archived';
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content: string;
          featured_image_url?: string | null;
          author_id: string;
          status?: 'draft' | 'published' | 'archived';
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          excerpt?: string | null;
          content?: string;
          featured_image_url?: string | null;
          author_id?: string;
          status?: 'draft' | 'published' | 'archived';
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      blog_post_sponsors: {
        Row: {
          id: string;
          post_id: string;
          sponsor_id: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          sponsor_id: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          sponsor_id?: string;
        };
      };
      slack_config: {
        Row: {
          id: string;
          webhook_url: string;
          is_enabled: boolean;
          notify_new_promotion: boolean;
          notify_featured_promotion: boolean;
          notify_new_sponsor: boolean;
          notify_blog_post: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          webhook_url: string;
          is_enabled?: boolean;
          notify_new_promotion?: boolean;
          notify_featured_promotion?: boolean;
          notify_new_sponsor?: boolean;
          notify_blog_post?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          webhook_url?: string;
          is_enabled?: boolean;
          notify_new_promotion?: boolean;
          notify_featured_promotion?: boolean;
          notify_new_sponsor?: boolean;
          notify_blog_post?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      slack_notifications: {
        Row: {
          id: string;
          notification_type: string;
          payload: Json;
          status: 'pending' | 'sent' | 'failed' | null;
          error_message: string | null;
          attempts: number;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_type: string;
          payload: Json;
          status?: 'pending' | 'sent' | 'failed' | null;
          error_message?: string | null;
          attempts?: number;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          notification_type?: string;
          payload?: Json;
          status?: 'pending' | 'sent' | 'failed' | null;
          error_message?: string | null;
          attempts?: number;
          sent_at?: string | null;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          role: 'super_admin' | 'sponsor_admin';
          sponsor_id: string | null;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: 'super_admin' | 'sponsor_admin';
          sponsor_id?: string | null;
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'super_admin' | 'sponsor_admin';
          sponsor_id?: string | null;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          event_type: string;
          sponsor_id: string | null;
          promotion_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          sponsor_id?: string | null;
          promotion_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          sponsor_id?: string | null;
          promotion_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

