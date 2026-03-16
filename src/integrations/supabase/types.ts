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
      alert_rules: {
        Row: {
          channels: string[] | null
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          quiet_hours: Json | null
          severity_threshold: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          quiet_hours?: Json | null
          severity_threshold?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          quiet_hours?: Json | null
          severity_threshold?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_endpoints: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          integration_type: string
          is_enabled: boolean
          make_webhook_url_ref: string | null
          retry_policy: Json | null
          scenario_group: string | null
          scenario_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          integration_type?: string
          is_enabled?: boolean
          make_webhook_url_ref?: string | null
          retry_policy?: Json | null
          scenario_group?: string | null
          scenario_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          integration_type?: string
          is_enabled?: boolean
          make_webhook_url_ref?: string | null
          retry_policy?: Json | null
          scenario_group?: string | null
          scenario_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_endpoints_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      compliance_checks: {
        Row: {
          check_type: string
          checked_at: string | null
          findings: Json | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          shipment_id: string
          source_freshness: string | null
          status: string
          workspace_id: string | null
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          findings?: Json | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shipment_id: string
          source_freshness?: string | null
          status?: string
          workspace_id?: string | null
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          findings?: Json | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shipment_id?: string
          source_freshness?: string | null
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_health_status: {
        Row: {
          connector_name: string
          consecutive_failures: number
          created_at: string
          freshness_status: string
          id: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          metadata: Json | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connector_name: string
          consecutive_failures?: number
          created_at?: string
          freshness_status?: string
          id?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connector_name?: string
          consecutive_failures?: number
          created_at?: string
          freshness_status?: string
          id?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_health_status_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_approvals: {
        Row: {
          action: string
          actor_id: string
          comment: string | null
          created_at: string
          id: string
          scenario_id: string | null
          twin_id: string
        }
        Insert: {
          action: string
          actor_id: string
          comment?: string | null
          created_at?: string
          id?: string
          scenario_id?: string | null
          twin_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          scenario_id?: string | null
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_approvals_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "decision_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_approvals_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "decision_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_scenarios: {
        Row: {
          complexity_score: number | null
          compliance_risk_score: number | null
          created_at: string
          doc_risk_score: number | null
          hold_probability: number | null
          id: string
          is_selected: boolean
          label: string
          projected_cost: Json | null
          projected_eta: Json | null
          rank: number | null
          rank_explanation: string | null
          route_summary: string | null
          twin_id: string
        }
        Insert: {
          complexity_score?: number | null
          compliance_risk_score?: number | null
          created_at?: string
          doc_risk_score?: number | null
          hold_probability?: number | null
          id?: string
          is_selected?: boolean
          label: string
          projected_cost?: Json | null
          projected_eta?: Json | null
          rank?: number | null
          rank_explanation?: string | null
          route_summary?: string | null
          twin_id: string
        }
        Update: {
          complexity_score?: number | null
          compliance_risk_score?: number | null
          created_at?: string
          doc_risk_score?: number | null
          hold_probability?: number | null
          id?: string
          is_selected?: boolean
          label?: string
          projected_cost?: Json | null
          projected_eta?: Json | null
          rank?: number | null
          rank_explanation?: string | null
          route_summary?: string | null
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_scenarios_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "decision_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_twins: {
        Row: {
          clearance_probability: number | null
          confidence: number | null
          created_at: string
          delay_probability: number | null
          eta_range: Json | null
          evaluated_at: string | null
          explanation: string | null
          hold_probability: number | null
          id: string
          input_snapshot: Json
          landed_cost_range: Json | null
          prescriptive_actions: Json | null
          readiness_score: number | null
          readiness_state: string | null
          shipment_id: string
          stale_at: string | null
          status: string
          top_failure_point: string | null
          workspace_id: string | null
        }
        Insert: {
          clearance_probability?: number | null
          confidence?: number | null
          created_at?: string
          delay_probability?: number | null
          eta_range?: Json | null
          evaluated_at?: string | null
          explanation?: string | null
          hold_probability?: number | null
          id?: string
          input_snapshot?: Json
          landed_cost_range?: Json | null
          prescriptive_actions?: Json | null
          readiness_score?: number | null
          readiness_state?: string | null
          shipment_id: string
          stale_at?: string | null
          status?: string
          top_failure_point?: string | null
          workspace_id?: string | null
        }
        Update: {
          clearance_probability?: number | null
          confidence?: number | null
          created_at?: string
          delay_probability?: number | null
          eta_range?: Json | null
          evaluated_at?: string | null
          explanation?: string | null
          hold_probability?: number | null
          id?: string
          input_snapshot?: Json
          landed_cost_range?: Json | null
          prescriptive_actions?: Json | null
          readiness_score?: number | null
          readiness_state?: string | null
          shipment_id?: string
          stale_at?: string | null
          status?: string
          top_failure_point?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_twins_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delay_signals: {
        Row: {
          affects_modes: string[] | null
          confidence: number | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          location: string | null
          location_code: string | null
          metadata: Json | null
          severity: string
          signal_type: string
          source: string | null
        }
        Insert: {
          affects_modes?: string[] | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          location?: string | null
          location_code?: string | null
          metadata?: Json | null
          severity?: string
          signal_type: string
          source?: string | null
        }
        Update: {
          affects_modes?: string[] | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          location?: string | null
          location_code?: string | null
          metadata?: Json | null
          severity?: string
          signal_type?: string
          source?: string | null
        }
        Relationships: []
      }
      delivery_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event_id: string
          http_status: number | null
          id: string
          response_body: string | null
          status: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_id: string
          http_status?: number | null
          id?: string
          response_body?: string | null
          status?: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_id?: string
          http_status?: number | null
          id?: string
          response_body?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "outbound_event_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          created_at: string
          document_id: string | null
          extracted_fields: Json
          extraction_model: string | null
          field_confidence: Json | null
          id: string
          packet_id: string | null
          parse_warnings: string[] | null
          raw_text: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          extracted_fields?: Json
          extraction_model?: string | null
          field_confidence?: Json | null
          id?: string
          packet_id?: string | null
          parse_warnings?: string[] | null
          raw_text?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          extracted_fields?: Json
          extraction_model?: string | null
          field_confidence?: Json | null
          id?: string
          packet_id?: string | null
          parse_warnings?: string[] | null
          raw_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "shipment_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extractions_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "document_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      document_issues: {
        Row: {
          created_at: string
          description: string
          field_name: string | null
          id: string
          issue_type: string
          packet_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          suggestion: string | null
        }
        Insert: {
          created_at?: string
          description: string
          field_name?: string | null
          id?: string
          issue_type: string
          packet_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggestion?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          field_name?: string | null
          id?: string
          issue_type?: string
          packet_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_issues_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "document_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      document_packets: {
        Row: {
          completeness_score: number | null
          country_requirements: Json | null
          created_at: string
          filing_readiness_score: number | null
          id: string
          shipment_id: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          completeness_score?: number | null
          country_requirements?: Json | null
          created_at?: string
          filing_readiness_score?: number | null
          id?: string
          shipment_id: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          completeness_score?: number | null
          country_requirements?: Json | null
          created_at?: string
          filing_readiness_score?: number | null
          id?: string
          shipment_id?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_packets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          escalate_channel: string
          escalate_to_role: string
          event_type: string
          id: string
          unread_threshold_minutes: number
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          escalate_channel?: string
          escalate_to_role?: string
          event_type: string
          id?: string
          unread_threshold_minutes?: number
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          escalate_channel?: string
          escalate_to_role?: string
          event_type?: string
          id?: string
          unread_threshold_minutes?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      eta_predictions: {
        Row: {
          confidence: number | null
          created_at: string
          factors: Json | null
          id: string
          model_version: string | null
          predicted_earliest: string | null
          predicted_latest: string | null
          prior_prediction_id: string | null
          route_version_id: string | null
          shipment_id: string
          workspace_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          factors?: Json | null
          id?: string
          model_version?: string | null
          predicted_earliest?: string | null
          predicted_latest?: string | null
          prior_prediction_id?: string | null
          route_version_id?: string | null
          shipment_id: string
          workspace_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          factors?: Json | null
          id?: string
          model_version?: string | null
          predicted_earliest?: string | null
          predicted_latest?: string | null
          prior_prediction_id?: string | null
          route_version_id?: string | null
          shipment_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eta_predictions_prior_prediction_id_fkey"
            columns: ["prior_prediction_id"]
            isOneToOne: false
            referencedRelation: "eta_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_predictions_route_version_id_fkey"
            columns: ["route_version_id"]
            isOneToOne: false
            referencedRelation: "route_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_predictions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      external_object_links: {
        Row: {
          created_at: string
          external_entity_id: string
          external_entity_type: string | null
          external_system: string
          id: string
          internal_entity_id: string
          internal_entity_type: string
          last_synced_at: string | null
          metadata: Json | null
          sync_status: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          external_entity_id: string
          external_entity_type?: string | null
          external_system?: string
          id?: string
          internal_entity_id: string
          internal_entity_type: string
          last_synced_at?: string | null
          metadata?: Json | null
          sync_status?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          external_entity_id?: string
          external_entity_type?: string | null
          external_system?: string
          id?: string
          internal_entity_id?: string
          internal_entity_type?: string
          last_synced_at?: string | null
          metadata?: Json | null
          sync_status?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_object_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_reviews: {
        Row: {
          action: string
          created_at: string
          finding_key: string
          id: string
          note: string | null
          rule_id: string
          session_id: string
          status: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          finding_key: string
          id?: string
          note?: string | null
          rule_id: string
          session_id: string
          status?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          finding_key?: string
          id?: string
          note?: string | null
          rule_id?: string
          session_id?: string
          status?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      handoff_checkpoints: {
        Row: {
          actual_arrival: string | null
          address_or_region: string | null
          checkpoint_name: string
          checkpoint_type: Database["public"]["Enums"]["checkpoint_type"]
          created_at: string
          created_by: string | null
          handoff_status: Database["public"]["Enums"]["handoff_status"]
          id: string
          incident_flag: boolean
          incident_notes: string | null
          incident_type: string | null
          latitude: number | null
          longitude: number | null
          next_checkpoint_id: string | null
          planned_arrival: string | null
          product_condition:
            | Database["public"]["Enums"]["condition_status"]
            | null
          quality_notes: string | null
          quantity_expected: number | null
          quantity_received: number | null
          receiver_contact: string | null
          receiver_name: string | null
          receiver_team: string | null
          route_id: string | null
          sender_contact: string | null
          sender_name: string | null
          sender_team: string | null
          sequence_number: number
          shipment_id: string
          updated_at: string
          verified_at: string | null
          workspace_id: string | null
        }
        Insert: {
          actual_arrival?: string | null
          address_or_region?: string | null
          checkpoint_name: string
          checkpoint_type?: Database["public"]["Enums"]["checkpoint_type"]
          created_at?: string
          created_by?: string | null
          handoff_status?: Database["public"]["Enums"]["handoff_status"]
          id?: string
          incident_flag?: boolean
          incident_notes?: string | null
          incident_type?: string | null
          latitude?: number | null
          longitude?: number | null
          next_checkpoint_id?: string | null
          planned_arrival?: string | null
          product_condition?:
            | Database["public"]["Enums"]["condition_status"]
            | null
          quality_notes?: string | null
          quantity_expected?: number | null
          quantity_received?: number | null
          receiver_contact?: string | null
          receiver_name?: string | null
          receiver_team?: string | null
          route_id?: string | null
          sender_contact?: string | null
          sender_name?: string | null
          sender_team?: string | null
          sequence_number?: number
          shipment_id: string
          updated_at?: string
          verified_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          actual_arrival?: string | null
          address_or_region?: string | null
          checkpoint_name?: string
          checkpoint_type?: Database["public"]["Enums"]["checkpoint_type"]
          created_at?: string
          created_by?: string | null
          handoff_status?: Database["public"]["Enums"]["handoff_status"]
          id?: string
          incident_flag?: boolean
          incident_notes?: string | null
          incident_type?: string | null
          latitude?: number | null
          longitude?: number | null
          next_checkpoint_id?: string | null
          planned_arrival?: string | null
          product_condition?:
            | Database["public"]["Enums"]["condition_status"]
            | null
          quality_notes?: string | null
          quantity_expected?: number | null
          quantity_received?: number | null
          receiver_contact?: string | null
          receiver_name?: string | null
          receiver_team?: string | null
          route_id?: string | null
          sender_contact?: string | null
          sender_name?: string | null
          sender_team?: string | null
          sequence_number?: number
          shipment_id?: string
          updated_at?: string
          verified_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handoff_checkpoints_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      handoff_verifications: {
        Row: {
          accepted: boolean
          checkpoint_id: string
          condition_status:
            | Database["public"]["Enums"]["condition_status"]
            | null
          created_at: string
          discrepancy_notes: string | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          quality_status: string | null
          quantity_confirmed: number | null
          role: string
          verified_by: string | null
          verified_by_name: string | null
        }
        Insert: {
          accepted?: boolean
          checkpoint_id: string
          condition_status?:
            | Database["public"]["Enums"]["condition_status"]
            | null
          created_at?: string
          discrepancy_notes?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          quality_status?: string | null
          quantity_confirmed?: number | null
          role?: string
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Update: {
          accepted?: boolean
          checkpoint_id?: string
          condition_status?:
            | Database["public"]["Enums"]["condition_status"]
            | null
          created_at?: string
          discrepancy_notes?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          quality_status?: string | null
          quantity_confirmed?: number | null
          role?: string
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handoff_verifications_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "handoff_checkpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          result: Json | null
          scope: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          key: string
          result?: Json | null
          scope?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          result?: Json | null
          scope?: string
        }
        Relationships: []
      }
      inbound_webhook_log: {
        Row: {
          callback_type: string
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          payload: Json
          payload_hash: string | null
          processed_at: string | null
          processing_status: string
          received_at: string | null
          related_object_id: string | null
          related_object_type: string | null
          shipment_id: string | null
          signature_valid: boolean | null
          source_name: string | null
          source_type: string | null
          verification_status: string | null
          workspace_id: string | null
        }
        Insert: {
          callback_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json
          payload_hash?: string | null
          processed_at?: string | null
          processing_status?: string
          received_at?: string | null
          related_object_id?: string | null
          related_object_type?: string | null
          shipment_id?: string | null
          signature_valid?: boolean | null
          source_name?: string | null
          source_type?: string | null
          verification_status?: string | null
          workspace_id?: string | null
        }
        Update: {
          callback_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json
          payload_hash?: string | null
          processed_at?: string | null
          processing_status?: string
          received_at?: string | null
          related_object_id?: string | null
          related_object_type?: string | null
          shipment_id?: string | null
          signature_valid?: boolean | null
          source_name?: string | null
          source_type?: string | null
          verification_status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_webhook_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_error_log: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          event_id: string | null
          event_type: string | null
          id: string
          payload: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          source: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_error_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          input_event_id: string | null
          output_summary: Json | null
          run_id: string | null
          scenario_name: string
          started_at: string
          status: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          input_event_id?: string | null
          output_summary?: Json | null
          run_id?: string | null
          scenario_name: string
          started_at?: string
          status?: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          input_event_id?: string | null
          output_summary?: Json | null
          run_id?: string | null
          scenario_name?: string
          started_at?: string
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_runs_input_event_id_fkey"
            columns: ["input_event_id"]
            isOneToOne: false
            referencedRelation: "outbound_event_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      notification_delivery_log: {
        Row: {
          attempt_number: number
          channel: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_id: string
          status: string
        }
        Insert: {
          attempt_number?: number
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id: string
          status?: string
        }
        Update: {
          attempt_number?: number
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_preferences: Json | null
          created_at: string
          critical_override: boolean
          id: string
          quiet_hours: Json | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          channel_preferences?: Json | null
          created_at?: string
          critical_override?: boolean
          id?: string
          quiet_hours?: Json | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          channel_preferences?: Json | null
          created_at?: string
          critical_override?: boolean
          id?: string
          quiet_hours?: Json | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
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
      outbound_event_queue: {
        Row: {
          actor_id: string | null
          attempts: number
          correlation_id: string | null
          created_at: string
          dispatched_at: string | null
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          max_retries: number
          metadata: Json | null
          next_retry_at: string | null
          occurred_at: string
          payload: Json
          queued_at: string | null
          related_object_id: string | null
          related_object_type: string | null
          severity: string | null
          shipment_id: string | null
          status: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          dispatched_at?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          max_retries?: number
          metadata?: Json | null
          next_retry_at?: string | null
          occurred_at?: string
          payload?: Json
          queued_at?: string | null
          related_object_id?: string | null
          related_object_type?: string | null
          severity?: string | null
          shipment_id?: string | null
          status?: string
          version?: number
          workspace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          dispatched_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          max_retries?: number
          metadata?: Json | null
          next_retry_at?: string | null
          occurred_at?: string
          payload?: Json
          queued_at?: string | null
          related_object_id?: string | null
          related_object_type?: string | null
          severity?: string | null
          shipment_id?: string | null
          status?: string
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_event_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_records: {
        Row: {
          actual_clearance_result: string | null
          actual_delays: Json | null
          actual_delivery_date: string | null
          actual_issues: Json | null
          actual_landed_cost: number | null
          actual_route_used: string | null
          created_at: string
          id: string
          prediction_accuracy: Json | null
          shipment_id: string
          twin_id: string | null
          validated: boolean
          validated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          actual_clearance_result?: string | null
          actual_delays?: Json | null
          actual_delivery_date?: string | null
          actual_issues?: Json | null
          actual_landed_cost?: number | null
          actual_route_used?: string | null
          created_at?: string
          id?: string
          prediction_accuracy?: Json | null
          shipment_id: string
          twin_id?: string | null
          validated?: boolean
          validated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          actual_clearance_result?: string | null
          actual_delays?: Json | null
          actual_delivery_date?: string | null
          actual_issues?: Json | null
          actual_landed_cost?: number | null
          actual_route_used?: string | null
          created_at?: string
          id?: string
          prediction_accuracy?: Json | null
          shipment_id?: string
          twin_id?: string | null
          validated?: boolean
          validated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcome_records_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "decision_twins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      override_events: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          field_overridden: string
          id: string
          original_value: Json | null
          outcome_success: boolean | null
          override_value: Json | null
          reason: string | null
          user_id: string
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          field_overridden: string
          id?: string
          original_value?: Json | null
          outcome_success?: boolean | null
          override_value?: Json | null
          reason?: string | null
          user_id: string
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          field_overridden?: string
          id?: string
          original_value?: Json | null
          outcome_success?: boolean | null
          override_value?: Json | null
          reason?: string | null
          user_id?: string
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "override_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_classifications: {
        Row: {
          accepted_code: string | null
          ai_model_version: string | null
          candidate_codes: Json
          confidence: number | null
          created_at: string
          evidence: Json | null
          id: string
          overridden_by: string | null
          override_reason: string | null
          product_id: string | null
          restricted_flags: string[] | null
          shipment_id: string | null
          status: string
        }
        Insert: {
          accepted_code?: string | null
          ai_model_version?: string | null
          candidate_codes?: Json
          confidence?: number | null
          created_at?: string
          evidence?: Json | null
          id?: string
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          restricted_flags?: string[] | null
          shipment_id?: string | null
          status?: string
        }
        Update: {
          accepted_code?: string | null
          ai_model_version?: string | null
          candidate_codes?: Json
          confidence?: number | null
          created_at?: string
          evidence?: Json | null
          id?: string
          overridden_by?: string | null
          override_reason?: string | null
          product_id?: string | null
          restricted_flags?: string[] | null
          shipment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_classifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          destination_country: string | null
          dimensions: Json | null
          id: string
          image_urls: string[] | null
          intended_use: string | null
          material_composition: string | null
          metadata: Json | null
          origin_country: string | null
          title: string
          updated_at: string
          weight_kg: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_country?: string | null
          dimensions?: Json | null
          id?: string
          image_urls?: string[] | null
          intended_use?: string | null
          material_composition?: string | null
          metadata?: Json | null
          origin_country?: string | null
          title: string
          updated_at?: string
          weight_kg?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_country?: string | null
          dimensions?: Json | null
          id?: string
          image_urls?: string[] | null
          intended_use?: string | null
          material_composition?: string | null
          metadata?: Json | null
          origin_country?: string | null
          title?: string
          updated_at?: string
          weight_kg?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      reconciliation_jobs: {
        Row: {
          auto_fixed: number | null
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          id: string
          job_type: string
          manual_review_needed: number | null
          mismatches_found: number | null
          scope: string | null
          started_at: string | null
          status: string
          summary: Json | null
          total_checked: number | null
          triggered_by: string | null
          workspace_id: string | null
        }
        Insert: {
          auto_fixed?: number | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          job_type: string
          manual_review_needed?: number | null
          mismatches_found?: number | null
          scope?: string | null
          started_at?: string | null
          status?: string
          summary?: Json | null
          total_checked?: number | null
          triggered_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          auto_fixed?: number | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          job_type?: string
          manual_review_needed?: number | null
          mismatches_found?: number | null
          scope?: string | null
          started_at?: string | null
          status?: string
          summary?: Json | null
          total_checked?: number | null
          triggered_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_queue: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          failed_event_id: string | null
          id: string
          replay_status: string
          replayed_at: string | null
          requested_at: string
          requested_by: string | null
          result: Json | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          failed_event_id?: string | null
          id?: string
          replay_status?: string
          replayed_at?: string | null
          requested_at?: string
          requested_by?: string | null
          result?: Json | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          failed_event_id?: string | null
          id?: string
          replay_status?: string
          replayed_at?: string | null
          requested_at?: string
          requested_by?: string | null
          result?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replay_queue_failed_event_id_fkey"
            columns: ["failed_event_id"]
            isOneToOne: false
            referencedRelation: "outbound_event_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replay_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      route_recommendations: {
        Row: {
          ai_model_version: string | null
          confidence: number | null
          constraints: Json | null
          created_at: string
          destination: Json
          freshness: string | null
          id: string
          mode: string
          options: Json
          origin: Json
          priority: string
          selected_option_index: number | null
          shipment_id: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_model_version?: string | null
          confidence?: number | null
          constraints?: Json | null
          created_at?: string
          destination: Json
          freshness?: string | null
          id?: string
          mode: string
          options?: Json
          origin: Json
          priority?: string
          selected_option_index?: number | null
          shipment_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_model_version?: string | null
          confidence?: number | null
          constraints?: Json | null
          created_at?: string
          destination?: Json
          freshness?: string | null
          id?: string
          mode?: string
          options?: Json
          origin?: Json
          priority?: string
          selected_option_index?: number | null
          shipment_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_recommendations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_alerts: {
        Row: {
          created_at: string
          entity_name: string
          id: string
          list_freshness: string | null
          list_source: string | null
          match_confidence: number | null
          match_type: string | null
          reviewed_by: string | null
          shipment_id: string | null
          status: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          entity_name: string
          id?: string
          list_freshness?: string | null
          list_source?: string | null
          match_confidence?: number | null
          match_type?: string | null
          reviewed_by?: string | null
          shipment_id?: string | null
          status?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          entity_name?: string
          id?: string
          list_freshness?: string | null
          list_source?: string | null
          match_confidence?: number | null
          match_type?: string | null
          reviewed_by?: string | null
          shipment_id?: string | null
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_routes: {
        Row: {
          created_at: string
          deleted_at: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          id: string
          is_template: boolean
          mode: string
          name: string
          network_route: Json | null
          notes: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_name: string | null
          segments: Json
          sensitivity: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          id?: string
          is_template?: boolean
          mode?: string
          name?: string
          network_route?: Json | null
          notes?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          segments?: Json
          sensitivity?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          id?: string
          is_template?: boolean
          mode?: string
          name?: string
          network_route?: Json | null
          notes?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          segments?: Json
          sensitivity?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_routes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      shipment_watchlist: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pinned: boolean
          priority: string
          shipment_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pinned?: boolean
          priority?: string
          shipment_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pinned?: boolean
          priority?: string
          shipment_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          direction: string
          error_summary: string | null
          failed_events: number
          id: string
          job_type: string
          last_error: string | null
          processed_events: number
          retry_count: number | null
          source_system: string | null
          started_at: string | null
          status: string
          target_system: string | null
          total_events: number
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          direction?: string
          error_summary?: string | null
          failed_events?: number
          id?: string
          job_type: string
          last_error?: string | null
          processed_events?: number
          retry_count?: number | null
          source_system?: string | null
          started_at?: string | null
          status?: string
          target_system?: string | null
          total_events?: number
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          direction?: string
          error_summary?: string | null
          failed_events?: number
          id?: string
          job_type?: string
          last_error?: string | null
          processed_events?: number
          retry_count?: number | null
          source_system?: string | null
          started_at?: string | null
          status?: string
          target_system?: string | null
          total_events?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      validation_sessions: {
        Row: {
          completeness_score: number | null
          consistency_score: number | null
          created_at: string
          cross_doc_mismatches: Json | null
          declared_value: string | null
          destination_country: string | null
          disposition: string | null
          documents: Json | null
          hs_code: string | null
          id: string
          notes: string | null
          origin_country: string | null
          overall_readiness: string | null
          shipment_id: string | null
          shipment_mode: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string | null
          validation_result: Json | null
          workspace_id: string | null
        }
        Insert: {
          completeness_score?: number | null
          consistency_score?: number | null
          created_at?: string
          cross_doc_mismatches?: Json | null
          declared_value?: string | null
          destination_country?: string | null
          disposition?: string | null
          documents?: Json | null
          hs_code?: string | null
          id?: string
          notes?: string | null
          origin_country?: string | null
          overall_readiness?: string | null
          shipment_id?: string | null
          shipment_mode?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
          validation_result?: Json | null
          workspace_id?: string | null
        }
        Update: {
          completeness_score?: number | null
          consistency_score?: number | null
          created_at?: string
          cross_doc_mismatches?: Json | null
          declared_value?: string | null
          destination_country?: string | null
          disposition?: string | null
          documents?: Json | null
          hs_code?: string | null
          id?: string
          notes?: string | null
          origin_country?: string | null
          overall_readiness?: string | null
          shipment_id?: string | null
          shipment_mode?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
          validation_result?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      view_presets: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          preset_type: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          preset_type?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          preset_type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "view_presets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string
          event_type: string
          failure_count: number
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          last_triggered_at: string | null
          secret_ref: string | null
          target_url: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          secret_ref?: string | null
          target_url: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          secret_ref?: string | null
          target_url?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_integration_settings: {
        Row: {
          created_at: string
          enabled: boolean
          event_filters: string[]
          health_status: string
          id: string
          last_failed_sync: string | null
          last_successful_sync: string | null
          provider: string
          retry_policy: Json
          scenario_mapping: Json
          shared_secret: string | null
          updated_at: string
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_filters?: string[]
          health_status?: string
          id?: string
          last_failed_sync?: string | null
          last_successful_sync?: string | null
          provider?: string
          retry_policy?: Json
          scenario_mapping?: Json
          shared_secret?: string | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_filters?: string[]
          health_status?: string
          id?: string
          last_failed_sync?: string | null
          last_successful_sync?: string | null
          provider?: string
          retry_policy?: Json
          scenario_mapping?: Json
          shared_secret?: string | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_integration_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          permissions: Json | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          permissions?: Json | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          permissions?: Json | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
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
      has_workspace_permission: {
        Args: { _permission: string; _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      trigger_notify: {
        Args: {
          _body?: string
          _event_type: string
          _link?: string
          _severity: string
          _shipment_id?: string
          _title: string
          _workspace_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "ops_manager" | "analyst" | "viewer"
      checkpoint_type:
        | "factory_release"
        | "warehouse_transfer"
        | "port_handoff"
        | "airport_handoff"
        | "customs_checkpoint"
        | "cross_dock"
        | "inland_carrier_transfer"
        | "bonded_warehouse"
        | "distributor_transfer"
        | "final_consignee_delivery"
      condition_status:
        | "intact"
        | "minor_damage"
        | "major_damage"
        | "seal_broken"
        | "packaging_compromised"
        | "temperature_concern"
        | "quantity_mismatch"
        | "wrong_goods_suspected"
        | "rejected"
        | "accepted_with_notes"
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
      handoff_status:
        | "pending"
        | "upcoming"
        | "awaiting_sender"
        | "awaiting_receiver"
        | "verified"
        | "issue_flagged"
        | "completed"
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
      checkpoint_type: [
        "factory_release",
        "warehouse_transfer",
        "port_handoff",
        "airport_handoff",
        "customs_checkpoint",
        "cross_dock",
        "inland_carrier_transfer",
        "bonded_warehouse",
        "distributor_transfer",
        "final_consignee_delivery",
      ],
      condition_status: [
        "intact",
        "minor_damage",
        "major_damage",
        "seal_broken",
        "packaging_compromised",
        "temperature_concern",
        "quantity_mismatch",
        "wrong_goods_suspected",
        "rejected",
        "accepted_with_notes",
      ],
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
      handoff_status: [
        "pending",
        "upcoming",
        "awaiting_sender",
        "awaiting_receiver",
        "verified",
        "issue_flagged",
        "completed",
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
