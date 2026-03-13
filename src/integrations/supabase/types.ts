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
      brokers: {
        Row: {
          aliases: string[]
          broker_type: string | null
          canonical_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          internal_vendor_id: string | null
          notes: string | null
          office: string | null
          region: string | null
          updated_at: string
          watchlist_tag: string | null
        }
        Insert: {
          aliases?: string[]
          broker_type?: string | null
          canonical_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          internal_vendor_id?: string | null
          notes?: string | null
          office?: string | null
          region?: string | null
          updated_at?: string
          watchlist_tag?: string | null
        }
        Update: {
          aliases?: string[]
          broker_type?: string | null
          canonical_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          internal_vendor_id?: string | null
          notes?: string | null
          office?: string | null
          region?: string | null
          updated_at?: string
          watchlist_tag?: string | null
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          name: string
          shipment_id: string | null
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          name: string
          shipment_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          shipment_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          mentions: string[]
          metadata: Json | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          mentions?: string[]
          metadata?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          mentions?: string[]
          metadata?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
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
      logic_audit_log: {
        Row: {
          action_type: string
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          broker_id: string | null
          created_at: string
          field_changed: string
          id: string
          jurisdiction: string | null
          module: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          requires_approval: boolean
          rule_set: string | null
          status: string
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action_type: string
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          broker_id?: string | null
          created_at?: string
          field_changed: string
          id?: string
          jurisdiction?: string | null
          module: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          requires_approval?: boolean
          rule_set?: string | null
          status?: string
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action_type?: string
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          broker_id?: string | null
          created_at?: string
          field_changed?: string
          id?: string
          jurisdiction?: string | null
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          requires_approval?: boolean
          rule_set?: string | null
          status?: string
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logic_audit_log_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_type: string
          id: string
          is_read: boolean
          link: string | null
          metadata: Json | null
          severity: string
          shipment_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          severity?: string
          shipment_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          severity?: string
          shipment_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          compliance_pulse_opt_in: boolean
          created_at: string
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
      shipment_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_current: boolean
          notes: string | null
          replaced_by: string | null
          shipment_id: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          notes?: string | null
          replaced_by?: string | null
          shipment_id: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          notes?: string | null
          replaced_by?: string | null
          shipment_id?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipment_documents_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "shipment_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          attribution: string | null
          broker_id: string | null
          confidence_level: number | null
          created_at: string
          description: string
          event_type: string
          evidence_quality: string | null
          evidence_reference: string | null
          id: string
          metadata: Json | null
          shipment_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          attribution?: string | null
          broker_id?: string | null
          confidence_level?: number | null
          created_at?: string
          description: string
          event_type: string
          evidence_quality?: string | null
          evidence_reference?: string | null
          id?: string
          metadata?: Json | null
          shipment_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          attribution?: string | null
          broker_id?: string | null
          confidence_level?: number | null
          created_at?: string
          description?: string
          event_type?: string
          evidence_quality?: string | null
          evidence_reference?: string | null
          id?: string
          metadata?: Json | null
          shipment_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          assigned_broker: string | null
          broker_id: string | null
          consignee: string
          coo_status: string | null
          created_at: string
          currency: string | null
          declared_value: number
          description: string
          destination_country: string | null
          direction: Database["public"]["Enums"]["shipment_direction"] | null
          estimated_arrival: string | null
          export_country: string | null
          filing_readiness: string | null
          filing_status: string | null
          forwarder: string | null
          hs_code: string
          id: string
          import_country: string | null
          incoterm: string | null
          jurisdiction_code: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          origin_country: string | null
          packet_score: number | null
          planned_departure: string | null
          port_of_entry: string | null
          priority: string | null
          quantity: number | null
          risk_notes: string | null
          risk_score: number
          shipment_id: string
          shipper: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
        }
        Insert: {
          assigned_broker?: string | null
          broker_id?: string | null
          consignee: string
          coo_status?: string | null
          created_at?: string
          currency?: string | null
          declared_value?: number
          description: string
          destination_country?: string | null
          direction?: Database["public"]["Enums"]["shipment_direction"] | null
          estimated_arrival?: string | null
          export_country?: string | null
          filing_readiness?: string | null
          filing_status?: string | null
          forwarder?: string | null
          hs_code: string
          id?: string
          import_country?: string | null
          incoterm?: string | null
          jurisdiction_code?: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          origin_country?: string | null
          packet_score?: number | null
          planned_departure?: string | null
          port_of_entry?: string | null
          priority?: string | null
          quantity?: number | null
          risk_notes?: string | null
          risk_score?: number
          shipment_id: string
          shipper?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Update: {
          assigned_broker?: string | null
          broker_id?: string | null
          consignee?: string
          coo_status?: string | null
          created_at?: string
          currency?: string | null
          declared_value?: number
          description?: string
          destination_country?: string | null
          direction?: Database["public"]["Enums"]["shipment_direction"] | null
          estimated_arrival?: string | null
          export_country?: string | null
          filing_readiness?: string | null
          filing_status?: string | null
          forwarder?: string | null
          hs_code?: string
          id?: string
          import_country?: string | null
          incoterm?: string | null
          jurisdiction_code?: string | null
          mode?: Database["public"]["Enums"]["transport_mode"]
          origin_country?: string | null
          packet_score?: number | null
          planned_departure?: string | null
          port_of_entry?: string | null
          priority?: string | null
          quantity?: number | null
          risk_notes?: string | null
          risk_score?: number
          shipment_id?: string
          shipper?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
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
      document_type:
        | "commercial_invoice"
        | "packing_list"
        | "bill_of_lading"
        | "air_waybill"
        | "certificate_of_origin"
        | "dangerous_goods_declaration"
        | "export_license"
        | "import_permit"
        | "phytosanitary_certificate"
        | "fumigation_certificate"
        | "insurance_certificate"
        | "customs_declaration"
        | "inspection_certificate"
        | "multimodal_transport_doc"
        | "other"
      shipment_direction: "inbound" | "outbound"
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
      document_type: [
        "commercial_invoice",
        "packing_list",
        "bill_of_lading",
        "air_waybill",
        "certificate_of_origin",
        "dangerous_goods_declaration",
        "export_license",
        "import_permit",
        "phytosanitary_certificate",
        "fumigation_certificate",
        "insurance_certificate",
        "customs_declaration",
        "inspection_certificate",
        "multimodal_transport_doc",
        "other",
      ],
      shipment_direction: ["inbound", "outbound"],
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
