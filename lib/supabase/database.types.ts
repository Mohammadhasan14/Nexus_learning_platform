// Generated from migration catalogs using scripts/database-types.ts. Do not hand-edit.
// PGlite verifies public-schema structure; live Supabase verification remains separate.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          goal: string;
          daily_minutes: number;
          locale: string;
          timezone: string;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string;
          goal?: string;
          daily_minutes?: number;
          locale?: string;
          timezone?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          goal?: string;
          daily_minutes?: number;
          locale?: string;
          timezone?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_roles: {
        Row: { user_id: string; role: string; created_at: string };
        Insert: { user_id: string; role: string; created_at?: string };
        Update: { user_id?: string; role?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
