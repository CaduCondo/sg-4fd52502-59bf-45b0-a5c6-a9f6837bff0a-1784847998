 
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      config: {
        Row: {
          admin_fee_percentage: number
          created_at: string | null
          id: string
          interest_rate_percentage: number
          late_fee_percentage: number
          locations: Json | null
          updated_at: string | null
        }
        Insert: {
          admin_fee_percentage?: number
          created_at?: string | null
          id?: string
          interest_rate_percentage?: number
          late_fee_percentage?: number
          locations?: Json | null
          updated_at?: string | null
        }
        Update: {
          admin_fee_percentage?: number
          created_at?: string | null
          id?: string
          interest_rate_percentage?: number
          late_fee_percentage?: number
          locations?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      configs: {
        Row: {
          admin_fee_percentage: number
          created_at: string | null
          id: string
          interest_rate_percentage: number | null
          late_fee_percentage: number | null
          locations: Json | null
          updated_at: string | null
        }
        Insert: {
          admin_fee_percentage?: number
          created_at?: string | null
          id?: string
          interest_rate_percentage?: number | null
          late_fee_percentage?: number | null
          locations?: Json | null
          updated_at?: string | null
        }
        Update: {
          admin_fee_percentage?: number
          created_at?: string | null
          id?: string
          interest_rate_percentage?: number | null
          late_fee_percentage?: number | null
          locations?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kv_store_3f6e5f02: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      leases: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          monthly_rent: number
          payment_day: number
          property_id: string | null
          start_date: string
          status: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          monthly_rent: number
          payment_day: number
          property_id?: string | null
          start_date: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          monthly_rent?: number
          payment_day?: number
          property_id?: string | null
          start_date?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_fee: number | null
          attachments: Json | null
          created_at: string | null
          due_date: string
          expected_amount: number
          id: string
          interest: number | null
          is_paid: boolean | null
          late_fee: number | null
          notes: string | null
          paid_amount: number | null
          partial_payments: Json | null
          payment_code: string | null
          payment_date: string | null
          payment_location: string | null
          payment_method: string | null
          reference_month: string
          reference_year: string
          rental_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_fee?: number | null
          attachments?: Json | null
          created_at?: string | null
          due_date: string
          expected_amount: number
          id?: string
          interest?: number | null
          is_paid?: boolean | null
          late_fee?: number | null
          notes?: string | null
          paid_amount?: number | null
          partial_payments?: Json | null
          payment_code?: string | null
          payment_date?: string | null
          payment_location?: string | null
          payment_method?: string | null
          reference_month: string
          reference_year: string
          rental_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          admin_fee?: number | null
          attachments?: Json | null
          created_at?: string | null
          due_date?: string
          expected_amount?: number
          id?: string
          interest?: number | null
          is_paid?: boolean | null
          late_fee?: number | null
          notes?: string | null
          paid_amount?: number | null
          partial_payments?: Json | null
          payment_code?: string | null
          payment_date?: string | null
          payment_location?: string | null
          payment_method?: string | null
          reference_month?: string
          reference_year?: string
          rental_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string
          monthly_rent: number
          neighborhood: string | null
          number: string
          state: string | null
          status: string
          type: string
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location: string
          monthly_rent: number
          neighborhood?: string | null
          number: string
          state?: string | null
          status: string
          type: string
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string
          monthly_rent?: number
          neighborhood?: string | null
          number?: string
          state?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      rentals: {
        Row: {
          attachments: Json | null
          contract_attachments: Json | null
          created_at: string | null
          deposit: string | null
          end_date: string
          garage_value: number | null
          has_garage: boolean | null
          id: string
          is_active: boolean | null
          monthly_rent: number
          payment_day: number
          property_id: string
          start_date: string
          tenant_id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          attachments?: Json | null
          contract_attachments?: Json | null
          created_at?: string | null
          deposit?: string | null
          end_date: string
          garage_value?: number | null
          has_garage?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_rent: number
          payment_day: number
          property_id: string
          start_date: string
          tenant_id: string
          updated_at?: string | null
          value: number
        }
        Update: {
          attachments?: Json | null
          contract_attachments?: Json | null
          created_at?: string | null
          deposit?: string | null
          end_date?: string
          garage_value?: number | null
          has_garage?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_rent?: number
          payment_day?: number
          property_id?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "rentals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          admin_fee_percentage: number | null
          created_at: string | null
          daily_interest_percentage: number | null
          id: string
          late_fee_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          admin_fee_percentage?: number | null
          created_at?: string | null
          daily_interest_percentage?: number | null
          id?: string
          late_fee_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_fee_percentage?: number | null
          created_at?: string | null
          daily_interest_percentage?: number | null
          id?: string
          late_fee_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          cpf: string | null
          created_at: string | null
          document: string | null
          document_type: string | null
          email: string
          id: string
          name: string
          phone: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          email: string
          id?: string
          name: string
          phone: string
          status: string
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
