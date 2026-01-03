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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activation_tokens: {
        Row: {
          created_at: string
          email: string
          email_sent_at: string | null
          expires_at: string
          id: string
          phone: string | null
          plan_id: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          token: string
          used_at: string | null
          used_by: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          phone?: string | null
          plan_id: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          phone?: string | null
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_tokens_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          barber_id: string
          barbershop_id: string
          client_id: string
          client_name: string | null
          confirmation_24h_sent_at: string | null
          created_at: string
          id: string
          notes: string | null
          notification_3h_sent_at: string | null
          paid_amount: number | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          barber_id: string
          barbershop_id: string
          client_id: string
          client_name?: string | null
          confirmation_24h_sent_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          notification_3h_sent_at?: string | null
          paid_amount?: number | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          barber_id?: string
          barbershop_id?: string
          client_id?: string
          client_name?: string | null
          confirmation_24h_sent_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          notification_3h_sent_at?: string | null
          paid_amount?: number | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          barbershop_id: string
          commission_percent: number | null
          created_at: string
          google_calendar_id: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          photo_url: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          commission_percent?: number | null
          created_at?: string
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          photo_url?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          commission_percent?: number | null
          created_at?: string
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          photo_url?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string | null
          closing_time: string
          created_at: string
          id: string
          logo_sidebar_url: string | null
          logo_url: string | null
          name: string
          opening_time: string
          owner_id: string
          phone: string | null
          primary_color: string | null
          saturday_closing_time: string | null
          saturday_opening_time: string | null
          secondary_color: string | null
          updated_at: string
          working_days: number[]
        }
        Insert: {
          address?: string | null
          closing_time?: string
          created_at?: string
          id?: string
          logo_sidebar_url?: string | null
          logo_url?: string | null
          name: string
          opening_time?: string
          owner_id: string
          phone?: string | null
          primary_color?: string | null
          saturday_closing_time?: string | null
          saturday_opening_time?: string | null
          secondary_color?: string | null
          updated_at?: string
          working_days?: number[]
        }
        Update: {
          address?: string | null
          closing_time?: string
          created_at?: string
          id?: string
          logo_sidebar_url?: string | null
          logo_url?: string | null
          name?: string
          opening_time?: string
          owner_id?: string
          phone?: string | null
          primary_color?: string | null
          saturday_closing_time?: string | null
          saturday_opening_time?: string | null
          secondary_color?: string | null
          updated_at?: string
          working_days?: number[]
        }
        Relationships: []
      }
      blocked_days: {
        Row: {
          barber_id: string
          barbershop_id: string
          blocked_date: string
          created_at: string | null
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          blocked_date: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          blocked_date?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_days_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_days_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      client_barbershop: {
        Row: {
          barbershop_id: string
          created_at: string | null
          id: string
          profile_id: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_barbershop_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_barbershop_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          barbershop_id: string
          created_at: string
          email: string | null
          id: string
          last_appointment_at: string | null
          name: string
          phone: string | null
          profile_id: string | null
          total_visits: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_appointment_at?: string | null
          name: string
          phone?: string | null
          profile_id?: string | null
          total_visits?: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_appointment_at?: string | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          appointment_id: string
          barber_id: string
          barbershop_id: string
          comissao_percent: number
          comissao_valor: number
          created_at: string
          id: string
          status: string
          updated_at: string
          valor_liquido_barbearia: number
          valor_total: number
        }
        Insert: {
          appointment_id: string
          barber_id: string
          barbershop_id: string
          comissao_percent: number
          comissao_valor: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          valor_liquido_barbearia: number
          valor_total: number
        }
        Update: {
          appointment_id?: string
          barber_id?: string
          barbershop_id?: string
          comissao_percent?: number
          comissao_valor?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          valor_liquido_barbearia?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          barbershop_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          title: string | null
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_images_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          barbershop_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          features: Json | null
          has_advanced_reports: boolean
          has_custom_colors: boolean
          has_date_filter: boolean
          has_day_blocking: boolean
          has_whatsapp_integration: boolean
          id: string
          is_active: boolean
          max_clients: number | null
          max_portfolio_images: number | null
          max_professionals: number | null
          name: string
          price_monthly: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          has_advanced_reports?: boolean
          has_custom_colors?: boolean
          has_date_filter?: boolean
          has_day_blocking?: boolean
          has_whatsapp_integration?: boolean
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_portfolio_images?: number | null
          max_professionals?: number | null
          name: string
          price_monthly: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          has_advanced_reports?: boolean
          has_custom_colors?: boolean
          has_date_filter?: boolean
          has_day_blocking?: boolean
          has_whatsapp_integration?: boolean
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_portfolio_images?: number | null
          max_professionals?: number | null
          name?: string
          price_monthly?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          barbershop_id: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          barbershop_id: string | null
          conversation_state: Json | null
          created_at: string | null
          id: string
          last_message_at: string | null
          phone_number: string
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id?: string | null
          conversation_state?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string | null
          conversation_state?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_barbershop_public_info: {
        Args: { barbershop_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          primary_color: string
        }[]
      }
      get_user_barbershop_id: { Args: { user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "client"
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
    Enums: {
      app_role: ["owner", "client"],
    },
  },
} as const
