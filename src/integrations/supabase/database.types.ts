 
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
      configs: {
        Row: {
          address: string | null
          admin_fee_percentage: number
          city: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string
          interest_rate_percentage: number | null
          late_fee_percentage: number | null
          phone: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          admin_fee_percentage?: number
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          interest_rate_percentage?: number | null
          late_fee_percentage?: number | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          admin_fee_percentage?: number
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          interest_rate_percentage?: number | null
          late_fee_percentage?: number | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          city: string
          complement: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          neighborhood: string | null
          number: string | null
          state: string
          street: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          neighborhood?: string | null
          number?: string | null
          state: string
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          state?: string
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
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
          pix_code: string | null
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
          pix_code?: string | null
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
          pix_code?: string | null
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
      role_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          resource: string
          role: string
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          resource: string
          role: string
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          resource?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_users: {
        Row: {
          active: boolean
          cpf: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          password: string
          phone: string | null
          rg: string | null
          role: string
          updated_at: string | null
          username: string | null
          usuario: string | null
        }
        Insert: {
          active?: boolean
          cpf?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          password: string
          phone?: string | null
          rg?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
          usuario?: string | null
        }
        Update: {
          active?: boolean
          cpf?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password?: string
          phone?: string | null
          rg?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
          usuario?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          cpf: string | null
          created_at: string | null
          document: string | null
          document_type: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_location_permissions: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          location_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          location_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          location_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_location_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "system_users"
            referencedColumns: ["id"]
          },
        ]
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
      migrate_user_to_auth: {
        Args: { p_email: string; p_password: string; p_user_id?: string }
        Returns: string
      }
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
