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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: string
          system_prompt: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          system_prompt?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          system_prompt?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          currency: string
          exporter_address: string | null
          exporter_name: string | null
          gross_weight_kg: number
          hs_code: string
          id: string
          item_description: string
          net_weight_kg: number
          quantity: number
          shipment_id: string
          total_value: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          exporter_address?: string | null
          exporter_name?: string | null
          gross_weight_kg: number
          hs_code: string
          id?: string
          item_description: string
          net_weight_kg: number
          quantity: number
          shipment_id: string
          total_value: number
          unit_price: number
        }
        Update: {
          created_at?: string
          currency?: string
          exporter_address?: string | null
          exporter_name?: string | null
          gross_weight_kg?: number
          hs_code?: string
          id?: string
          item_description?: string
          net_weight_kg?: number
          quantity?: number
          shipment_id?: string
          total_value?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      legal_knowledge: {
        Row: {
          created_at: string
          effective_date: string
          full_text: string | null
          hs_codes_affected: string[]
          id: string
          jurisdiction: string
          regulation_body: string
          source_url: string | null
          summary: string
          title: string
          transport_modes: Database["public"]["Enums"]["transport_mode"][]
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          full_text?: string | null
          hs_codes_affected?: string[]
          id?: string
          jurisdiction: string
          regulation_body: string
          source_url?: string | null
          summary: string
          title: string
          transport_modes?: Database["public"]["Enums"]["transport_mode"][]
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          full_text?: string | null
          hs_codes_affected?: string[]
          id?: string
          jurisdiction?: string
          regulation_body?: string
          source_url?: string | null
          summary?: string
          title?: string
          transport_modes?: Database["public"]["Enums"]["transport_mode"][]
          updated_at?: string
        }
        Relationships: []
      }
      manifests: {
        Row: {
          bill_of_lading: string | null
          created_at: string
          gross_weight_kg: number
          hs_code: string
          id: string
          item_description: string
          net_weight_kg: number
          packages: number
          quantity: number
          shipment_id: string
          total_value: number
          vessel_voyage: string | null
        }
        Insert: {
          bill_of_lading?: string | null
          created_at?: string
          gross_weight_kg: number
          hs_code: string
          id?: string
          item_description: string
          net_weight_kg: number
          packages?: number
          quantity: number
          shipment_id: string
          total_value: number
          vessel_voyage?: string | null
        }
        Update: {
          bill_of_lading?: string | null
          created_at?: string
          gross_weight_kg?: number
          hs_code?: string
          id?: string
          item_description?: string
          net_weight_kg?: number
          packages?: number
          quantity?: number
          shipment_id?: string
          total_value?: number
          vessel_voyage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifests_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          compliance_pulse_opt_in: boolean
          created_at: string
          full_name: string | null
          id: string
          stripe_customer_id: string | null
          subscription_status: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          compliance_pulse_opt_in?: boolean
          created_at?: string
          full_name?: string | null
          id: string
          stripe_customer_id?: string | null
          subscription_status?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          compliance_pulse_opt_in?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscription_status?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      shipment_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean
          shipment_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          shipment_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          shipment_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      shipment_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
          shipment_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          shipment_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          shipment_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          assigned_broker: string | null
          consignee: string
          created_at: string
          declared_value: number
          description: string
          destination_country: string | null
          hs_code: string
          id: string
          jurisdiction_code: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          origin_country: string | null
          risk_notes: string | null
          risk_score: number
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
        }
        Insert: {
          assigned_broker?: string | null
          consignee: string
          created_at?: string
          declared_value?: number
          description: string
          destination_country?: string | null
          hs_code: string
          id?: string
          jurisdiction_code?: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          origin_country?: string | null
          risk_notes?: string | null
          risk_score?: number
          shipment_id: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Update: {
          assigned_broker?: string | null
          consignee?: string
          created_at?: string
          declared_value?: number
          description?: string
          destination_country?: string | null
          hs_code?: string
          id?: string
          jurisdiction_code?: string | null
          mode?: Database["public"]["Enums"]["transport_mode"]
          origin_country?: string | null
          risk_notes?: string | null
          risk_score?: number
          shipment_id?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "ops_manager" | "analyst" | "viewer"
      shipment_status:
        | "in_transit"
        | "customs_hold"
        | "cleared"
        | "flagged"
        | "new"
        | "in_review"
        | "waiting_docs"
        | "sent_to_broker"
        | "escalated"
        | "corrected"
        | "filed"
        | "closed_avoided"
        | "closed_incident"
      subscription_tier: "free" | "gold" | "black"
      transport_mode: "air" | "sea" | "land"
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
      app_role: ["admin", "ops_manager", "analyst", "viewer"],
      shipment_status: [
        "in_transit",
        "customs_hold",
        "cleared",
        "flagged",
        "new",
        "in_review",
        "waiting_docs",
        "sent_to_broker",
        "escalated",
        "corrected",
        "filed",
        "closed_avoided",
        "closed_incident",
      ],
      subscription_tier: ["free", "gold", "black"],
      transport_mode: ["air", "sea", "land"],
    },
  },
} as const
