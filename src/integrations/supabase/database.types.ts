// Placeholder types file - regenerate with:
// npx supabase gen types typescript --project-id yrknfweilbuwrhzzwnrr --schema public > src/integrations/supabase/database.types.ts

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          location_id: string | null;
          property_identifier: string | null;
          complement: string | null;
          description: string | null;
          rooms: number | null;
          bathrooms: number | null;
          area: number | null;
          value: number | null;
          status: string | null;
          has_garage: boolean | null;
          has_furniture: boolean | null;
          accepts_pets: boolean | null;
          images: any;
          image_count: number; // Nova coluna adicionada
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: any;
        Update: any;
      };
      [key: string]: any;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
