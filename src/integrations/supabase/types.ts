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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_authoring_context: {
        Row: {
          body_markdown: string
          context_name: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          version: number
        }
        Insert: {
          body_markdown: string
          context_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          version: number
        }
        Update: {
          body_markdown?: string
          context_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_authoring_context_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_context_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_authoring_context_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_context_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_authoring_conversations: {
        Row: {
          attached_document_ids: string[]
          author_id: string
          content_item_id: string
          created_at: string
          custom_voice_example: string | null
          custom_voice_guidance: string | null
          full_content_state: Json | null
          id: string
          length_preference: string | null
          messages: Json
          mode: string
          outline_state: Json | null
          stage: string
          updated_at: string
          voice_preset_key: string | null
        }
        Insert: {
          attached_document_ids?: string[]
          author_id: string
          content_item_id: string
          created_at?: string
          custom_voice_example?: string | null
          custom_voice_guidance?: string | null
          full_content_state?: Json | null
          id?: string
          length_preference?: string | null
          messages?: Json
          mode?: string
          outline_state?: Json | null
          stage?: string
          updated_at?: string
          voice_preset_key?: string | null
        }
        Update: {
          attached_document_ids?: string[]
          author_id?: string
          content_item_id?: string
          created_at?: string
          custom_voice_example?: string | null
          custom_voice_guidance?: string | null
          full_content_state?: Json | null
          id?: string
          length_preference?: string | null
          messages?: Json
          mode?: string
          outline_state?: Json | null
          stage?: string
          updated_at?: string
          voice_preset_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_authoring_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_authoring_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_authoring_session_documents: {
        Row: {
          author_id: string
          content_item_id: string
          expires_at: string
          extracted_text: string
          extracted_text_token_count: number
          file_name: string
          file_size_bytes: number
          id: string
          last_accessed_at: string
          mime_type: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          author_id: string
          content_item_id: string
          expires_at?: string
          extracted_text: string
          extracted_text_token_count: number
          file_name: string
          file_size_bytes: number
          id?: string
          last_accessed_at?: string
          mime_type: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          author_id?: string
          content_item_id?: string
          expires_at?: string
          extracted_text?: string
          extracted_text_token_count?: number
          file_name?: string
          file_size_bytes?: number
          id?: string
          last_accessed_at?: string
          mime_type?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_authoring_session_documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_session_documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_authoring_session_documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_session_documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_authoring_voice_presets: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          display_order: number
          example_paragraph: string
          id: string
          is_active: boolean
          is_system: boolean
          preset_key: string
          short_description: string
          updated_at: string
          updated_by: string | null
          voice_guidance_markdown: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          display_order?: number
          example_paragraph: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          preset_key: string
          short_description: string
          updated_at?: string
          updated_by?: string | null
          voice_guidance_markdown: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          display_order?: number
          example_paragraph?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          preset_key?: string
          short_description?: string
          updated_at?: string
          updated_by?: string | null
          voice_guidance_markdown?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_authoring_voice_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_voice_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_authoring_voice_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_voice_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_voice_presets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_voice_presets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_authoring_voice_presets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_authoring_voice_presets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          id: string
          last_used_at: string
          message_count: number
          month_year: string
          usage_type: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_used_at?: string
          message_count?: number
          month_year: string
          usage_type?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_used_at?: string
          message_count?: number
          month_year?: string
          usage_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_counters: {
        Row: {
          count: number
          created_at: string
          id: string
          organization_id: string
          period_start: string
          pool_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          organization_id: string
          period_start: string
          pool_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          organization_id?: string
          period_start?: string
          pool_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_versions: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          model_id: string
          prompt_version: number
          system_prompt: string
          user_prompt_template: string
          version_string: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model_id: string
          prompt_version: number
          system_prompt: string
          user_prompt_template: string
          version_string: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model_id?: string
          prompt_version?: number
          system_prompt?: string
          user_prompt_template?: string
          version_string?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ai_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      airsa_skills: {
        Row: {
          behavioral_indicators: Json
          created_at: string
          dimension_id: string
          full_definition: string
          is_new_skill: boolean
          item_number: number
          primary_p: string | null
          secondary_ps: Json
          short_description: string
          skill_name: string
          theoretical_basis: string | null
          updated_at: string
        }
        Insert: {
          behavioral_indicators?: Json
          created_at?: string
          dimension_id: string
          full_definition: string
          is_new_skill?: boolean
          item_number: number
          primary_p?: string | null
          secondary_ps?: Json
          short_description: string
          skill_name: string
          theoretical_basis?: string | null
          updated_at?: string
        }
        Update: {
          behavioral_indicators?: Json
          created_at?: string
          dimension_id?: string
          full_definition?: string
          is_new_skill?: boolean
          item_number?: number
          primary_p?: string | null
          secondary_ps?: Json
          short_description?: string
          skill_name?: string
          theoretical_basis?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "airsa_skills_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["dimension_id"]
          },
        ]
      }
      assessment_acknowledgments: {
        Row: {
          acknowledged_at: string
          acknowledgment_kind: string
          assessment_id: string
          id: string
          instrument_id: string
          ip_address: unknown
          rater_type: string
          user_agent: string | null
          user_id: string
          version_hash: string
        }
        Insert: {
          acknowledged_at?: string
          acknowledgment_kind?: string
          assessment_id: string
          id?: string
          instrument_id: string
          ip_address?: unknown
          rater_type?: string
          user_agent?: string | null
          user_id: string
          version_hash: string
        }
        Update: {
          acknowledged_at?: string
          acknowledgment_kind?: string
          assessment_id?: string
          id?: string
          instrument_id?: string
          ip_address?: unknown
          rater_type?: string
          user_agent?: string | null
          user_id?: string
          version_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_acknowledgments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "assessment_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_purchases: {
        Row: {
          amount_paid: number
          coach_client_id: string | null
          consumed_at: string | null
          consumed_by_assessment_id: string | null
          context_progress: string | null
          id: string
          instrument_id: string
          paired_assessment_id: string | null
          purchased_at: string
          refund_amount: number | null
          refund_failure_reason: string | null
          refund_processed_by: string | null
          refunded_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          coach_client_id?: string | null
          consumed_at?: string | null
          consumed_by_assessment_id?: string | null
          context_progress?: string | null
          id?: string
          instrument_id: string
          paired_assessment_id?: string | null
          purchased_at?: string
          refund_amount?: number | null
          refund_failure_reason?: string | null
          refund_processed_by?: string | null
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          coach_client_id?: string | null
          consumed_at?: string | null
          consumed_by_assessment_id?: string | null
          context_progress?: string | null
          id?: string
          instrument_id?: string
          paired_assessment_id?: string | null
          purchased_at?: string
          refund_amount?: number | null
          refund_failure_reason?: string | null
          refund_processed_by?: string | null
          refunded_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_purchases_coach_client_id_fkey"
            columns: ["coach_client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_coach_client_id_fkey"
            columns: ["coach_client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients_client_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_consumed_by_assessment_id_fkey"
            columns: ["consumed_by_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_paired_assessment_id_fkey"
            columns: ["paired_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_refund_processed_by_fkey"
            columns: ["refund_processed_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_refund_processed_by_fkey"
            columns: ["refund_processed_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "assessment_purchases_refund_processed_by_fkey"
            columns: ["refund_processed_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_refund_processed_by_fkey"
            columns: ["refund_processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "assessment_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_id: string
          id: string
          is_reverse_scored: boolean
          item_id: string
          readiness_level: string | null
          response_value_numeric: number
          response_value_text: string | null
          saved_at: string
        }
        Insert: {
          assessment_id: string
          id?: string
          is_reverse_scored?: boolean
          item_id: string
          readiness_level?: string | null
          response_value_numeric: number
          response_value_text?: string | null
          saved_at?: string
        }
        Update: {
          assessment_id?: string
          id?: string
          is_reverse_scored?: boolean
          item_id?: string
          readiness_level?: string | null
          response_value_numeric?: number
          response_value_text?: string | null
          saved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          ai_narrative: string | null
          ai_narrative_generated_at: string | null
          ai_version: string | null
          ai_version_history: Json
          assessment_id: string
          created_at: string
          dimension_scores: Json
          facet_insights_all_total: number | null
          id: string
          instrument_id: string | null
          instrument_version: string | null
          manager_dimension_scores: Json | null
          narrative_completed_at: string | null
          narrative_started_at: string | null
          narrative_status: string | null
          overall_profile: Json | null
          self_manager_divergence: Json | null
          skill_level_breakdown: Json | null
          superseded_at: string | null
          superseded_reason: string | null
          user_id: string
        }
        Insert: {
          ai_narrative?: string | null
          ai_narrative_generated_at?: string | null
          ai_version?: string | null
          ai_version_history?: Json
          assessment_id: string
          created_at?: string
          dimension_scores: Json
          facet_insights_all_total?: number | null
          id?: string
          instrument_id?: string | null
          instrument_version?: string | null
          manager_dimension_scores?: Json | null
          narrative_completed_at?: string | null
          narrative_started_at?: string | null
          narrative_status?: string | null
          overall_profile?: Json | null
          self_manager_divergence?: Json | null
          skill_level_breakdown?: Json | null
          superseded_at?: string | null
          superseded_reason?: string | null
          user_id: string
        }
        Update: {
          ai_narrative?: string | null
          ai_narrative_generated_at?: string | null
          ai_version?: string | null
          ai_version_history?: Json
          assessment_id?: string
          created_at?: string
          dimension_scores?: Json
          facet_insights_all_total?: number | null
          id?: string
          instrument_id?: string | null
          instrument_version?: string | null
          manager_dimension_scores?: Json | null
          narrative_completed_at?: string | null
          narrative_started_at?: string | null
          narrative_status?: string | null
          overall_profile?: Json | null
          self_manager_divergence?: Json | null
          skill_level_breakdown?: Json | null
          superseded_at?: string | null
          superseded_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "assessment_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "assessment_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          completed_at: string | null
          context_type: string | null
          entitlement_source: string | null
          id: string
          instrument_id: string
          instrument_version: string
          last_reminder_sent_at: string | null
          ordered_by_coach_id: string | null
          paired_assessment_id: string | null
          rater_type: string
          reminder_count: number
          self_only_released_at: string | null
          started_at: string
          status: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context_type?: string | null
          entitlement_source?: string | null
          id?: string
          instrument_id: string
          instrument_version: string
          last_reminder_sent_at?: string | null
          ordered_by_coach_id?: string | null
          paired_assessment_id?: string | null
          rater_type?: string
          reminder_count?: number
          self_only_released_at?: string | null
          started_at?: string
          status?: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context_type?: string | null
          entitlement_source?: string | null
          id?: string
          instrument_id?: string
          instrument_version?: string
          last_reminder_sent_at?: string | null
          ordered_by_coach_id?: string | null
          paired_assessment_id?: string | null
          rater_type?: string
          reminder_count?: number
          self_only_released_at?: string | null
          started_at?: string
          status?: string
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "assessments_ordered_by_coach_id_fkey"
            columns: ["ordered_by_coach_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_ordered_by_coach_id_fkey"
            columns: ["ordered_by_coach_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "assessments_ordered_by_coach_id_fkey"
            columns: ["ordered_by_coach_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_ordered_by_coach_id_fkey"
            columns: ["ordered_by_coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_paired_assessment_id_fkey"
            columns: ["paired_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "assessments_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_requests: {
        Row: {
          client_ip: unknown
          company: string
          created_at: string
          email: string
          email_send_error: string | null
          email_send_status: string
          email_sent_at: string | null
          id: string
          message: string | null
          name: string
          role: string
          source: string
          status: string
          user_agent: string | null
        }
        Insert: {
          client_ip?: unknown
          company: string
          created_at?: string
          email: string
          email_send_error?: string | null
          email_send_status?: string
          email_sent_at?: string | null
          id?: string
          message?: string | null
          name: string
          role: string
          source?: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          client_ip?: unknown
          company?: string
          created_at?: string
          email?: string
          email_send_error?: string | null
          email_send_status?: string
          email_sent_at?: string | null
          id?: string
          message?: string | null
          name?: string
          role?: string
          source?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      cafes_ptp_mapping: {
        Row: {
          coaching_questions: Json
          created_at: string | null
          facets: Json
          id: string
          nai_dimension_id: string
          primary_ptp_domain: string
          secondary_ptp_domain: string
        }
        Insert: {
          coaching_questions: Json
          created_at?: string | null
          facets: Json
          id?: string
          nai_dimension_id: string
          primary_ptp_domain: string
          secondary_ptp_domain: string
        }
        Update: {
          coaching_questions?: Json
          created_at?: string | null
          facets?: Json
          id?: string
          nai_dimension_id?: string
          primary_ptp_domain?: string
          secondary_ptp_domain?: string
        }
        Relationships: []
      }
      certification_path_curricula: {
        Row: {
          certification_path_id: string
          created_at: string
          created_by: string | null
          curriculum_id: string
          display_order: number
          id: string
          is_required: boolean
          prerequisite_curriculum_id: string | null
        }
        Insert: {
          certification_path_id: string
          created_at?: string
          created_by?: string | null
          curriculum_id: string
          display_order?: number
          id?: string
          is_required?: boolean
          prerequisite_curriculum_id?: string | null
        }
        Update: {
          certification_path_id?: string
          created_at?: string
          created_by?: string | null
          curriculum_id?: string
          display_order?: number
          id?: string
          is_required?: boolean
          prerequisite_curriculum_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_path_curricula_certification_path_id_fkey"
            columns: ["certification_path_id"]
            isOneToOne: false
            referencedRelation: "certification_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_path_curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_path_curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "certification_path_curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_path_curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_path_curricula_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_path_curricula_prerequisite_curriculum_id_fkey"
            columns: ["prerequisite_curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_paths: {
        Row: {
          archived_at: string | null
          cert_dimension_ids: Json
          cert_instrument_ids: Json
          certification_type: string
          created_at: string
          created_by: string | null
          delivery_mode: string
          description: string | null
          display_order: number
          id: string
          is_published: boolean
          is_self_enrollable: boolean
          name: string
          prerequisite_path_id: string | null
          self_enroll_currency: string
          self_enroll_price_cents: number | null
          slug: string
          thumbnail_asset_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          cert_dimension_ids?: Json
          cert_instrument_ids?: Json
          certification_type: string
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          description?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          is_self_enrollable?: boolean
          name: string
          prerequisite_path_id?: string | null
          self_enroll_currency?: string
          self_enroll_price_cents?: number | null
          slug: string
          thumbnail_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          cert_dimension_ids?: Json
          cert_instrument_ids?: Json
          certification_type?: string
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          description?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          is_self_enrollable?: boolean
          name?: string
          prerequisite_path_id?: string | null
          self_enroll_currency?: string
          self_enroll_price_cents?: number | null
          slug?: string
          thumbnail_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "certification_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_paths_prerequisite_path_id_fkey"
            columns: ["prerequisite_path_id"]
            isOneToOne: false
            referencedRelation: "certification_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_paths_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_paths_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_paths_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "certification_paths_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_paths_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_credit_grants: {
        Row: {
          amount: number
          created_at: string
          id: string
          source: string
          source_ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source: string
          source_ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source?: string
          source_ref?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "chat_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          assessment_result_ids: string[]
          created_at: string | null
          ended_at: string | null
          id: string
          message_count: number | null
          messages: Json
          started_at: string
          user_id: string
        }
        Insert: {
          assessment_result_ids?: string[]
          created_at?: string | null
          ended_at?: string | null
          id?: string
          message_count?: number | null
          messages?: Json
          started_at?: string
          user_id: string
        }
        Update: {
          assessment_result_ids?: string[]
          created_at?: string | null
          ended_at?: string | null
          id?: string
          message_count?: number | null
          messages?: Json
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_certification_actors: {
        Row: {
          access_code: string
          actor_email: string
          actor_first_name: string | null
          actor_type: string | null
          assessment_id: string | null
          certification_id: string
          coach_client_id: string | null
          coach_user_id: string
          completed_at: string | null
          created_at: string
          id: string
          instrument_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          access_code?: string
          actor_email: string
          actor_first_name?: string | null
          actor_type?: string | null
          assessment_id?: string | null
          certification_id: string
          coach_client_id?: string | null
          coach_user_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instrument_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          access_code?: string
          actor_email?: string
          actor_first_name?: string | null
          actor_type?: string | null
          assessment_id?: string | null
          certification_id?: string
          coach_client_id?: string | null
          coach_user_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instrument_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_certification_actors_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certification_actors_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "coach_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certification_actors_coach_client_id_fkey"
            columns: ["coach_client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certification_actors_coach_client_id_fkey"
            columns: ["coach_client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients_client_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certification_actors_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certification_actors_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_certification_actors_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certification_actors_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_certifications: {
        Row: {
          certification_type: string
          certified_at: string | null
          certified_by: string | null
          created_at: string
          enrolled_by: string
          free_assessment_uses: Json
          free_uses_expire_at: string | null
          id: string
          notes: string | null
          post_certification_benefit_applied_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          certification_type: string
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          enrolled_by: string
          free_assessment_uses?: Json
          free_uses_expire_at?: string | null
          id?: string
          notes?: string | null
          post_certification_benefit_applied_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          certification_type?: string
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          enrolled_by?: string
          free_assessment_uses?: Json
          free_uses_expire_at?: string | null
          id?: string
          notes?: string | null
          post_certification_benefit_applied_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_certifications_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_certifications_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_certifications_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients: {
        Row: {
          actor_id: string | null
          assessment_id: string | null
          client_email: string
          client_first_name: string | null
          client_last_name: string | null
          client_user_id: string | null
          coach_notes: string | null
          coach_user_id: string
          context_progress: string | null
          coupon_amount: number | null
          coupon_expires_at: string | null
          coupon_redeemed: boolean
          created_at: string
          debrief_completed: boolean
          expires_at: string | null
          id: string
          instrument_id: string | null
          invitation_source: string
          invitation_status: string
          paired_assessment_id: string | null
          refund_amount: number | null
          refund_failure_reason: string | null
          refunded_at: string | null
          results_released: boolean
          revoked_at: string | null
          stripe_coupon_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
        }
        Insert: {
          actor_id?: string | null
          assessment_id?: string | null
          client_email: string
          client_first_name?: string | null
          client_last_name?: string | null
          client_user_id?: string | null
          coach_notes?: string | null
          coach_user_id: string
          context_progress?: string | null
          coupon_amount?: number | null
          coupon_expires_at?: string | null
          coupon_redeemed?: boolean
          created_at?: string
          debrief_completed?: boolean
          expires_at?: string | null
          id?: string
          instrument_id?: string | null
          invitation_source?: string
          invitation_status?: string
          paired_assessment_id?: string | null
          refund_amount?: number | null
          refund_failure_reason?: string | null
          refunded_at?: string | null
          results_released?: boolean
          revoked_at?: string | null
          stripe_coupon_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
        }
        Update: {
          actor_id?: string | null
          assessment_id?: string | null
          client_email?: string
          client_first_name?: string | null
          client_last_name?: string | null
          client_user_id?: string | null
          coach_notes?: string | null
          coach_user_id?: string
          context_progress?: string | null
          coupon_amount?: number | null
          coupon_expires_at?: string | null
          coupon_redeemed?: boolean
          created_at?: string
          debrief_completed?: boolean
          expires_at?: string | null
          id?: string
          instrument_id?: string | null
          invitation_source?: string
          invitation_status?: string
          paired_assessment_id?: string | null
          refund_amount?: number | null
          refund_failure_reason?: string | null
          refunded_at?: string | null
          results_released?: boolean
          revoked_at?: string | null
          stripe_coupon_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_clients_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "coach_certification_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_paired_assessment_id_fkey"
            columns: ["paired_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_disclosure_acceptances: {
        Row: {
          accepted_at: string
          coach_user_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
          version_hash: string
          version_id: string
        }
        Insert: {
          accepted_at?: string
          coach_user_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          version_hash: string
          version_id: string
        }
        Update: {
          accepted_at?: string
          coach_user_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          version_hash?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_disclosure_acceptances_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_disclosure_acceptances_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_disclosure_acceptances_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_disclosure_acceptances_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_disclosure_acceptances_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "coach_disclosure_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_disclosure_versions: {
        Row: {
          body_markdown: string
          created_at: string
          effective_from: string
          id: string
          is_current: boolean
          version_hash: string
        }
        Insert: {
          body_markdown: string
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          version_hash: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          version_hash?: string
        }
        Relationships: []
      }
      coach_invitations: {
        Row: {
          accepted_at: string | null
          certification_type: string
          created_at: string
          email: string
          email_last_attempt_at: string | null
          email_send_error: string | null
          email_send_status: string | null
          expires_at: string
          first_name: string
          id: string
          invited_by: string
          last_name: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          certification_type?: string
          created_at?: string
          email: string
          email_last_attempt_at?: string | null
          email_send_error?: string | null
          email_send_status?: string | null
          expires_at?: string
          first_name: string
          id?: string
          invited_by: string
          last_name: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          certification_type?: string
          created_at?: string
          email?: string
          email_last_attempt_at?: string | null
          email_send_error?: string | null
          email_send_status?: string | null
          expires_at?: string
          first_name?: string
          id?: string
          invited_by?: string
          last_name?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_mentor_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          certification_id: string
          end_reason: string | null
          ended_at: string | null
          id: string
          mentor_user_id: string
          notes: string | null
          trainee_user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          certification_id: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          mentor_user_id: string
          notes?: string | null
          trainee_user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          certification_id?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          mentor_user_id?: string
          notes?: string | null
          trainee_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_mentor_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "coach_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_mentor_assignments_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_pending_bulk_batches: {
        Row: {
          coach_user_id: string
          completed_at: string | null
          created_at: string
          id: string
          rows: Json
          status: string
          stripe_session_id: string | null
          total_amount: number
        }
        Insert: {
          coach_user_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          rows: Json
          status?: string
          stripe_session_id?: string | null
          total_amount: number
        }
        Update: {
          coach_user_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          rows?: Json
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_pending_bulk_batches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_pending_bulk_batches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_pending_bulk_batches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_pending_bulk_batches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string
          joined_by: string | null
          left_at: string | null
          left_reason: string | null
          member_status: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string
          joined_by?: string | null
          left_at?: string | null
          left_reason?: string | null
          member_status?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string
          joined_by?: string | null
          left_at?: string | null
          left_reason?: string | null
          member_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_joined_by_fkey"
            columns: ["joined_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_joined_by_fkey"
            columns: ["joined_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "cohort_members_joined_by_fkey"
            columns: ["joined_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_joined_by_fkey"
            columns: ["joined_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          archived_at: string | null
          certification_path_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          enrollment_closes_at: string | null
          enrollment_opens_at: string | null
          id: string
          max_capacity: number | null
          name: string
          starts_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          certification_path_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          enrollment_closes_at?: string | null
          enrollment_opens_at?: string | null
          id?: string
          max_capacity?: number | null
          name: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          certification_path_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          enrollment_closes_at?: string | null
          enrollment_opens_at?: string | null
          id?: string
          max_capacity?: number | null
          name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_certification_path_id_fkey"
            columns: ["certification_path_id"]
            isOneToOne: false
            referencedRelation: "certification_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "cohorts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "cohorts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comp_coupons: {
        Row: {
          applicable_account_types: string[] | null
          applicable_instrument_ids: string[] | null
          archive_reason: string | null
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          duration: string
          duration_in_months: number | null
          id: string
          internal_name: string
          max_redemptions: number | null
          notes: string | null
          percent_off: number
          redeem_by: string
          stripe_coupon_id: string
        }
        Insert: {
          applicable_account_types?: string[] | null
          applicable_instrument_ids?: string[] | null
          archive_reason?: string | null
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration: string
          duration_in_months?: number | null
          id?: string
          internal_name: string
          max_redemptions?: number | null
          notes?: string | null
          percent_off: number
          redeem_by: string
          stripe_coupon_id: string
        }
        Update: {
          applicable_account_types?: string[] | null
          applicable_instrument_ids?: string[] | null
          archive_reason?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration?: string
          duration_in_months?: number | null
          id?: string
          internal_name?: string
          max_redemptions?: number | null
          notes?: string | null
          percent_off?: number
          redeem_by?: string
          stripe_coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comp_coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comp_coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "comp_coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comp_coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_admin_audit_log: {
        Row: {
          action_details: Json | null
          action_type: string
          actor_role: string
          actor_user_id: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: string
          ip_address: unknown
          organization_id: string
          reason: string | null
          super_admin_acting_as_user_id: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          actor_role: string
          actor_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          organization_id: string
          reason?: string | null
          super_admin_acting_as_user_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          actor_role?: string
          actor_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          organization_id?: string
          reason?: string | null
          super_admin_acting_as_user_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_admin_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_super_admin_acting_as_user_id_fkey"
            columns: ["super_admin_acting_as_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_super_admin_acting_as_user_id_fkey"
            columns: ["super_admin_acting_as_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_super_admin_acting_as_user_id_fkey"
            columns: ["super_admin_acting_as_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_super_admin_acting_as_user_id_fkey"
            columns: ["super_admin_acting_as_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          client_ip: unknown
          created_at: string
          email: string
          email_send_error: string | null
          email_send_status: string
          email_sent_at: string | null
          id: string
          inquiry_type: string
          message: string
          name: string
          organization: string | null
          source: string
          status: string
          user_agent: string | null
        }
        Insert: {
          client_ip?: unknown
          created_at?: string
          email: string
          email_send_error?: string | null
          email_send_status?: string
          email_sent_at?: string | null
          id?: string
          inquiry_type: string
          message: string
          name: string
          organization?: string | null
          source?: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          client_ip?: unknown
          created_at?: string
          email?: string
          email_send_error?: string | null
          email_send_status?: string
          email_sent_at?: string | null
          id?: string
          inquiry_type?: string
          message?: string
          name?: string
          organization?: string | null
          source?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      content_asset_refs: {
        Row: {
          archived_at: string | null
          asset_id: string
          certification_path_id: string | null
          content_item_id: string | null
          created_at: string
          created_by: string
          curriculum_id: string | null
          id: string
          lesson_block_id: string | null
          module_id: string | null
          newsletter_article_id: string | null
          ref_field: string
          resource_id: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          asset_id: string
          certification_path_id?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by: string
          curriculum_id?: string | null
          id?: string
          lesson_block_id?: string | null
          module_id?: string | null
          newsletter_article_id?: string | null
          ref_field: string
          resource_id?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          asset_id?: string
          certification_path_id?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string
          curriculum_id?: string | null
          id?: string
          lesson_block_id?: string | null
          module_id?: string | null
          newsletter_article_id?: string | null
          ref_field?: string
          resource_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_asset_refs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_certification_path_id_fkey"
            columns: ["certification_path_id"]
            isOneToOne: false
            referencedRelation: "certification_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_asset_refs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_lesson_block_id_fkey"
            columns: ["lesson_block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_newsletter_article_id_fkey"
            columns: ["newsletter_article_id"]
            isOneToOne: false
            referencedRelation: "newsletter_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_asset_refs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_asset_versions: {
        Row: {
          archived_at: string | null
          asset_id: string
          bucket: string
          created_at: string
          generation_provenance: Json | null
          id: string
          mime_type: string
          original_filename: string
          path: string
          size_bytes: number
          uploaded_by: string
          version_number: number
        }
        Insert: {
          archived_at?: string | null
          asset_id: string
          bucket?: string
          created_at?: string
          generation_provenance?: Json | null
          id?: string
          mime_type: string
          original_filename: string
          path: string
          size_bytes: number
          uploaded_by: string
          version_number: number
        }
        Update: {
          archived_at?: string | null
          asset_id?: string
          bucket?: string
          created_at?: string
          generation_provenance?: Json | null
          id?: string
          mime_type?: string
          original_filename?: string
          path?: string
          size_bytes?: number
          uploaded_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_asset_versions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_asset_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          archive_email_sent_at: string | null
          archive_reason: string | null
          archived_at: string | null
          asset_kind: string
          created_at: string
          current_version_id: string | null
          dominant_color: string | null
          id: string
          is_library_asset: boolean
          library_name: string | null
          library_tags: string[] | null
          status: string
          updated_at: string
          updated_by: string | null
          uploaded_by: string
        }
        Insert: {
          archive_email_sent_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          asset_kind: string
          created_at?: string
          current_version_id?: string | null
          dominant_color?: string | null
          id?: string
          is_library_asset?: boolean
          library_name?: string | null
          library_tags?: string[] | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by: string
        }
        Update: {
          archive_email_sent_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          asset_kind?: string
          created_at?: string
          current_version_id?: string | null
          dominant_color?: string | null
          id?: string
          is_library_asset?: boolean
          library_name?: string | null
          library_tags?: string[] | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "content_asset_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_item_completions: {
        Row: {
          ai_assist_used_at: string | null
          attempts_count: number
          completed_at: string | null
          content_item_id: string
          created_at: string
          external_link_confirmed_at: string | null
          external_link_reflection_text: string | null
          file_upload_filename: string | null
          file_upload_size_bytes: number | null
          file_upload_url: string | null
          id: string
          lesson_furthest_continue_client_id: string | null
          lesson_last_block_id: string | null
          live_event_attendance_status: string | null
          live_event_marked_by: string | null
          quiz_best_score_pct: number | null
          quiz_passed: boolean | null
          reviewer_comments: string | null
          reviewer_user_id: string | null
          skills_attachment_url: string | null
          skills_mentor_attachment_url: string | null
          skills_mentor_signed_off: boolean
          skills_mentor_signed_off_at: string | null
          skills_mentor_signed_off_by: string | null
          skills_revision_comment: string | null
          skills_revision_requested_at: string | null
          skills_revision_requested_by: string | null
          skills_trainee_input_text: string | null
          skills_trainee_signed_off: boolean
          skills_trainee_signed_off_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          video_last_position_seconds: number | null
          video_watch_pct: number | null
          written_review_status: string | null
        }
        Insert: {
          ai_assist_used_at?: string | null
          attempts_count?: number
          completed_at?: string | null
          content_item_id: string
          created_at?: string
          external_link_confirmed_at?: string | null
          external_link_reflection_text?: string | null
          file_upload_filename?: string | null
          file_upload_size_bytes?: number | null
          file_upload_url?: string | null
          id?: string
          lesson_furthest_continue_client_id?: string | null
          lesson_last_block_id?: string | null
          live_event_attendance_status?: string | null
          live_event_marked_by?: string | null
          quiz_best_score_pct?: number | null
          quiz_passed?: boolean | null
          reviewer_comments?: string | null
          reviewer_user_id?: string | null
          skills_attachment_url?: string | null
          skills_mentor_attachment_url?: string | null
          skills_mentor_signed_off?: boolean
          skills_mentor_signed_off_at?: string | null
          skills_mentor_signed_off_by?: string | null
          skills_revision_comment?: string | null
          skills_revision_requested_at?: string | null
          skills_revision_requested_by?: string | null
          skills_trainee_input_text?: string | null
          skills_trainee_signed_off?: boolean
          skills_trainee_signed_off_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_last_position_seconds?: number | null
          video_watch_pct?: number | null
          written_review_status?: string | null
        }
        Update: {
          ai_assist_used_at?: string | null
          attempts_count?: number
          completed_at?: string | null
          content_item_id?: string
          created_at?: string
          external_link_confirmed_at?: string | null
          external_link_reflection_text?: string | null
          file_upload_filename?: string | null
          file_upload_size_bytes?: number | null
          file_upload_url?: string | null
          id?: string
          lesson_furthest_continue_client_id?: string | null
          lesson_last_block_id?: string | null
          live_event_attendance_status?: string | null
          live_event_marked_by?: string | null
          quiz_best_score_pct?: number | null
          quiz_passed?: boolean | null
          reviewer_comments?: string | null
          reviewer_user_id?: string | null
          skills_attachment_url?: string | null
          skills_mentor_attachment_url?: string | null
          skills_mentor_signed_off?: boolean
          skills_mentor_signed_off_at?: string | null
          skills_mentor_signed_off_by?: string | null
          skills_revision_comment?: string | null
          skills_revision_requested_at?: string | null
          skills_revision_requested_by?: string | null
          skills_trainee_input_text?: string | null
          skills_trainee_signed_off?: boolean
          skills_trainee_signed_off_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_last_position_seconds?: number | null
          video_watch_pct?: number | null
          written_review_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_item_completions_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_lesson_last_block_id_fkey"
            columns: ["lesson_last_block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_live_event_marked_by_fkey"
            columns: ["live_event_marked_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_live_event_marked_by_fkey"
            columns: ["live_event_marked_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_item_completions_live_event_marked_by_fkey"
            columns: ["live_event_marked_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_live_event_marked_by_fkey"
            columns: ["live_event_marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_item_completions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_skills_mentor_signed_off_by_fkey"
            columns: ["skills_mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_skills_mentor_signed_off_by_fkey"
            columns: ["skills_mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_item_completions_skills_mentor_signed_off_by_fkey"
            columns: ["skills_mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_skills_mentor_signed_off_by_fkey"
            columns: ["skills_mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_item_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          archived_at: string | null
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          duration_seconds: number | null
          event_external_id: string | null
          event_scheduled_at: string | null
          external_url: string | null
          file_upload_allowed_extensions: string[] | null
          file_upload_max_bytes: number | null
          id: string
          is_required: boolean
          item_type: string
          lesson_completion_mode: string | null
          module_id: string
          mux_asset_id: string | null
          mux_status: string | null
          quiz_pass_threshold_pct: number | null
          quiz_show_correct_mode: string | null
          skills_actor_invitation_required: boolean
          skills_optional_attachment: boolean
          skills_signoff_required: string | null
          skills_trainee_input_enabled: boolean
          skills_trainee_input_label: string | null
          thumbnail_asset_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          video_ai_summary: string | null
          video_completion_threshold_pct: number | null
          video_source_id: string | null
          video_source_type: string | null
          written_completion_mode: string | null
          written_max_chars: number | null
          written_min_chars: number | null
        }
        Insert: {
          archived_at?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          duration_seconds?: number | null
          event_external_id?: string | null
          event_scheduled_at?: string | null
          external_url?: string | null
          file_upload_allowed_extensions?: string[] | null
          file_upload_max_bytes?: number | null
          id?: string
          is_required?: boolean
          item_type: string
          lesson_completion_mode?: string | null
          module_id: string
          mux_asset_id?: string | null
          mux_status?: string | null
          quiz_pass_threshold_pct?: number | null
          quiz_show_correct_mode?: string | null
          skills_actor_invitation_required?: boolean
          skills_optional_attachment?: boolean
          skills_signoff_required?: string | null
          skills_trainee_input_enabled?: boolean
          skills_trainee_input_label?: string | null
          thumbnail_asset_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          video_ai_summary?: string | null
          video_completion_threshold_pct?: number | null
          video_source_id?: string | null
          video_source_type?: string | null
          written_completion_mode?: string | null
          written_max_chars?: number | null
          written_min_chars?: number | null
        }
        Update: {
          archived_at?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          duration_seconds?: number | null
          event_external_id?: string | null
          event_scheduled_at?: string | null
          external_url?: string | null
          file_upload_allowed_extensions?: string[] | null
          file_upload_max_bytes?: number | null
          id?: string
          is_required?: boolean
          item_type?: string
          lesson_completion_mode?: string | null
          module_id?: string
          mux_asset_id?: string | null
          mux_status?: string | null
          quiz_pass_threshold_pct?: number | null
          quiz_show_correct_mode?: string | null
          skills_actor_invitation_required?: boolean
          skills_optional_attachment?: boolean
          skills_signoff_required?: string | null
          skills_trainee_input_enabled?: boolean
          skills_trainee_input_label?: string | null
          thumbnail_asset_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_ai_summary?: string | null
          video_completion_threshold_pct?: number | null
          video_source_id?: string | null
          video_source_type?: string | null
          written_completion_mode?: string | null
          written_max_chars?: number | null
          written_min_chars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "content_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_contracts: {
        Row: {
          ai_chat_enabled_override: boolean | null
          created_at: string
          created_by: string | null
          dashboard_access_level_override: string | null
          data_retention_mode: string
          end_date: string | null
          id: string
          instruments_included_override: Json | null
          monthly_ai_pulls_allowance_override: number | null
          monthly_chat_allowance_per_user_override: number | null
          monthly_coaching_query_allowance_override: number | null
          notes: string | null
          organization_id: string
          seat_count: number
          start_date: string
          supervisor_dashboard_enabled: boolean
          tier_id: string
          updated_at: string
        }
        Insert: {
          ai_chat_enabled_override?: boolean | null
          created_at?: string
          created_by?: string | null
          dashboard_access_level_override?: string | null
          data_retention_mode?: string
          end_date?: string | null
          id?: string
          instruments_included_override?: Json | null
          monthly_ai_pulls_allowance_override?: number | null
          monthly_chat_allowance_per_user_override?: number | null
          monthly_coaching_query_allowance_override?: number | null
          notes?: string | null
          organization_id: string
          seat_count: number
          start_date: string
          supervisor_dashboard_enabled?: boolean
          tier_id: string
          updated_at?: string
        }
        Update: {
          ai_chat_enabled_override?: boolean | null
          created_at?: string
          created_by?: string | null
          dashboard_access_level_override?: string | null
          data_retention_mode?: string
          end_date?: string | null
          id?: string
          instruments_included_override?: Json | null
          monthly_ai_pulls_allowance_override?: number | null
          monthly_chat_allowance_per_user_override?: number | null
          monthly_coaching_query_allowance_override?: number | null
          notes?: string | null
          organization_id?: string
          seat_count?: number
          start_date?: string
          supervisor_dashboard_enabled?: boolean
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "corporate_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_invitations: {
        Row: {
          account_type: string
          code: string
          created_at: string
          created_by_user_id: string
          department_id: string | null
          department_name: string | null
          expires_at: string
          id: string
          invitee_email: string
          org_level: string | null
          organization_id: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          supervisor_email: string | null
        }
        Insert: {
          account_type?: string
          code: string
          created_at?: string
          created_by_user_id: string
          department_id?: string | null
          department_name?: string | null
          expires_at?: string
          id?: string
          invitee_email: string
          org_level?: string | null
          organization_id: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          supervisor_email?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          created_by_user_id?: string
          department_id?: string | null
          department_name?: string | null
          expires_at?: string
          id?: string
          invitee_email?: string
          org_level?: string | null
          organization_id?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          supervisor_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_invitations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_invitations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "corporate_invitations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_invitations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["department_joined_id"]
          },
          {
            foreignKeyName: "corporate_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_invitations_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_invitations_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "corporate_invitations_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_invitations_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      curricula: {
        Row: {
          archived_at: string | null
          audience_tags: string[]
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          is_published: boolean
          is_self_enrollable: boolean
          mode: string
          name: string
          self_enroll_currency: string
          self_enroll_price_cents: number | null
          slug: string
          thumbnail_asset_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          audience_tags?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          is_self_enrollable?: boolean
          mode?: string
          name: string
          self_enroll_currency?: string
          self_enroll_price_cents?: number | null
          slug: string
          thumbnail_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          audience_tags?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          is_self_enrollable?: boolean
          mode?: string
          name?: string
          self_enroll_currency?: string
          self_enroll_price_cents?: number | null
          slug?: string
          thumbnail_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "curricula_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_modules: {
        Row: {
          created_at: string
          created_by: string | null
          curriculum_id: string
          display_order: number
          id: string
          is_required: boolean
          module_id: string
          prerequisite_module_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          curriculum_id: string
          display_order?: number
          id?: string
          is_required?: boolean
          module_id: string
          prerequisite_module_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          curriculum_id?: string
          display_order?: number
          id?: string
          is_required?: boolean
          module_id?: string
          prerequisite_module_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_prerequisite_module_id_fkey"
            columns: ["prerequisite_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "departments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
        Row: {
          created_at: string
          cross_instrument_notes: string | null
          dimension_id: string
          dimension_name: string
          high_score_label: string | null
          id: string
          instrument_id: string
          instrument_version: string | null
          item_ids: string | null
          low_score_label: string | null
          scoring_method: string | null
          short_name: string | null
          trigger_logic: string | null
        }
        Insert: {
          created_at?: string
          cross_instrument_notes?: string | null
          dimension_id: string
          dimension_name: string
          high_score_label?: string | null
          id?: string
          instrument_id: string
          instrument_version?: string | null
          item_ids?: string | null
          low_score_label?: string | null
          scoring_method?: string | null
          short_name?: string | null
          trigger_logic?: string | null
        }
        Update: {
          created_at?: string
          cross_instrument_notes?: string | null
          dimension_id?: string
          dimension_name?: string
          high_score_label?: string | null
          id?: string
          instrument_id?: string
          instrument_version?: string | null
          item_ids?: string | null
          low_score_label?: string | null
          scoring_method?: string | null
          short_name?: string | null
          trigger_logic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dimensions_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["instrument_id"]
          },
        ]
      }
      email_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          complained_at: string | null
          delivered_at: string | null
          dispatch_id: string | null
          email_type: string
          error_message: string | null
          id: string
          last_status_at: string | null
          last_status_event: string | null
          opened_at: string | null
          recipient_email: string
          resend_message_id: string | null
          send_status: string
          sent_at: string
          source: string | null
          subject: string
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          delivered_at?: string | null
          dispatch_id?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          last_status_at?: string | null
          last_status_event?: string | null
          opened_at?: string | null
          recipient_email: string
          resend_message_id?: string | null
          send_status: string
          sent_at?: string
          source?: string | null
          subject: string
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          delivered_at?: string | null
          dispatch_id?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          last_status_at?: string | null
          last_status_event?: string | null
          opened_at?: string | null
          recipient_email?: string
          resend_message_id?: string | null
          send_status?: string
          sent_at?: string
          source?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "newsletter_dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_perspective_assignments: {
        Row: {
          assessment_id: string | null
          assigned_at: string
          assigned_by: string | null
          assigned_by_role: string
          assignee_user_id: string
          completed_at: string | null
          id: string
          instrument_id: string
          notes: string | null
          organization_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          assessment_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          assigned_by_role: string
          assignee_user_id: string
          completed_at?: string | null
          id?: string
          instrument_id?: string
          notes?: string | null
          organization_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          assessment_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          assigned_by_role?: string
          assignee_user_id?: string
          completed_at?: string | null
          id?: string
          instrument_id?: string
          notes?: string | null
          organization_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_perspective_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_perspective_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      facet_interpretations: {
        Row: {
          assessment_result_id: string
          facet_data: Json
          generated_at: string | null
          id: string
          section_type: string | null
        }
        Insert: {
          assessment_result_id: string
          facet_data: Json
          generated_at?: string | null
          id?: string
          section_type?: string | null
        }
        Update: {
          assessment_result_id?: string
          facet_data?: Json
          generated_at?: string | null
          id?: string
          section_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facet_interpretations_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_templates: {
        Row: {
          created_at: string
          id: string
          mentor_user_id: string
          panel_type: string
          template_name: string
          template_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_user_id: string
          panel_type: string
          template_name: string
          template_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_user_id?: string
          panel_type?: string
          template_name?: string
          template_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_templates_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_templates_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "feedback_templates_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_templates_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          audit_log_id: string | null
          end_reason: string | null
          ended_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          justification: string
          mode: string
          started_at: string
          super_admin_user_id: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          audit_log_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          justification: string
          mode: string
          started_at?: string
          super_admin_user_id: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          audit_log_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          justification?: string
          mode?: string
          started_at?: string
          super_admin_user_id?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "super_admin_audit_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "impersonation_sessions_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          created_at: string
          description: string | null
          dimensions_domains: string | null
          id: string
          instrument_id: string
          instrument_name: string
          instrument_version: string
          rater_types: string | null
          requires_assignment: boolean
          scale_type: string | null
          scoring_unit: string | null
          short_name: string | null
          total_items: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          dimensions_domains?: string | null
          id?: string
          instrument_id: string
          instrument_name: string
          instrument_version: string
          rater_types?: string | null
          requires_assignment?: boolean
          scale_type?: string | null
          scoring_unit?: string | null
          short_name?: string | null
          total_items?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          dimensions_domains?: string | null
          id?: string
          instrument_id?: string
          instrument_name?: string
          instrument_version?: string
          rater_types?: string | null
          requires_assignment?: boolean
          scale_type?: string | null
          scoring_unit?: string | null
          short_name?: string | null
          total_items?: number | null
        }
        Relationships: []
      }
      items: {
        Row: {
          anchor_high: string | null
          anchor_low: string | null
          context_type: string | null
          created_at: string
          dimension_id: string | null
          facet_name: string | null
          facet_ref: string | null
          id: string
          instrument_id: string
          instrument_version: string | null
          item_id: string
          item_number: number | null
          item_text: string
          notes: string | null
          rater_type: string | null
          reverse_scored: boolean
          scale_type: string | null
        }
        Insert: {
          anchor_high?: string | null
          anchor_low?: string | null
          context_type?: string | null
          created_at?: string
          dimension_id?: string | null
          facet_name?: string | null
          facet_ref?: string | null
          id?: string
          instrument_id: string
          instrument_version?: string | null
          item_id: string
          item_number?: number | null
          item_text: string
          notes?: string | null
          rater_type?: string | null
          reverse_scored?: boolean
          scale_type?: string | null
        }
        Update: {
          anchor_high?: string | null
          anchor_low?: string | null
          context_type?: string | null
          created_at?: string
          dimension_id?: string | null
          facet_name?: string | null
          facet_ref?: string | null
          id?: string
          instrument_id?: string
          instrument_version?: string | null
          item_id?: string
          item_number?: number | null
          item_text?: string
          notes?: string | null
          rater_type?: string | null
          reverse_scored?: boolean
          scale_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "items_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["instrument_id"]
          },
        ]
      }
      lesson_block_drafts: {
        Row: {
          author_id: string
          content_item_id: string
          draft_json: Json
          updated_at: string
        }
        Insert: {
          author_id: string
          content_item_id: string
          draft_json: Json
          updated_at?: string
        }
        Update: {
          author_id?: string
          content_item_id?: string
          draft_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_block_drafts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_drafts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "lesson_block_drafts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_drafts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_drafts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_block_progress: {
        Row: {
          attempt_number: number
          block_id: string
          completed_at: string | null
          completion_data: Json
          completion_id: string
          content_item_id: string
          created_at: string
          id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_number: number
          block_id: string
          completed_at?: string | null
          completion_data?: Json
          completion_id: string
          content_item_id: string
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          block_id?: string
          completed_at?: string | null
          completion_data?: Json
          completion_id?: string
          content_item_id?: string
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_block_progress_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_progress_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "content_item_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_progress_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "lesson_block_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_block_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_block_types: {
        Row: {
          block_type: string
          category: string
          created_at: string
          description: string
          is_interactive: boolean
          is_scored: boolean
          is_v1_active: boolean
        }
        Insert: {
          block_type: string
          category: string
          created_at?: string
          description: string
          is_interactive?: boolean
          is_scored?: boolean
          is_v1_active?: boolean
        }
        Update: {
          block_type?: string
          category?: string
          created_at?: string
          description?: string
          is_interactive?: boolean
          is_scored?: boolean
          is_v1_active?: boolean
        }
        Relationships: []
      }
      lesson_blocks: {
        Row: {
          archived_at: string | null
          block_type: string
          config: Json
          content_item_id: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          block_type: string
          config?: Json
          content_item_id: string
          created_at?: string
          created_by?: string | null
          display_order: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          block_type?: string
          config?: Json
          content_item_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_block_type_fkey"
            columns: ["block_type"]
            isOneToOne: false
            referencedRelation: "lesson_block_types"
            referencedColumns: ["block_type"]
          },
          {
            foreignKeyName: "lesson_blocks_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "lesson_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "lesson_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_feature_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          feature: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled: boolean
          feature: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          feature?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_feature_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_feature_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "member_feature_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_feature_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_feature_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_feature_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "member_feature_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_feature_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_trainee_notes: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          note_text: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          note_text: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_trainee_notes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "coach_mentor_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      module_completions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          archived_at: string | null
          audience_tags: string[]
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          is_published: boolean
          is_self_enrollable: boolean
          name: string
          self_enroll_currency: string
          self_enroll_price_cents: number | null
          slug: string
          thumbnail_asset_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          audience_tags?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          is_self_enrollable?: boolean
          name: string
          self_enroll_currency?: string
          self_enroll_price_cents?: number | null
          slug: string
          thumbnail_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          audience_tags?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          is_self_enrollable?: boolean
          name?: string
          self_enroll_currency?: string
          self_enroll_price_cents?: number | null
          slug?: string
          thumbnail_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_ai_conversations: {
        Row: {
          article_id: string
          author_id: string
          created_at: string
          id: string
          last_model_used: string | null
          status: string
          updated_at: string
        }
        Insert: {
          article_id: string
          author_id: string
          created_at?: string
          id?: string
          last_model_used?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          author_id?: string
          created_at?: string
          id?: string
          last_model_used?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_ai_conversations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "newsletter_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_ai_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_ai_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_ai_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_ai_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_ai_messages: {
        Row: {
          attachments: Json
          content: string
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          model_used: string | null
          output_tokens: number | null
          role: string
          selection_range: Json | null
        }
        Insert: {
          attachments?: Json
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model_used?: string | null
          output_tokens?: number | null
          role: string
          selection_range?: Json | null
        }
        Update: {
          attachments?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model_used?: string | null
          output_tokens?: number | null
          role?: string
          selection_range?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "newsletter_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_article_authors: {
        Row: {
          article_id: string
          author_order: number
          author_user_id: string
        }
        Insert: {
          article_id: string
          author_order?: number
          author_user_id: string
        }
        Update: {
          article_id?: string
          author_order?: number
          author_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_article_authors_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "newsletter_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_article_authors_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_article_authors_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_article_authors_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_article_authors_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_article_versions: {
        Row: {
          article_id: string
          body_tiptap: Json
          created_at: string
          created_by_user_id: string
          excerpt_snapshot: string | null
          id: string
          metadata_snapshot: Json
          restored_from_version_id: string | null
          title_snapshot: string
          version_name: string | null
          version_number: number
          version_type: string
        }
        Insert: {
          article_id: string
          body_tiptap: Json
          created_at?: string
          created_by_user_id: string
          excerpt_snapshot?: string | null
          id?: string
          metadata_snapshot?: Json
          restored_from_version_id?: string | null
          title_snapshot: string
          version_name?: string | null
          version_number: number
          version_type: string
        }
        Update: {
          article_id?: string
          body_tiptap?: Json
          created_at?: string
          created_by_user_id?: string
          excerpt_snapshot?: string | null
          id?: string
          metadata_snapshot?: Json
          restored_from_version_id?: string | null
          title_snapshot?: string
          version_name?: string | null
          version_number?: number
          version_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "newsletter_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_article_versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_article_versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_article_versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_article_versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_article_versions_restored_from_version_id_fkey"
            columns: ["restored_from_version_id"]
            isOneToOne: false
            referencedRelation: "newsletter_article_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_articles: {
        Row: {
          allowed_plan_tiers: string[]
          archived_at: string | null
          body_html_rendered: string | null
          body_tiptap: Json
          canonical_url: string | null
          category_id: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string
          default_layout_width: string
          excerpt: string | null
          eyebrow_text: string | null
          gate: string
          id: string
          is_issue_based: boolean
          issue_label: string | null
          masthead_logo_glyph: string | null
          masthead_publication: string | null
          og_image_asset_id: string | null
          published_at: string | null
          read_time_minutes: number | null
          scheduled_by_user_id: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_type: string
          status: string
          tags: string[]
          theme_variant: string
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          allowed_plan_tiers?: string[]
          archived_at?: string | null
          body_html_rendered?: string | null
          body_tiptap?: Json
          canonical_url?: string | null
          category_id?: string | null
          cover_asset_id?: string | null
          created_at?: string
          created_by_user_id: string
          default_layout_width?: string
          excerpt?: string | null
          eyebrow_text?: string | null
          gate?: string
          id?: string
          is_issue_based?: boolean
          issue_label?: string | null
          masthead_logo_glyph?: string | null
          masthead_publication?: string | null
          og_image_asset_id?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          scheduled_by_user_id?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source_type?: string
          status?: string
          tags?: string[]
          theme_variant?: string
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          allowed_plan_tiers?: string[]
          archived_at?: string | null
          body_html_rendered?: string | null
          body_tiptap?: Json
          canonical_url?: string | null
          category_id?: string | null
          cover_asset_id?: string | null
          created_at?: string
          created_by_user_id?: string
          default_layout_width?: string
          excerpt?: string | null
          eyebrow_text?: string | null
          gate?: string
          id?: string
          is_issue_based?: boolean
          issue_label?: string | null
          masthead_logo_glyph?: string | null
          masthead_publication?: string | null
          og_image_asset_id?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          scheduled_by_user_id?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source_type?: string
          status?: string
          tags?: string[]
          theme_variant?: string
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "newsletter_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_articles_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_og_image_asset_id_fkey"
            columns: ["og_image_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_scheduled_by_user_id_fkey"
            columns: ["scheduled_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_scheduled_by_user_id_fkey"
            columns: ["scheduled_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_articles_scheduled_by_user_id_fkey"
            columns: ["scheduled_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_articles_scheduled_by_user_id_fkey"
            columns: ["scheduled_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          display_name: string
          id: string
          slug: string
          sort_order: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_name: string
          id?: string
          slug: string
          sort_order?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      newsletter_dispatches: {
        Row: {
          article_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_count: number
          id: string
          recipient_count: number
          sent_count: number
          started_at: string
          status: string
          trigger_type: string
          triggered_by_user_id: string | null
        }
        Insert: {
          article_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_count?: number
          id?: string
          recipient_count?: number
          sent_count?: number
          started_at?: string
          status?: string
          trigger_type?: string
          triggered_by_user_id?: string | null
        }
        Update: {
          article_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_count?: number
          id?: string
          recipient_count?: number
          sent_count?: number
          started_at?: string
          status?: string
          trigger_type?: string
          triggered_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_dispatches_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "newsletter_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_dispatches_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_dispatches_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_dispatches_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_dispatches_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_poll_votes: {
        Row: {
          option_id: string
          poll_id: string
          voted_at: string
          voter_user_id: string
        }
        Insert: {
          option_id: string
          poll_id: string
          voted_at?: string
          voter_user_id: string
        }
        Update: {
          option_id?: string
          poll_id?: string
          voted_at?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "newsletter_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_poll_votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_poll_votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_poll_votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_poll_votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_polls: {
        Row: {
          archived_at: string | null
          article_id: string
          created_at: string
          created_by_user_id: string
          id: string
          is_locked: boolean
          node_id: string
          options: Json
          question: string
          style: string
          updated_at: string
          votes_visible: boolean
        }
        Insert: {
          archived_at?: string | null
          article_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          is_locked?: boolean
          node_id: string
          options: Json
          question: string
          style?: string
          updated_at?: string
          votes_visible?: boolean
        }
        Update: {
          archived_at?: string | null
          article_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          is_locked?: boolean
          node_id?: string
          options?: Json
          question?: string
          style?: string
          updated_at?: string
          votes_visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_polls_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "newsletter_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_polls_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_polls_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_polls_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_polls_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_settings: {
        Row: {
          created_at: string
          dispatch_trigger_mode: string
          id: boolean
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          dispatch_trigger_mode?: string
          id?: boolean
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          dispatch_trigger_mode?: string
          id?: boolean
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribe_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: unknown
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address: unknown
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: unknown
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirmation_token_expires_at: string | null
          confirmation_token_hash: string | null
          confirmed_at: string | null
          consent_evidence: string | null
          created_at: string
          email: string
          id: string
          linked_user_id: string | null
          referrer_url: string | null
          resend_contact_id: string | null
          source: string | null
          status: string
          unsubscribe_token_hash: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          confirmation_token_expires_at?: string | null
          confirmation_token_hash?: string | null
          confirmed_at?: string | null
          consent_evidence?: string | null
          created_at?: string
          email: string
          id?: string
          linked_user_id?: string | null
          referrer_url?: string | null
          resend_contact_id?: string | null
          source?: string | null
          status: string
          unsubscribe_token_hash?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          confirmation_token_expires_at?: string | null
          confirmation_token_hash?: string | null
          confirmed_at?: string | null
          consent_evidence?: string | null
          created_at?: string
          email?: string
          id?: string
          linked_user_id?: string | null
          referrer_url?: string | null
          resend_contact_id?: string | null
          source?: string | null
          status?: string
          unsubscribe_token_hash?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_types_catalog: {
        Row: {
          category: string
          created_at: string
          default_channel: string
          description: string
          importance_band: string
          is_v1_active: boolean
          notification_type: string
          user_configurable: boolean
        }
        Insert: {
          category: string
          created_at?: string
          default_channel: string
          description: string
          importance_band: string
          is_v1_active?: boolean
          notification_type: string
          user_configurable: boolean
        }
        Update: {
          category?: string
          created_at?: string
          default_channel?: string
          description?: string
          importance_band?: string
          is_v1_active?: boolean
          notification_type?: string
          user_configurable?: boolean
        }
        Relationships: []
      }
      org_cross_instrument_recommendations: {
        Row: {
          generated_at: string
          generated_by: string | null
          id: string
          input_narrative_ids: Json
          organization_id: string
          primary_instrument_id: string
          primary_narrative_id: string
          recommendations: Json
          slice_type: string
          slice_value: string
          summary: string | null
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          input_narrative_ids?: Json
          organization_id: string
          primary_instrument_id: string
          primary_narrative_id: string
          recommendations?: Json
          slice_type?: string
          slice_value?: string
          summary?: string | null
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          input_narrative_ids?: Json
          organization_id?: string
          primary_instrument_id?: string
          primary_narrative_id?: string
          recommendations?: Json
          slice_type?: string
          slice_value?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_cross_instrument_recommendations_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cross_instrument_recommendations_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_cross_instrument_recommendations_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cross_instrument_recommendations_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cross_instrument_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cross_instrument_recommendations_primary_narrative_id_fkey"
            columns: ["primary_narrative_id"]
            isOneToOne: false
            referencedRelation: "org_dashboard_narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      org_dashboard_narratives: {
        Row: {
          dimension_scores: Json
          generated_at: string
          generated_by: string | null
          id: string
          index_score: number | null
          instrument_id: string
          narrative_text: Json
          organization_id: string
          participant_count: number
          rsi_score: number | null
          slice_type: string
          slice_value: string
          tri_score: number | null
        }
        Insert: {
          dimension_scores?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          index_score?: number | null
          instrument_id: string
          narrative_text?: Json
          organization_id: string
          participant_count: number
          rsi_score?: number | null
          slice_type?: string
          slice_value?: string
          tri_score?: number | null
        }
        Update: {
          dimension_scores?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          index_score?: number | null
          instrument_id?: string
          narrative_text?: Json
          organization_id?: string
          participant_count?: number
          rsi_score?: number | null
          slice_type?: string
          slice_value?: string
          tri_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_dashboard_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_dashboard_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_dashboard_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_dashboard_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_dashboard_narratives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_intervention_status_history: {
        Row: {
          changed_at: string
          changed_by_user_id: string | null
          id: string
          intervention_id: string
          new_status: string
          notes_at_change: string | null
          old_status: string | null
          organization_id: string
        }
        Insert: {
          changed_at?: string
          changed_by_user_id?: string | null
          id?: string
          intervention_id: string
          new_status: string
          notes_at_change?: string | null
          old_status?: string | null
          organization_id: string
        }
        Update: {
          changed_at?: string
          changed_by_user_id?: string | null
          id?: string
          intervention_id?: string
          new_status?: string
          notes_at_change?: string | null
          old_status?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_intervention_status_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_intervention_status_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_intervention_status_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_intervention_status_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_intervention_status_history_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "org_interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_intervention_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_interventions: {
        Row: {
          actual_completion_date: string | null
          assigned_owner_user_id: string | null
          created_at: string
          description: string
          epn_delta_narrative_id: string | null
          id: string
          instrument_id: string
          intervention_type: string
          last_updated_at: string
          last_updated_by: string | null
          manual_source_instrument_id: string | null
          narrative_id: string | null
          organization_id: string
          priority: string
          ptp_delta_narrative_id: string | null
          status: string
          target_completion_date: string | null
          target_dimensions: string[]
          time_horizon: string
          title: string
          tracking_notes: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          assigned_owner_user_id?: string | null
          created_at?: string
          description: string
          epn_delta_narrative_id?: string | null
          id?: string
          instrument_id: string
          intervention_type?: string
          last_updated_at?: string
          last_updated_by?: string | null
          manual_source_instrument_id?: string | null
          narrative_id?: string | null
          organization_id: string
          priority?: string
          ptp_delta_narrative_id?: string | null
          status?: string
          target_completion_date?: string | null
          target_dimensions?: string[]
          time_horizon?: string
          title: string
          tracking_notes?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          assigned_owner_user_id?: string | null
          created_at?: string
          description?: string
          epn_delta_narrative_id?: string | null
          id?: string
          instrument_id?: string
          intervention_type?: string
          last_updated_at?: string
          last_updated_by?: string | null
          manual_source_instrument_id?: string | null
          narrative_id?: string | null
          organization_id?: string
          priority?: string
          ptp_delta_narrative_id?: string | null
          status?: string
          target_completion_date?: string | null
          target_dimensions?: string[]
          time_horizon?: string
          title?: string
          tracking_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_interventions_assigned_owner_user_id_fkey"
            columns: ["assigned_owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_assigned_owner_user_id_fkey"
            columns: ["assigned_owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_interventions_assigned_owner_user_id_fkey"
            columns: ["assigned_owner_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_assigned_owner_user_id_fkey"
            columns: ["assigned_owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_epn_delta_narrative_id_fkey"
            columns: ["epn_delta_narrative_id"]
            isOneToOne: false
            referencedRelation: "org_nai_delta_narratives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_interventions_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_manual_source_instrument_id_fkey"
            columns: ["manual_source_instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "org_interventions_narrative_id_fkey"
            columns: ["narrative_id"]
            isOneToOne: false
            referencedRelation: "org_dashboard_narratives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_interventions_ptp_delta_narrative_id_fkey"
            columns: ["ptp_delta_narrative_id"]
            isOneToOne: false
            referencedRelation: "org_ptp_delta_narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      org_member_history_snapshot: {
        Row: {
          converted_to_individual: boolean
          deidentified_email: string
          deidentified_name: string
          departed_at: string
          department_id_at_departure: string | null
          id: string
          org_level_at_departure: string | null
          organization_id: string
          pseudonymized: boolean
          supervisor_user_id_at_departure: string | null
          user_id: string
        }
        Insert: {
          converted_to_individual?: boolean
          deidentified_email: string
          deidentified_name: string
          departed_at?: string
          department_id_at_departure?: string | null
          id?: string
          org_level_at_departure?: string | null
          organization_id: string
          pseudonymized?: boolean
          supervisor_user_id_at_departure?: string | null
          user_id: string
        }
        Update: {
          converted_to_individual?: boolean
          deidentified_email?: string
          deidentified_name?: string
          departed_at?: string
          department_id_at_departure?: string | null
          id?: string
          org_level_at_departure?: string | null
          organization_id?: string
          pseudonymized?: boolean
          supervisor_user_id_at_departure?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_member_history_snapshot_department_id_at_departure_fkey"
            columns: ["department_id_at_departure"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["department_joined_id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_department_id_at_departure_fkey"
            columns: ["department_id_at_departure"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_supervisor_user_id_at_departur_fkey"
            columns: ["supervisor_user_id_at_departure"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_supervisor_user_id_at_departur_fkey"
            columns: ["supervisor_user_id_at_departure"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_supervisor_user_id_at_departur_fkey"
            columns: ["supervisor_user_id_at_departure"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_supervisor_user_id_at_departur_fkey"
            columns: ["supervisor_user_id_at_departure"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_history_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_nai_delta_narratives: {
        Row: {
          ai_model: string | null
          delta: Json
          epn_aggregate: Json
          epn_participant_count: number
          exclude_leaders_from_self: boolean
          generated_at: string
          generated_by: string | null
          id: string
          narrative_text: Json
          organization_id: string
          self_aggregate: Json
          self_participant_count: number
          slice_type: string
          slice_value: string
          source_nai_narrative_id: string | null
        }
        Insert: {
          ai_model?: string | null
          delta: Json
          epn_aggregate: Json
          epn_participant_count: number
          exclude_leaders_from_self?: boolean
          generated_at?: string
          generated_by?: string | null
          id?: string
          narrative_text: Json
          organization_id: string
          self_aggregate: Json
          self_participant_count: number
          slice_type?: string
          slice_value?: string
          source_nai_narrative_id?: string | null
        }
        Update: {
          ai_model?: string | null
          delta?: Json
          epn_aggregate?: Json
          epn_participant_count?: number
          exclude_leaders_from_self?: boolean
          generated_at?: string
          generated_by?: string | null
          id?: string
          narrative_text?: Json
          organization_id?: string
          self_aggregate?: Json
          self_participant_count?: number
          slice_type?: string
          slice_value?: string
          source_nai_narrative_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_nai_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_nai_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_nai_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_nai_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_nai_delta_narratives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_nai_delta_narratives_source_nai_narrative_id_fkey"
            columns: ["source_nai_narrative_id"]
            isOneToOne: false
            referencedRelation: "org_dashboard_narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      org_ptp_delta_narratives: {
        Row: {
          ai_model: string | null
          delta: Json
          generated_at: string
          generated_by: string | null
          id: string
          leader_aggregate: Json
          leader_participant_count: number
          narrative_text: Json
          organization_id: string
          slice_type: string
          slice_value: string
          source_ptp_narrative_id: string | null
          workforce_aggregate: Json
          workforce_participant_count: number
        }
        Insert: {
          ai_model?: string | null
          delta: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          leader_aggregate: Json
          leader_participant_count: number
          narrative_text: Json
          organization_id: string
          slice_type?: string
          slice_value?: string
          source_ptp_narrative_id?: string | null
          workforce_aggregate: Json
          workforce_participant_count: number
        }
        Update: {
          ai_model?: string | null
          delta?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          leader_aggregate?: Json
          leader_participant_count?: number
          narrative_text?: Json
          organization_id?: string
          slice_type?: string
          slice_value?: string
          source_ptp_narrative_id?: string | null
          workforce_aggregate?: Json
          workforce_participant_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_ptp_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_ptp_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "org_ptp_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_ptp_delta_narratives_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_ptp_delta_narratives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_ptp_delta_narratives_source_ptp_narrative_id_fkey"
            columns: ["source_ptp_narrative_id"]
            isOneToOne: false
            referencedRelation: "org_dashboard_narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_instruments: {
        Row: {
          created_at: string | null
          id: string
          instrument_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instrument_id: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instrument_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_instruments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["instrument_id"]
          },
          {
            foreignKeyName: "organization_instruments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_user_id: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_internal_test: boolean
          mfa_required: boolean
          name: string
          primary_contact_email: string | null
          seat_count: number
          status: string
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_internal_test?: boolean
          mfa_required?: boolean
          name: string
          primary_contact_email?: string | null
          seat_count?: number
          status?: string
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_internal_test?: boolean
          mfa_required?: boolean
          name?: string
          primary_contact_email?: string | null
          seat_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "organizations_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "organizations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_access_requests: {
        Row: {
          action_token: string | null
          created_at: string
          expires_at: string
          id: string
          requester_user_id: string
          responded_at: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          action_token?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          requester_user_id: string
          responded_at?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          action_token?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          requester_user_id?: string
          responded_at?: string | null
          status?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_access_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_access_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "peer_access_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_access_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_access_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_access_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "peer_access_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_access_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          expires_at: string | null
          granted_at: string
          id: string
          owner_user_id: string
          permission_level: string | null
          viewer_organization_id: string | null
          viewer_user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          owner_user_id: string
          permission_level?: string | null
          viewer_organization_id?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          owner_user_id?: string
          permission_level?: string | null
          viewer_organization_id?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "permissions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_viewer_organization_id_fkey"
            columns: ["viewer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "permissions_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_tiers: {
        Row: {
          ai_coaching_limit: number
          created_at: string
          display_name: string
          features: Json
          is_active: boolean
          one_time_credit_grant: number
          sort_order: number
          tier: string
          updated_at: string
        }
        Insert: {
          ai_coaching_limit?: number
          created_at?: string
          display_name: string
          features?: Json
          is_active?: boolean
          one_time_credit_grant?: number
          sort_order?: number
          tier: string
          updated_at?: string
        }
        Update: {
          ai_coaching_limit?: number
          created_at?: string
          display_name?: string
          features?: Json
          is_active?: boolean
          one_time_credit_grant?: number
          sort_order?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_features: {
        Row: {
          category: string | null
          enabled: boolean
          feature: string
          label: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          enabled?: boolean
          feature: string
          label?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          enabled?: boolean
          feature?: string
          label?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_versions: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deprecated_at: string | null
          id: string
          is_active: boolean
          is_deprecated: boolean
          release_notes: string | null
          version_string: string
          version_type: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          deprecated_at?: string | null
          id?: string
          is_active?: boolean
          is_deprecated?: boolean
          release_notes?: string | null
          version_string: string
          version_type?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          deprecated_at?: string | null
          id?: string
          is_active?: boolean
          is_deprecated?: boolean
          release_notes?: string | null
          version_string?: string
          version_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answer_options: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_correct: boolean
          match_pair_key: string | null
          option_image_url: string | null
          option_text: string
          question_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_correct?: boolean
          match_pair_key?: string | null
          option_image_url?: string | null
          option_text: string
          question_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_correct?: boolean
          match_pair_key?: string | null
          option_image_url?: string | null
          option_text?: string
          question_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answer_options_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answer_options_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "quiz_answer_options_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answer_options_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answer_options_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answer_options_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "quiz_answer_options_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answer_options_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          completion_id: string | null
          content_item_id: string
          id: string
          pass_threshold_pct: number
          passed: boolean
          score_pct: number
          started_at: string | null
          submitted_at: string
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          answers: Json
          attempt_number: number
          completion_id?: string | null
          content_item_id: string
          id?: string
          pass_threshold_pct: number
          passed: boolean
          score_pct: number
          started_at?: string | null
          submitted_at?: string
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          attempt_number?: number
          completion_id?: string | null
          content_item_id?: string
          id?: string
          pass_threshold_pct?: number
          passed?: boolean
          score_pct?: number
          started_at?: string | null
          submitted_at?: string
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "content_item_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          archived_at: string | null
          content_item_id: string
          created_at: string
          created_by: string | null
          display_order: number
          explanation: string | null
          id: string
          points: number
          question_image_url: string | null
          question_text: string
          question_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          content_item_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          explanation?: string | null
          id?: string
          points?: number
          question_image_url?: string | null
          question_text: string
          question_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          content_item_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          explanation?: string | null
          id?: string
          points?: number
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "quiz_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "quiz_questions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_access_grants: {
        Row: {
          created_at: string
          created_by: string | null
          grant_org_id: string | null
          grant_type: string
          grant_value: string | null
          id: string
          resource_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grant_org_id?: string | null
          grant_type: string
          grant_value?: string | null
          id?: string
          resource_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grant_org_id?: string | null
          grant_type?: string
          grant_value?: string | null
          id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "resource_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_grants_grant_org_id_fkey"
            columns: ["grant_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_grants_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_access_log: {
        Row: {
          accessed_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          accessed_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_access_log_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_tabs: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_coach_only: boolean
          is_learning_tree: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          is_coach_only?: boolean
          is_learning_tree?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_coach_only?: boolean
          is_learning_tree?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          archived_at: string | null
          audiences: string[] | null
          category: string
          content_asset_id: string | null
          content_type: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          published_at: string
          resource_tab_id: string | null
          subscale_tags: string[] | null
          summary: string | null
          thumbnail_asset_id: string | null
          title: string
          updated_at: string
          url_kind: string | null
          url_or_content: string | null
        }
        Insert: {
          archived_at?: string | null
          audiences?: string[] | null
          category?: string
          content_asset_id?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          published_at?: string
          resource_tab_id?: string | null
          subscale_tags?: string[] | null
          summary?: string | null
          thumbnail_asset_id?: string | null
          title: string
          updated_at?: string
          url_kind?: string | null
          url_or_content?: string | null
        }
        Update: {
          archived_at?: string | null
          audiences?: string[] | null
          category?: string
          content_asset_id?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          published_at?: string
          resource_tab_id?: string | null
          subscale_tags?: string[] | null
          summary?: string | null
          thumbnail_asset_id?: string | null
          title?: string
          updated_at?: string
          url_kind?: string | null
          url_or_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_content_asset_id_fkey"
            columns: ["content_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_resource_tab_id_fkey"
            columns: ["resource_tab_id"]
            isOneToOne: false
            referencedRelation: "resource_tabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      response_scales: {
        Row: {
          created_at: string
          display_label: string | null
          id: string
          notes: string | null
          numeric_equivalent: number | null
          readiness_translation: string | null
          response_value: string | null
          scale_id: string
          scale_type: string
          score_band_label: string | null
        }
        Insert: {
          created_at?: string
          display_label?: string | null
          id?: string
          notes?: string | null
          numeric_equivalent?: number | null
          readiness_translation?: string | null
          response_value?: string | null
          scale_id: string
          scale_type: string
          score_band_label?: string | null
        }
        Update: {
          created_at?: string
          display_label?: string | null
          id?: string
          notes?: string | null
          numeric_equivalent?: number | null
          readiness_translation?: string | null
          response_value?: string | null
          scale_id?: string
          scale_type?: string
          score_band_label?: string | null
        }
        Relationships: []
      }
      scheduled_assignments: {
        Row: {
          assignment_type: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          failure_summary: string | null
          id: string
          mentor_certification_id: string | null
          processed_at: string | null
          reason: string
          result: Json | null
          scheduled_by: string
          scheduled_for: string
          status: string
          target_id: string
          user_ids: string[]
        }
        Insert: {
          assignment_type: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          failure_summary?: string | null
          id?: string
          mentor_certification_id?: string | null
          processed_at?: string | null
          reason: string
          result?: Json | null
          scheduled_by: string
          scheduled_for: string
          status?: string
          target_id: string
          user_ids: string[]
        }
        Update: {
          assignment_type?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          failure_summary?: string | null
          id?: string
          mentor_certification_id?: string | null
          processed_at?: string | null
          reason?: string
          result?: Json | null
          scheduled_by?: string
          scheduled_for?: string
          status?: string
          target_id?: string
          user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_assignments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_assignments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "scheduled_assignments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_assignments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_assignments_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_assignments_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "scheduled_assignments_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_assignments_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_preferences: {
        Row: {
          created_at: string
          share_ptp_with_company_admin: boolean
          share_ptp_with_direct_reports: boolean
          share_ptp_with_organization: boolean
          share_ptp_with_supervisor: boolean
          share_ptp_with_team: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          share_ptp_with_company_admin?: boolean
          share_ptp_with_direct_reports?: boolean
          share_ptp_with_organization?: boolean
          share_ptp_with_supervisor?: boolean
          share_ptp_with_team?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          share_ptp_with_company_admin?: boolean
          share_ptp_with_direct_reports?: boolean
          share_ptp_with_organization?: boolean
          share_ptp_with_supervisor?: boolean
          share_ptp_with_team?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sharing_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sharing_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "sharing_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sharing_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_practice_iterations: {
        Row: {
          completion_id: string | null
          content_item_id: string
          created_at: string
          id: string
          iteration_number: number
          mentor_attachment_url: string | null
          mentor_signed_off_at: string | null
          mentor_signed_off_by: string | null
          outcome: string
          revision_comment: string | null
          revision_requested_at: string | null
          revision_requested_by: string | null
          trainee_attachment_url: string | null
          trainee_signed_off_at: string | null
          trainee_user_id: string
          updated_at: string
        }
        Insert: {
          completion_id?: string | null
          content_item_id: string
          created_at?: string
          id?: string
          iteration_number: number
          mentor_attachment_url?: string | null
          mentor_signed_off_at?: string | null
          mentor_signed_off_by?: string | null
          outcome?: string
          revision_comment?: string | null
          revision_requested_at?: string | null
          revision_requested_by?: string | null
          trainee_attachment_url?: string | null
          trainee_signed_off_at?: string | null
          trainee_user_id: string
          updated_at?: string
        }
        Update: {
          completion_id?: string | null
          content_item_id?: string
          created_at?: string
          id?: string
          iteration_number?: number
          mentor_attachment_url?: string | null
          mentor_signed_off_at?: string | null
          mentor_signed_off_by?: string | null
          outcome?: string
          revision_comment?: string | null
          revision_requested_at?: string | null
          revision_requested_by?: string | null
          trainee_attachment_url?: string | null
          trainee_signed_off_at?: string | null
          trainee_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_practice_iterations_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "content_item_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_mentor_signed_off_by_fkey"
            columns: ["mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_mentor_signed_off_by_fkey"
            columns: ["mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_mentor_signed_off_by_fkey"
            columns: ["mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_mentor_signed_off_by_fkey"
            columns: ["mentor_signed_off_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_revision_requested_by_fkey"
            columns: ["revision_requested_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_revision_requested_by_fkey"
            columns: ["revision_requested_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_revision_requested_by_fkey"
            columns: ["revision_requested_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_revision_requested_by_fkey"
            columns: ["revision_requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_practice_iterations_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string | null
          id: string
          is_active: boolean | null
          plan_name: string
          price_usd: number | null
          stripe_price_id: string
          tier: string
          updated_at: string | null
        }
        Insert: {
          billing_period: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_name: string
          price_usd?: number | null
          stripe_price_id: string
          tier: string
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_name?: string
          price_usd?: number | null
          stripe_price_id?: string
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          ai_chat_enabled: boolean
          created_at: string
          dashboard_access_level: string
          id: string
          instruments_included: Json
          is_active: boolean
          monthly_ai_pulls_allowance: number
          monthly_chat_allowance_per_user: number
          monthly_coaching_query_allowance: number
          name: string
          price_per_user_annual: number | null
          seat_count_default: number
          updated_at: string
        }
        Insert: {
          ai_chat_enabled?: boolean
          created_at?: string
          dashboard_access_level: string
          id?: string
          instruments_included: Json
          is_active?: boolean
          monthly_ai_pulls_allowance: number
          monthly_chat_allowance_per_user: number
          monthly_coaching_query_allowance: number
          name: string
          price_per_user_annual?: number | null
          seat_count_default?: number
          updated_at?: string
        }
        Update: {
          ai_chat_enabled?: boolean
          created_at?: string
          dashboard_access_level?: string
          id?: string
          instruments_included?: Json
          is_active?: boolean
          monthly_ai_pulls_allowance?: number
          monthly_chat_allowance_per_user?: number
          monthly_coaching_query_allowance?: number
          name?: string
          price_per_user_annual?: number | null
          seat_count_default?: number
          updated_at?: string
        }
        Relationships: []
      }
      super_admin_action_types: {
        Row: {
          action_type: string
          category: string
          created_at: string
          denylist_during_impersonation: boolean
          description: string
          is_mutation: boolean
          requires_justification: boolean
          requires_mfa: boolean
          tier: string | null
        }
        Insert: {
          action_type: string
          category: string
          created_at?: string
          denylist_during_impersonation?: boolean
          description: string
          is_mutation?: boolean
          requires_justification?: boolean
          requires_mfa?: boolean
          tier?: string | null
        }
        Update: {
          action_type?: string
          category?: string
          created_at?: string
          denylist_during_impersonation?: boolean
          description?: string
          is_mutation?: boolean
          requires_justification?: boolean
          requires_mfa?: boolean
          tier?: string | null
        }
        Relationships: []
      }
      super_admin_audit_log: {
        Row: {
          action_type: string
          affected_user_id: string | null
          after_value: Json | null
          before_value: Json | null
          company_id: string | null
          created_at: string
          detail: Json | null
          end_reason: string | null
          ended_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          mode: string | null
          reason: string | null
          session_id: string
          super_admin_user_id: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          affected_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          company_id?: string | null
          created_at?: string
          detail?: Json | null
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          mode?: string | null
          reason?: string | null
          session_id: string
          super_admin_user_id: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          affected_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          company_id?: string | null
          created_at?: string
          detail?: Json | null
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          mode?: string | null
          reason?: string | null
          session_id?: string
          super_admin_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_audit_log_action_type_fkey"
            columns: ["action_type"]
            isOneToOne: false
            referencedRelation: "super_admin_action_types"
            referencedColumns: ["action_type"]
          },
          {
            foreignKeyName: "super_admin_audit_log_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          manager_user_id: string | null
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_user_id?: string | null
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_user_id?: string | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "teams_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trigger_logic: {
        Row: {
          created_at: string
          id: string
          rationale: string | null
          recommended_action: string | null
          report_flag_text: string | null
          source_dimension: string | null
          source_instrument: string | null
          target_dimension: string | null
          target_instrument: string | null
          trigger_condition: string | null
          trigger_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rationale?: string | null
          recommended_action?: string | null
          report_flag_text?: string | null
          source_dimension?: string | null
          source_instrument?: string | null
          target_dimension?: string | null
          target_instrument?: string | null
          trigger_condition?: string | null
          trigger_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rationale?: string | null
          recommended_action?: string | null
          report_flag_text?: string | null
          source_dimension?: string | null
          source_instrument?: string | null
          target_dimension?: string | null
          target_instrument?: string | null
          trigger_condition?: string | null
          trigger_id?: string
        }
        Relationships: []
      }
      user_curriculum_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          certification_id: string | null
          completed_at: string | null
          curriculum_id: string
          due_at: string | null
          id: string
          notes: string | null
          source: string
          source_reference_id: string | null
          status: string
          unassigned_at: string | null
          unassigned_by: string | null
          unassigned_reason: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          certification_id?: string | null
          completed_at?: string | null
          curriculum_id: string
          due_at?: string | null
          id?: string
          notes?: string | null
          source: string
          source_reference_id?: string | null
          status?: string
          unassigned_at?: string | null
          unassigned_by?: string | null
          unassigned_reason?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          certification_id?: string | null
          completed_at?: string | null
          curriculum_id?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          source?: string
          source_reference_id?: string | null
          status?: string
          unassigned_at?: string | null
          unassigned_by?: string | null
          unassigned_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_curriculum_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "coach_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_demographics: {
        Row: {
          age_range: string | null
          consent_granted_at: string | null
          consent_withdrawn_at: string | null
          gender_identity: string | null
          id: string
          industry: string | null
          national_origin: string | null
          org_size: string | null
          racial_ethnic_identity: string | null
          role_in_org: string | null
          user_id: string
          years_experience: string | null
        }
        Insert: {
          age_range?: string | null
          consent_granted_at?: string | null
          consent_withdrawn_at?: string | null
          gender_identity?: string | null
          id?: string
          industry?: string | null
          national_origin?: string | null
          org_size?: string | null
          racial_ethnic_identity?: string | null
          role_in_org?: string | null
          user_id: string
          years_experience?: string | null
        }
        Update: {
          age_range?: string | null
          consent_granted_at?: string | null
          consent_withdrawn_at?: string | null
          gender_identity?: string | null
          id?: string
          industry?: string | null
          national_origin?: string | null
          org_size?: string | null
          racial_ethnic_identity?: string | null
          role_in_org?: string | null
          user_id?: string
          years_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_demographics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_demographics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_demographics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_demographics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          due_at: string | null
          id: string
          module_id: string
          notes: string | null
          source: string
          source_reference_id: string | null
          status: string
          unassigned_at: string | null
          unassigned_by: string | null
          unassigned_reason: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          due_at?: string | null
          id?: string
          module_id: string
          notes?: string | null
          source: string
          source_reference_id?: string | null
          status?: string
          unassigned_at?: string | null
          unassigned_by?: string | null
          unassigned_reason?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          due_at?: string | null
          id?: string
          module_id?: string
          notes?: string | null
          source?: string
          source_reference_id?: string | null
          status?: string
          unassigned_at?: string | null
          unassigned_by?: string | null
          unassigned_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_module_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_module_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_module_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          channel: string
          created_at: string
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          archived_at: string | null
          created_at: string
          dedup_key: string | null
          id: string
          notification_type: string
          payload: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          dedup_key?: string | null
          id?: string
          notification_type: string
          payload?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          dedup_key?: string | null
          id?: string
          notification_type?: string
          payload?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: string
          account_type: string | null
          avatar_asset_id: string | null
          bio: string | null
          conversion_token: string | null
          conversion_token_expires_at: string | null
          coupon_amount: number | null
          coupon_expires_at: string | null
          created_at: string
          date_format: string | null
          deactivated_at: string | null
          deactivation_reason: string | null
          deleted_at: string | null
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          is_internal_test: boolean
          is_mentor: boolean
          is_practitioner_coach: boolean
          notifications: Json | null
          onboarding_completed_at: string | null
          onboarding_instrument_version: string | null
          one_time_chat_credits: number
          org_level: string | null
          organization_id: string | null
          personal_email_pending: string | null
          privacy_accepted_at: string | null
          privacy_version_accepted: string | null
          pseudonymized_at: string | null
          reactivation_deadline: string | null
          share_results_with_coach: boolean
          stripe_coupon_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_tier: string
          supervisor_user_id: string | null
          timezone: string | null
          tos_accepted_at: string | null
          tos_version_accepted: string | null
          ui_preferences: Json
        }
        Insert: {
          account_status?: string
          account_type?: string | null
          avatar_asset_id?: string | null
          bio?: string | null
          conversion_token?: string | null
          conversion_token_expires_at?: string | null
          coupon_amount?: number | null
          coupon_expires_at?: string | null
          created_at?: string
          date_format?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_internal_test?: boolean
          is_mentor?: boolean
          is_practitioner_coach?: boolean
          notifications?: Json | null
          onboarding_completed_at?: string | null
          onboarding_instrument_version?: string | null
          one_time_chat_credits?: number
          org_level?: string | null
          organization_id?: string | null
          personal_email_pending?: string | null
          privacy_accepted_at?: string | null
          privacy_version_accepted?: string | null
          pseudonymized_at?: string | null
          reactivation_deadline?: string | null
          share_results_with_coach?: boolean
          stripe_coupon_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          supervisor_user_id?: string | null
          timezone?: string | null
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          ui_preferences?: Json
        }
        Update: {
          account_status?: string
          account_type?: string | null
          avatar_asset_id?: string | null
          bio?: string | null
          conversion_token?: string | null
          conversion_token_expires_at?: string | null
          coupon_amount?: number | null
          coupon_expires_at?: string | null
          created_at?: string
          date_format?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_internal_test?: boolean
          is_mentor?: boolean
          is_practitioner_coach?: boolean
          notifications?: Json | null
          onboarding_completed_at?: string | null
          onboarding_instrument_version?: string | null
          one_time_chat_credits?: number
          org_level?: string | null
          organization_id?: string | null
          personal_email_pending?: string | null
          privacy_accepted_at?: string | null
          privacy_version_accepted?: string | null
          pseudonymized_at?: string | null
          reactivation_deadline?: string | null
          share_results_with_coach?: boolean
          stripe_coupon_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          supervisor_user_id?: string | null
          timezone?: string | null
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          ui_preferences?: Json
        }
        Relationships: [
          {
            foreignKeyName: "users_avatar_asset_id_fkey"
            columns: ["avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["department_joined_id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      written_submissions: {
        Row: {
          char_count: number
          completion_id: string | null
          content: string
          content_item_id: string
          id: string
          iteration_number: number
          review_decision: string | null
          reviewed_at: string | null
          reviewer_comments: string | null
          reviewer_user_id: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          char_count: number
          completion_id?: string | null
          content: string
          content_item_id: string
          id?: string
          iteration_number: number
          review_decision?: string | null
          reviewed_at?: string | null
          reviewer_comments?: string | null
          reviewer_user_id?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          char_count?: number
          completion_id?: string | null
          content?: string
          content_item_id?: string
          id?: string
          iteration_number?: number
          review_decision?: string | null
          reviewed_at?: string | null
          reviewer_comments?: string | null
          reviewer_user_id?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "written_submissions_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "content_item_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_submissions_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_submissions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_submissions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "written_submissions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_submissions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "written_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_org_users_view: {
        Row: {
          account_type: string | null
          deactivated_at: string | null
          deactivation_reason: string | null
          department_id: string | null
          department_joined_id: string | null
          department_joined_name: string | null
          email: string | null
          full_name: string | null
          id: string | null
          org_level: string | null
          organization_id: string | null
          reactivation_deadline: string | null
          supervisor_joined_email: string | null
          supervisor_joined_full_name: string | null
          supervisor_joined_id: string | null
          supervisor_user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["department_joined_id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients_client_view: {
        Row: {
          assessment_id: string | null
          client_email: string | null
          client_first_name: string | null
          client_last_name: string | null
          client_user_id: string | null
          coach_user_id: string | null
          context_progress: string | null
          created_at: string | null
          debrief_completed: boolean | null
          expires_at: string | null
          id: string | null
          instrument_id: string | null
          invitation_source: string | null
          invitation_status: string | null
          paired_assessment_id: string | null
          results_released: boolean | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          client_email?: string | null
          client_first_name?: string | null
          client_last_name?: string | null
          client_user_id?: string | null
          coach_user_id?: string | null
          context_progress?: string | null
          created_at?: string | null
          debrief_completed?: boolean | null
          expires_at?: string | null
          id?: string | null
          instrument_id?: string | null
          invitation_source?: string | null
          invitation_status?: string | null
          paired_assessment_id?: string | null
          results_released?: boolean | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          client_email?: string | null
          client_first_name?: string | null
          client_last_name?: string | null
          client_user_id?: string | null
          coach_user_id?: string | null
          context_progress?: string | null
          created_at?: string | null
          debrief_completed?: boolean | null
          expires_at?: string | null
          id?: string | null
          instrument_id?: string | null
          invitation_source?: string | null
          invitation_status?: string | null
          paired_assessment_id?: string | null
          results_released?: boolean | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_clients_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_paired_assessment_id_fkey"
            columns: ["paired_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users_public: {
        Row: {
          account_type: string | null
          created_at: string | null
          deactivated_at: string | null
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string | null
          org_level: string | null
          organization_id: string | null
          supervisor_user_id: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          org_level?: string | null
          organization_id?: string | null
          supervisor_user_id?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          org_level?: string | null
          organization_id?: string | null
          supervisor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["department_joined_id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_user_id_fkey"
            columns: ["supervisor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_features_view: {
        Row: {
          ai_chat_enabled: boolean | null
          dashboard_access_level: string | null
          data_retention_mode: string | null
          end_date: string | null
          instruments_included: Json | null
          monthly_ai_pulls_allowance: number | null
          monthly_chat_allowance_per_user: number | null
          monthly_coaching_query_allowance: number | null
          organization_id: string | null
          seat_count: number | null
          start_date: string | null
          supervisor_dashboard_enabled: boolean | null
          tier_id: string | null
          tier_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _archive_asset_internal: {
        Args: {
          p_archive_reason: string
          p_asset_id: string
          p_caller_id: string
        }
        Returns: undefined
      }
      _archive_thumbnail_ref_and_maybe_asset: {
        Args: {
          p_archive_reason: string
          p_caller_id: string
          p_old_asset_id: string
          p_parent_id: string
          p_parent_type: string
        }
        Returns: undefined
      }
      _asset_active_ref_count: { Args: { p_asset_id: string }; Returns: number }
      _asset_extract_ext: { Args: { p_filename: string }; Returns: string }
      _asset_kind_mime_allowed: {
        Args: { p_asset_kind: string; p_mime: string }
        Returns: boolean
      }
      _asset_kind_size_ceiling: {
        Args: { p_asset_kind: string }
        Returns: number
      }
      _cascade_archive_asset_refs_for_certification_path: {
        Args: {
          p_archive_reason: string
          p_caller_id: string
          p_certification_path_id: string
        }
        Returns: Json
      }
      _cascade_archive_asset_refs_for_content_item: {
        Args: {
          p_archive_reason: string
          p_caller_id: string
          p_content_item_id: string
        }
        Returns: Json
      }
      _cascade_archive_asset_refs_for_curriculum: {
        Args: {
          p_archive_reason: string
          p_caller_id: string
          p_curriculum_id: string
        }
        Returns: Json
      }
      _cascade_archive_asset_refs_for_lesson_blocks: {
        Args: {
          p_archive_reason: string
          p_caller_id: string
          p_lesson_block_ids: string[]
        }
        Returns: Json
      }
      _cascade_archive_asset_refs_for_module: {
        Args: {
          p_archive_reason: string
          p_caller_id: string
          p_module_id: string
        }
        Returns: Json
      }
      _cascade_archive_asset_refs_for_newsletter_article: {
        Args: {
          p_archive_reason: string
          p_article_id: string
          p_caller_id: string
        }
        Returns: Json
      }
      _compute_completion_cascade: {
        Args: { p_content_item_id: string; p_user_id: string }
        Returns: Json
      }
      _compute_recommended_next_for_curriculum: {
        Args: { p_curriculum_id: string; p_user_id: string }
        Returns: Json
      }
      _compute_recommended_next_for_module: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: Json
      }
      _duplicate_curriculum_full: {
        Args: {
          p_caller_id: string
          p_new_name: string
          p_new_slug: string
          p_source_curriculum_id: string
        }
        Returns: string
      }
      _duplicate_module_children: {
        Args: {
          p_caller_id: string
          p_source_module_id: string
          p_target_module_id: string
        }
        Returns: undefined
      }
      _insert_comp_coupon_row: {
        Args: {
          p_applicable_account_types: string[]
          p_applicable_instrument_ids: string[]
          p_caller_user_id: string
          p_description: string
          p_duration: string
          p_duration_in_months: number
          p_internal_name: string
          p_max_redemptions: number
          p_notes: string
          p_percent_off: number
          p_reason: string
          p_redeem_by: string
          p_stripe_coupon_id: string
        }
        Returns: string
      }
      _manual_completion_blocking_cert: {
        Args: { p_curriculum_id: string; p_user_id: string }
        Returns: string
      }
      _manual_recompute_curriculum_assignment: {
        Args: { p_assignment_id: string }
        Returns: string
      }
      _manual_recompute_module: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: string
      }
      _ops_emit_from_sel: {
        Args: {
          p_detail: string
          p_invoice: string
          p_org: string
          p_uid: string
        }
        Returns: number
      }
      _rebind_newsletter_article_asset_refs: {
        Args: { p_article_id: string; p_caller_id: string }
        Returns: Json
      }
      _send_newsletter_confirmation_email_internal: {
        Args: { p_raw_token: string; p_subscriber_id: string }
        Returns: Json
      }
      _snapshot_article_version: {
        Args: {
          p_article_id: string
          p_restored_from_version_id?: string
          p_version_name?: string
          p_version_type: string
        }
        Returns: string
      }
      _sync_to_resend_audience_internal: {
        Args: { p_action: string; p_subscriber_id: string }
        Returns: Json
      }
      _upsert_thumbnail_ref: {
        Args: {
          p_asset_id: string
          p_caller_id: string
          p_parent_id: string
          p_parent_type: string
        }
        Returns: undefined
      }
      _validate_thumbnail_asset: {
        Args: { p_asset_id: string }
        Returns: undefined
      }
      _walk_block_config_for_asset_refs: {
        Args: { p_block_type: string; p_config: Json }
        Returns: {
          out_asset_id: string
          out_ref_field: string
        }[]
      }
      _walk_tiptap_for_image_asset_refs: {
        Args: { p_body_tiptap: Json }
        Returns: {
          out_asset_id: string
          out_ref_path: string
        }[]
      }
      accept_coach_disclosure: {
        Args: { p_version_hash: string; p_version_id: string }
        Returns: Json
      }
      admin_assign_org_admin: {
        Args: {
          p_is_transfer: boolean
          p_organization_id: string
          p_target_email: string
        }
        Returns: string
      }
      admin_create_organization: {
        Args: {
          p_ai_chat_enabled: boolean
          p_ai_monthly_message_allowance: number
          p_ai_report_regeneration_allowance: number
          p_contract_end_date: string
          p_contract_notes: string
          p_contract_start_date: string
          p_data_retention_mode: string
          p_license_count: number
          p_name: string
          p_primary_contact_email: string
        }
        Returns: string
      }
      admin_invitation_create: {
        Args: {
          p_account_type?: string
          p_department_name?: string
          p_invitee_email: string
          p_org_level?: string
          p_organization_id: string
          p_session_id: string
          p_supervisor_email?: string
        }
        Returns: {
          code: string
          expires_at: string
          invitation_id: string
        }[]
      }
      admin_log_password_reset: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      admin_promote_to_company_admin: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      admin_promote_to_org_admin: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      admin_reset_user_mfa: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: Json
      }
      admin_revoke_company_admin: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      ai_counter_check: {
        Args: { p_pool: string; p_user_id?: string }
        Returns: {
          out_limit: number
          out_remaining: number
          out_used: number
        }[]
      }
      ai_counter_increment: {
        Args: { p_pool: string; p_user_id?: string }
        Returns: number
      }
      ai_counter_reset: {
        Args: { p_org: string; p_pool: string; p_user_id?: string }
        Returns: undefined
      }
      airsa_can_generate_combined_result: {
        Args: { p_self_assessment_id: string }
        Returns: {
          out_can_generate: boolean
          out_manager_assessment_id: string
          out_manager_completed_at: string
          out_mode: string
          out_reason: string
          out_self_assessment_id: string
          out_self_completed_at: string
          out_self_only_released_at: string
        }[]
      }
      airsa_get_my_paired_manager_status: {
        Args: { p_self_assessment_id: string }
        Returns: {
          last_reminder_sent_at: string
          paired_assessment_id: string
          paired_status: string
          reminder_count: number
        }[]
      }
      airsa_get_paired_self_rater_name: {
        Args: { p_manager_assessment_id: string }
        Returns: {
          out_full_name: string
        }[]
      }
      airsa_release_self_only: {
        Args: { p_self_assessment_id: string }
        Returns: {
          out_self_assessment_id: string
          out_self_only_released_at: string
          out_was_already_released: boolean
        }[]
      }
      airsa_request_rerate: {
        Args: { p_self_assessment_id: string }
        Returns: {
          out_manager_in_progress_discarded: boolean
          out_new_self_assessment_id: string
          out_old_manager_assessment_id: string
          out_old_self_assessment_id: string
        }[]
      }
      airsa_role_access: {
        Args: { p_owner_user_id: string; p_viewer_user_id: string }
        Returns: boolean
      }
      airsa_send_reminder: {
        Args: { p_self_assessment_id: string }
        Returns: {
          out_last_reminder_sent_at: string
          out_manager_assessment_id: string
          out_reminder_count: number
          out_self_rater_email: string
          out_self_rater_full_name: string
          out_supervisor_email: string
          out_supervisor_full_name: string
          out_supervisor_user_id: string
        }[]
      }
      apply_post_certification_benefits: {
        Args: { p_certification_id: string }
        Returns: Json
      }
      archive_article: {
        Args: { p_article_id: string; p_reason: string }
        Returns: Json
      }
      archive_asset_manual: {
        Args: { p_asset_id: string; p_force?: boolean; p_reason: string }
        Returns: Json
      }
      archive_asset_ref: {
        Args: { p_reason: string; p_ref_id: string }
        Returns: Json
      }
      archive_certification_path: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      archive_comp_coupon: {
        Args: { p_coupon_id: string; p_reason: string }
        Returns: Json
      }
      archive_content_item: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      archive_curriculum: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      archive_module: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      archive_newsletter_category: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      archive_notification: { Args: { p_id: string }; Returns: Json }
      archive_poll: {
        Args: { p_poll_id: string; p_reason: string }
        Returns: Json
      }
      archive_quiz_answer_option: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      archive_quiz_question: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      archive_resource: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      assert_impersonation_allows: {
        Args: { p_action_category: string }
        Returns: {
          imp_actor_user_id: string
          imp_mode: string
          imp_session_id: string
          imp_target_user_id: string
          status: string
        }[]
      }
      assert_super_admin: { Args: never; Returns: undefined }
      assign_curriculum_bulk: {
        Args: {
          p_certification_id: string
          p_curriculum_id: string
          p_due_at: string
          p_reason: string
          p_source: string
          p_source_reference_id: string
          p_user_ids: string[]
        }
        Returns: Json
      }
      assign_curriculum_directly: {
        Args: {
          p_certification_id?: string
          p_curriculum_id: string
          p_due_at?: string
          p_reason?: string
          p_source?: string
          p_source_reference_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      assign_executive_perspective_assessment: {
        Args: {
          p_assignee_user_ids: string[]
          p_notes?: string
          p_organization_id: string
        }
        Returns: Json
      }
      assign_mentor: {
        Args: {
          p_certification_id: string
          p_mentor_user_id: string
          p_reason?: string
          p_trainee_user_id: string
        }
        Returns: Json
      }
      assign_mentor_bulk: {
        Args: {
          p_certification_id: string
          p_mentor_user_id: string
          p_reason: string
          p_trainee_user_ids: string[]
        }
        Returns: Json
      }
      assign_mentor_pairs_bulk: {
        Args: { p_mentor_user_id: string; p_pairs: Json; p_reason: string }
        Returns: Json
      }
      assign_module_bulk: {
        Args: {
          p_due_at: string
          p_module_id: string
          p_reason: string
          p_source: string
          p_source_reference_id: string
          p_user_ids: string[]
        }
        Returns: Json
      }
      assign_module_directly: {
        Args: {
          p_due_at?: string
          p_module_id: string
          p_reason?: string
          p_source?: string
          p_source_reference_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      audit_event_detail: {
        Args: { p_event_id: string }
        Returns: {
          action_category: string
          action_type: string
          actor_account_type: string
          actor_email: string
          actor_full_name: string
          actor_user_id: string
          after_value: Json
          before_value: Json
          created_at: string
          detail: Json
          end_reason: string
          ended_at: string
          event_id: string
          expires_at: string
          ip_address: unknown
          mode: string
          organization_id: string
          organization_name: string
          reason: string
          session_id: string
          target_account_type: string
          target_email: string
          target_full_name: string
          target_user_id: string
          user_agent: string
        }[]
      }
      audit_session_replay: { Args: { p_session_id: string }; Returns: Json }
      auto_save_article: {
        Args: {
          p_article_id: string
          p_body_tiptap: Json
          p_canonical_url?: string
          p_excerpt?: string
          p_read_time_minutes?: number
          p_seo_description?: string
          p_seo_title?: string
          p_title?: string
          p_word_count?: number
        }
        Returns: Json
      }
      bulk_coach_invitation_create: {
        Args: { p_rows: Json }
        Returns: {
          client_email: string
          coach_client_id: string
          error_code: string
          error_message: string
          instrument_id: string
          payment_mode: string
          requires_checkout: boolean
          row_index: number
          success: boolean
        }[]
      }
      bulk_deactivate_users: { Args: { p_user_ids: string[] }; Returns: Json }
      bulk_invitation_create: {
        Args: { p_organization_id: string; p_rows: Json }
        Returns: {
          code: string
          department_created: boolean
          error_code: string
          error_message: string
          invitation_id: string
          invitee_email: string
          row_index: number
          success: boolean
        }[]
      }
      calculate_nai_readiness_index: {
        Args: { p_dimension_scores: Json }
        Returns: number
      }
      cancel_individual_conversion: { Args: never; Returns: Json }
      cancel_scheduled_article: {
        Args: { p_article_id: string; p_reason: string }
        Returns: Json
      }
      cancel_scheduled_assignment: { Args: { p_id: string }; Returns: Json }
      check_mfa_freshness: {
        Args: { p_max_age_seconds?: number; p_session_id: string }
        Returns: boolean
      }
      claim_content_item_ai_assist: {
        Args: { p_content_item_id: string }
        Returns: Json
      }
      close_chat_session: { Args: { p_session_id: string }; Returns: undefined }
      coach_invitation_revoke: {
        Args: { p_coach_client_id: string }
        Returns: {
          out_client_email: string
          out_coach_client_id: string
          out_invitation_source: string
          out_revoked_at: string
          out_stripe_coupon_id: string
        }[]
      }
      coach_shareable_link_coach_paid: {
        Args: {
          p_client_email: string
          p_client_first_name: string
          p_client_last_name: string
          p_coach_note?: string
          p_instrument_ids: string[]
        }
        Returns: {
          batch_id: string
          row_count: number
          total_amount: number
        }[]
      }
      coach_shareable_link_self_pay: {
        Args: {
          p_client_email: string
          p_client_first_name: string
          p_client_last_name: string
          p_coach_note?: string
          p_instrument_ids: string[]
        }
        Returns: {
          coach_client_id: string
          expires_at: string
          instrument_id: string
        }[]
      }
      commit_article_version: {
        Args: { p_article_id: string; p_reason: string; p_version_name: string }
        Returns: Json
      }
      complete_epn_assessment: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      complete_lesson: { Args: { p_content_item_id: string }; Returns: Json }
      compose_notification_email: {
        Args: {
          p_full_name: string
          p_notification_type: string
          p_payload: Json
          p_user_id: string
        }
        Returns: {
          html_body: string
          subject: string
        }[]
      }
      confirm_external_link: {
        Args: { p_content_item_id: string; p_reflection_text?: string }
        Returns: Json
      }
      confirm_newsletter_subscription: {
        Args: { p_token: string }
        Returns: Json
      }
      consume_assessment_purchase: {
        Args: {
          p_assessment_id: string
          p_context_type?: string
          p_instrument_short_name: string
          p_user_id: string
        }
        Returns: string
      }
      consume_one_time_chat_credit: {
        Args: { p_user: string }
        Returns: number
      }
      contract_upsert: {
        Args: {
          p_ai_chat_enabled_override?: boolean
          p_dashboard_access_level_override?: string
          p_data_retention_mode: string
          p_end_date: string
          p_instruments_included_override?: Json
          p_monthly_ai_pulls_allowance_override?: number
          p_monthly_chat_allowance_per_user_override?: number
          p_monthly_coaching_query_allowance_override?: number
          p_notes: string
          p_organization_id: string
          p_seat_count: number
          p_start_date: string
          p_tier_id: string
        }
        Returns: string
      }
      corporate_employee_choose_individual: {
        Args: { p_personal_email: string }
        Returns: Json
      }
      corporate_employee_run_pseudonym_now: {
        Args: { p_confirmation_phrase: string }
        Returns: Json
      }
      corporate_employee_verify_individual: {
        Args: { p_token: string }
        Returns: Json
      }
      create_actor_debrief_order: {
        Args: {
          p_actor_email: string
          p_actor_first_name: string
          p_certification_id: string
          p_coach_note?: string
          p_email_html?: string
        }
        Returns: Json
      }
      create_asset_ref: {
        Args: {
          p_asset_id: string
          p_content_item_id: string
          p_lesson_block_id: string
          p_reason: string
          p_ref_field: string
          p_resource_id?: string
        }
        Returns: Json
      }
      create_manual_org_intervention: {
        Args: {
          p_assigned_owner_user_id?: string
          p_description: string
          p_intervention_type?: string
          p_manual_source_instrument_id: string
          p_priority?: string
          p_status?: string
          p_target_completion_date?: string
          p_target_dimensions?: string[]
          p_time_horizon?: string
          p_title: string
          p_tracking_notes?: string
        }
        Returns: string
      }
      create_newsletter_category: {
        Args: {
          p_display_name: string
          p_reason: string
          p_slug: string
          p_sort_order: number
        }
        Returns: Json
      }
      create_poll: {
        Args: {
          p_article_id: string
          p_node_id: string
          p_options: Json
          p_question: string
          p_reason: string
          p_style: string
          p_votes_visible: boolean
        }
        Returns: Json
      }
      create_scheduled_assignment: {
        Args: {
          p_assignment_type: string
          p_mentor_certification_id?: string
          p_reason: string
          p_scheduled_for: string
          p_target_id: string
          p_user_ids: string[]
        }
        Returns: Json
      }
      cron_publish_and_dispatch_due_articles: { Args: never; Returns: Json }
      current_user_account_type: { Args: never; Returns: string }
      current_user_active_plan_tier: { Args: never; Returns: string }
      current_user_department_id: { Args: never; Returns: string }
      current_user_is_mentor: { Args: never; Returns: boolean }
      current_user_is_practitioner_coach: { Args: never; Returns: boolean }
      current_user_mfa_required: { Args: never; Returns: boolean }
      current_user_mfa_satisfied: { Args: never; Returns: boolean }
      current_user_org_id: { Args: never; Returns: string }
      current_user_supervisor_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_ai_authoring_conversation: {
        Args: { p_content_item_id: string }
        Returns: {
          out_conversation_deleted: boolean
          out_documents_deleted: number
        }[]
      }
      delete_ai_authoring_session_document: {
        Args: { p_document_id: string }
        Returns: {
          out_deleted: boolean
          out_storage_path: string
        }[]
      }
      delete_feedback_template: { Args: { p_id: string }; Returns: Json }
      delete_org_intervention: {
        Args: { p_intervention_id: string }
        Returns: boolean
      }
      department_create: {
        Args: { p_name: string; p_organization_id: string }
        Returns: string
      }
      department_delete: {
        Args: {
          p_action: string
          p_dept_id: string
          p_reassign_to_dept_id?: string
        }
        Returns: undefined
      }
      department_find_or_create: {
        Args: { p_name: string; p_organization_id: string }
        Returns: {
          canonical_name: string
          dept_id: string
          was_created: boolean
        }[]
      }
      department_rename: {
        Args: { p_dept_id: string; p_new_name: string }
        Returns: undefined
      }
      detach_curriculum_from_certification_path: {
        Args: {
          p_certification_path_id: string
          p_curriculum_id: string
          p_reason: string
        }
        Returns: Json
      }
      detach_module_from_curriculum: {
        Args: { p_curriculum_id: string; p_module_id: string; p_reason: string }
        Returns: Json
      }
      discard_lesson_block_draft: {
        Args: { p_content_item_id: string }
        Returns: Json
      }
      duplicate_certification_path: {
        Args: {
          p_new_name: string
          p_new_slug: string
          p_reason: string
          p_source_certification_path_id: string
        }
        Returns: Json
      }
      duplicate_curriculum: {
        Args: {
          p_new_name: string
          p_new_slug: string
          p_reason: string
          p_source_curriculum_id: string
        }
        Returns: Json
      }
      duplicate_module: {
        Args: {
          p_new_name: string
          p_new_slug: string
          p_reason: string
          p_source_module_id: string
        }
        Returns: Json
      }
      enroll_user_in_certification_path: {
        Args: {
          p_certification_path_id: string
          p_due_at?: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      enroll_users_in_certification_path_bulk: {
        Args: {
          p_certification_path_id: string
          p_due_at?: string
          p_reason: string
          p_user_ids: string[]
        }
        Returns: Json
      }
      expire_pending_newsletter_confirmations: { Args: never; Returns: Json }
      export_audit_events: { Args: { p_filters?: Json }; Returns: Json }
      finalize_asset_upload: {
        Args: { p_asset_id: string; p_reason: string }
        Returns: Json
      }
      finalize_new_asset_version: {
        Args: { p_asset_id: string; p_reason: string; p_version_id: string }
        Returns: Json
      }
      generate_invitation_code: { Args: never; Returns: string }
      get_accessible_peer_results: {
        Args: { p_instrument: string }
        Returns: {
          department_id: string
          department_name: string
          email: string
          full_name: string
          org_level: string
          supervisor_user_id: string
          user_id: string
        }[]
      }
      get_ai_authoring_conversation: {
        Args: { p_content_item_id: string }
        Returns: {
          out_attached_document_ids: string[]
          out_created_at: string
          out_custom_voice_example: string
          out_custom_voice_guidance: string
          out_full_content_state: Json
          out_id: string
          out_length_preference: string
          out_messages: Json
          out_mode: string
          out_outline_state: Json
          out_stage: string
          out_updated_at: string
          out_voice_preset_key: string
        }[]
      }
      get_airsa_aggregate: {
        Args: { p_slice_type?: string; p_slice_value?: string }
        Returns: Json
      }
      get_applicable_comp_coupon: {
        Args: { p_caller_user_id: string; p_instrument_id: string }
        Returns: {
          out_coupon_id: string
          out_internal_name: string
          out_percent_off: number
          out_stripe_coupon_id: string
        }[]
      }
      get_article_for_reader: { Args: { p_slug: string }; Returns: Json }
      get_article_version: { Args: { p_version_id: string }; Returns: Json }
      get_assets_due_for_archive_email: {
        Args: never
        Returns: {
          archive_reason: string
          archived_at: string
          asset_id: string
          bucket: string
          is_library_asset: boolean
          library_name: string
          mime_type: string
          original_filename: string
          path: string
          size_bytes: number
        }[]
      }
      get_cert_path_detail: {
        Args: { p_certification_path_id: string; p_user_id?: string }
        Returns: Json
      }
      get_certification_credential: {
        Args: { p_certification_id: string }
        Returns: Json
      }
      get_chain_of_command: {
        Args: { p_user_id?: string }
        Returns: {
          out_depth: number
          out_email: string
          out_full_name: string
          out_org_level: string
          out_user_id: string
        }[]
      }
      get_coach_disclosure_status: { Args: never; Returns: Json }
      get_content_item_for_viewer: {
        Args: { p_content_item_id: string; p_user_id?: string }
        Returns: Json
      }
      get_content_item_video_asset: {
        Args: { p_content_item_id: string; p_user_id?: string }
        Returns: {
          out_asset_id: string
          out_bucket: string
          out_mime_type: string
          out_original_filename: string
          out_path: string
          out_size_bytes: number
        }[]
      }
      get_content_item_video_playback: {
        Args: { p_content_item_id: string }
        Returns: {
          out_mux_status: string
          out_playback_id: string
          out_video_source_type: string
        }[]
      }
      get_curriculum_detail: {
        Args: { p_curriculum_id: string; p_user_id?: string }
        Returns: Json
      }
      get_instrument_aggregate: {
        Args: {
          p_context_type?: string
          p_instrument: string
          p_slice_type?: string
          p_slice_value?: string
        }
        Returns: Json
      }
      get_item_aggregate: {
        Args: {
          p_instrument: string
          p_slice_type?: string
          p_slice_value?: string
        }
        Returns: Json
      }
      get_learning_import_reference: { Args: never; Returns: Json }
      get_lesson_block_assets: {
        Args: { p_content_item_id: string; p_extra_asset_ids?: string[] }
        Returns: {
          out_asset_id: string
          out_asset_kind: string
          out_bucket: string
          out_path: string
        }[]
      }
      get_lesson_block_assets_for_trainee: {
        Args: { p_content_item_id: string; p_user_id?: string }
        Returns: {
          out_asset_id: string
          out_asset_kind: string
          out_bucket: string
          out_mime_type: string
          out_path: string
        }[]
      }
      get_mentorable_certifications: {
        Args: { p_mentor_user_id: string; p_trainee_user_id: string }
        Returns: Json
      }
      get_module_detail: {
        Args: { p_module_id: string; p_user_id?: string }
        Returns: Json
      }
      get_my_direct_reports: {
        Args: never
        Returns: {
          out_department_id: string
          out_department_name: string
          out_email: string
          out_full_name: string
          out_org_level: string
          out_user_id: string
        }[]
      }
      get_my_epn_assignments: {
        Args: never
        Returns: {
          assigned_at: string
          assignment_id: string
          instrument_id: string
          notes: string
          organization_id: string
          organization_name: string
          status: string
        }[]
      }
      get_my_newsletter_subscription: { Args: never; Returns: Json }
      get_my_team: {
        Args: never
        Returns: {
          out_department_id: string
          out_department_name: string
          out_email: string
          out_full_name: string
          out_org_level: string
          out_user_id: string
        }[]
      }
      get_nai_epn_delta: {
        Args: {
          p_exclude_leaders_from_self?: boolean
          p_organization_id: string
          p_slice_type?: string
          p_slice_value?: string
        }
        Returns: Json
      }
      get_newsletter_author_bio: { Args: { p_user_id: string }; Returns: Json }
      get_notification_preferences: { Args: never; Returns: Json }
      get_org_intervention_history: {
        Args: { p_intervention_id: string }
        Returns: {
          out_changed_at: string
          out_changed_by_email: string
          out_changed_by_full_name: string
          out_changed_by_user_id: string
          out_id: string
          out_intervention_id: string
          out_new_status: string
          out_notes_at_change: string
          out_old_status: string
        }[]
      }
      get_org_narrative_history: {
        Args: {
          p_instrument: string
          p_limit?: number
          p_slice_type?: string
          p_slice_value?: string
        }
        Returns: Json
      }
      get_org_usage_summary: { Args: { p_instrument?: string }; Returns: Json }
      get_own_immutable_fields: {
        Args: never
        Returns: {
          account_type: string
          created_at: string
          email: string
          organization_id: string
          subscription_status: string
          subscription_tier: string
        }[]
      }
      get_poll_results: { Args: { p_poll_id: string }; Returns: Json }
      get_ptp_leader_workforce_delta: {
        Args: {
          p_organization_id: string
          p_slice_type?: string
          p_slice_value?: string
        }
        Returns: Json
      }
      get_quiz_attempt_results: {
        Args: { p_attempt_id: string }
        Returns: Json
      }
      get_quiz_for_trainee: {
        Args: { p_content_item_id: string }
        Returns: Json
      }
      get_related_articles_by_category: {
        Args: { p_max_count?: number; p_source_article_id: string }
        Returns: Json
      }
      get_related_articles_by_ids: {
        Args: { p_article_ids: string[]; p_max_count?: number }
        Returns: Json
      }
      get_related_articles_by_tags: {
        Args: {
          p_max_count?: number
          p_source_article_id: string
          p_tag_match_mode?: string
        }
        Returns: Json
      }
      get_resource_content_asset: {
        Args: { p_resource_id: string }
        Returns: {
          out_asset_id: string
          out_bucket: string
          out_mime_type: string
          out_original_filename: string
          out_path: string
          out_size_bytes: number
        }[]
      }
      get_thumbnail_urls_for_entities: {
        Args: { p_entity_ids: string[]; p_entity_type: string }
        Returns: Json
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_completion_export: {
        Args: { p_user_ids: string[] }
        Returns: {
          assigned_at: string
          completed_at: string
          parent_path: string
          started_at: string
          status: string
          target_id: string
          target_name: string
          tier: string
          user_email: string
          user_full_name: string
          user_id: string
        }[]
      }
      get_user_learning_state: { Args: { p_user_id: string }; Returns: Json }
      get_user_notifications: {
        Args: { p_before?: string; p_filter?: string; p_limit?: number }
        Returns: Json
      }
      get_user_resources: { Args: { p_user_id?: string }; Returns: Json }
      grant_additional_free_attempts: {
        Args: {
          p_certification_id: string
          p_count: number
          p_instrument_id: string
          p_reason: string
        }
        Returns: Json
      }
      grant_certification: {
        Args: { p_certification_id: string; p_reason?: string }
        Returns: Json
      }
      grant_one_time_chat_credits: {
        Args: {
          p_amount: number
          p_source: string
          p_source_ref: string
          p_user: string
        }
        Returns: number
      }
      has_lms_permission: {
        Args: {
          p_capability: string
          p_trainee_user_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      has_required_demographics: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      impersonation_denylist_categories: {
        Args: never
        Returns: {
          category: string
          description: string
        }[]
      }
      import_newsletter_subscribers_bulk: {
        Args: { p_reason: string; p_subscribers: Json }
        Returns: Json
      }
      individual_feature_override_set: {
        Args: {
          p_enabled: boolean
          p_feature: string
          p_reason: string
          p_user: string
        }
        Returns: Json
      }
      invitation_create: {
        Args: {
          p_account_type?: string
          p_department_name?: string
          p_invitee_email: string
          p_org_level?: string
          p_organization_id: string
          p_supervisor_email?: string
        }
        Returns: {
          code: string
          expires_at: string
          invitation_id: string
        }[]
      }
      invitation_redeem: {
        Args: { p_invite_code: string; p_user_id: string }
        Returns: {
          account_type: string
          department_id: string
          department_name: string
          org_level: string
          organization_id: string
          user_id: string
        }[]
      }
      is_impersonating: { Args: never; Returns: boolean }
      is_impersonating_act: { Args: never; Returns: boolean }
      is_internal_user: { Args: { p_user_id: string }; Returns: boolean }
      list_active_newsletter_categories: { Args: never; Returns: Json }
      list_admin_newsletter_articles: {
        Args: {
          p_category_filter?: string
          p_gate_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status_filter?: string
        }
        Returns: Json
      }
      list_ai_authoring_session_documents: {
        Args: { p_content_item_id: string }
        Returns: {
          out_expires_at: string
          out_extracted_text_token_count: number
          out_file_name: string
          out_file_size_bytes: number
          out_id: string
          out_last_accessed_at: string
          out_mime_type: string
          out_uploaded_at: string
        }[]
      }
      list_all_learning_assignments: { Args: never; Returns: Json }
      list_article_versions: { Args: { p_article_id: string }; Returns: Json }
      list_articles_for_archive: {
        Args: { p_gate_filter?: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      list_audit_events: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: {
          action_category: string
          action_type: string
          actor_email: string
          actor_full_name: string
          actor_user_id: string
          created_at: string
          event_id: string
          has_before_after: boolean
          ip_address: unknown
          mode: string
          organization_id: string
          organization_name: string
          reason: string
          session_id: string
          target_email: string
          target_full_name: string
          target_user_id: string
          total_count: number
        }[]
      }
      list_available_learning: { Args: { p_user_id?: string }; Returns: Json }
      list_available_recommendations: {
        Args: never
        Returns: {
          out_already_tracked: boolean
          out_description: string
          out_epn_delta_narrative_id: string
          out_generated_at: string
          out_instrument_id: string
          out_intervention_type: string
          out_narrative_id: string
          out_participant_count: number
          out_priority: string
          out_ptp_delta_narrative_id: string
          out_rec_index: number
          out_slice_type: string
          out_slice_value: string
          out_source_kind: string
          out_target_dimensions: string[]
          out_time_horizon: string
          out_title: string
        }[]
      }
      list_eligible_mentors: {
        Args: never
        Returns: {
          out_account_type: string
          out_email: string
          out_full_name: string
          out_user_id: string
        }[]
      }
      list_feedback_templates: { Args: { p_panel_type: string }; Returns: Json }
      list_mentor_trainee_notes: {
        Args: { p_trainee_user_id: string }
        Returns: Json
      }
      list_mentor_trainees: { Args: never; Returns: Json }
      list_my_certifications: { Args: never; Returns: Json }
      list_newsletter_subscribers: {
        Args: { p_limit?: number; p_offset?: number; p_status_filter?: string }
        Returns: Json
      }
      list_org_interventions: {
        Args: {
          p_assigned_owner?: string
          p_instrument_id?: string
          p_show_cancelled?: boolean
          p_show_completed?: boolean
          p_status?: string[]
        }
        Returns: {
          out_actual_completion_date: string
          out_assigned_owner_user_id: string
          out_created_at: string
          out_days_until_target: number
          out_description: string
          out_epn_delta_narrative_id: string
          out_id: string
          out_instrument_id: string
          out_intervention_type: string
          out_last_updated_at: string
          out_last_updated_by: string
          out_manual_source_instrument_id: string
          out_narrative_id: string
          out_organization_id: string
          out_owner_email: string
          out_owner_full_name: string
          out_priority: string
          out_ptp_delta_narrative_id: string
          out_source_generated_at: string
          out_source_kind: string
          out_source_slice_type: string
          out_source_slice_value: string
          out_status: string
          out_target_completion_date: string
          out_target_dimensions: string[]
          out_time_horizon: string
          out_title: string
          out_tracking_notes: string
        }[]
      }
      list_public_published_articles: {
        Args: never
        Returns: {
          canonical_url: string
          excerpt: string
          published_at: string
          seo_description: string
          seo_title: string
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      list_scheduled_assignments: { Args: never; Returns: Json }
      list_user_audit_history: {
        Args: {
          p_categories?: string[]
          p_limit?: number
          p_offset?: number
          p_user_id: string
        }
        Returns: {
          action_type: string
          actor_account_type: string
          actor_email: string
          actor_name: string
          actor_user_id: string
          after_value: Json
          audit_id: string
          before_value: Json
          category: string
          created_at: string
          detail: Json
          reason: string
          total_count: number
        }[]
      }
      log_resource_access: { Args: { p_resource_id: string }; Returns: Json }
      log_super_admin_action: {
        Args: {
          p_action_type: string
          p_after?: Json
          p_before?: Json
          p_mode?: string
          p_reason?: string
          p_target_org_id: string
          p_target_user_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: Json }
      mark_archive_email_sent: {
        Args: { p_asset_ids: string[]; p_recipient: string; p_zip_path: string }
        Returns: Json
      }
      mark_live_event_attendance: {
        Args: {
          p_attendance_status: string
          p_content_item_id: string
          p_trainee_user_id: string
        }
        Returns: Json
      }
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: Json }
      mark_skills_practice_signoff: {
        Args: {
          p_content_item_id: string
          p_signoff_type: string
          p_trainee_user_id?: string
        }
        Returns: Json
      }
      maybe_mark_onboarding_complete: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      member_feature_override_set: {
        Args: { p_enabled: boolean; p_feature: string; p_user: string }
        Returns: undefined
      }
      mentor_review_submission: {
        Args: {
          p_comments?: string
          p_decision: string
          p_submission_id: string
        }
        Returns: Json
      }
      my_access_history: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          action_category: string
          action_type: string
          actor_email: string
          actor_full_name: string
          actor_user_id: string
          audit_source: string
          created_at: string
          event_id: string
          mode: string
          organization_id: string
          organization_name: string
          reason: string
          total_count: number
        }[]
      }
      my_direct_reports_with_pending_ratings: {
        Args: never
        Returns: {
          direct_report_department_name: string
          direct_report_email: string
          direct_report_full_name: string
          direct_report_org_level: string
          direct_report_user_id: string
          latest_self_assessment_id: string
          latest_self_completed_at: string
          latest_self_status: string
          paired_manager_assessment_id: string
          paired_manager_started_at: string
          paired_manager_status: string
          reminder_count: number
        }[]
      }
      my_pending_manager_assessments: {
        Args: never
        Returns: {
          last_reminder_sent_at: string
          manager_assessment_id: string
          manager_started_at: string
          manager_status: string
          paired_self_assessment_id: string
          reminder_count: number
          self_completed_at: string
          self_rater_department_name: string
          self_rater_email: string
          self_rater_full_name: string
          self_rater_user_id: string
        }[]
      }
      notification_display: {
        Args: { p_notification_type: string; p_payload: Json }
        Returns: {
          action_label: string
          action_url: string
          body: string
          title: string
        }[]
      }
      notify_user: {
        Args: {
          p_dedup_key?: string
          p_notification_type: string
          p_payload?: Json
          p_user_id: string
        }
        Returns: Json
      }
      ops_accept_estimate_by_token: { Args: { p_token: string }; Returns: Json }
      ops_add_comment: {
        Args: {
          p_body: string
          p_document_id: string
          p_document_type: string
          p_parent?: string
          p_visible_to_customer?: boolean
        }
        Returns: string
      }
      ops_add_contact: {
        Args: { p_customer_id: string; p_payload: Json }
        Returns: string
      }
      ops_apply_credit_note_to_invoice: {
        Args: { p_amount: number; p_credit_note: string; p_invoice: string }
        Returns: string
      }
      ops_apply_customer_credit_to_invoice: {
        Args: { p_amount: number; p_credit: string; p_invoice: string }
        Returns: string
      }
      ops_apply_late_fees: { Args: never; Returns: Json }
      ops_apply_retainer_to_invoice: {
        Args: { p_amount: number; p_invoice: string; p_retainer: string }
        Returns: string
      }
      ops_bulk_convert_leads: {
        Args: { p_lead_ids: string[]; p_options?: Json }
        Returns: Json
      }
      ops_clone_invoice: { Args: { p_id: string }; Returns: string }
      ops_convert_estimate_to_invoice: {
        Args: { p_estimate: string }
        Returns: string
      }
      ops_convert_estimate_to_project: {
        Args: { p_billing_method?: string; p_estimate: string; p_name?: string }
        Returns: string
      }
      ops_convert_estimate_to_retainer: {
        Args: { p_estimate: string }
        Returns: string
      }
      ops_convert_lead: {
        Args: { p_lead_id: string; p_options?: Json }
        Returns: Json
      }
      ops_create_credit_note: {
        Args: { p_header: Json; p_lines: Json }
        Returns: string
      }
      ops_create_customer_from_deal: {
        Args: { p_deal_id: string }
        Returns: string
      }
      ops_create_estimate: {
        Args: { p_header: Json; p_lines: Json }
        Returns: string
      }
      ops_create_invoice: {
        Args: { p_header: Json; p_lines: Json }
        Returns: string
      }
      ops_create_invoice_from_project: {
        Args: {
          p_date_from: string
          p_date_to: string
          p_detail?: string
          p_project: string
        }
        Returns: string
      }
      ops_create_invoice_from_selection: {
        Args: { p_customer: string; p_detail?: string; p_selection: Json }
        Returns: string
      }
      ops_create_retainer: { Args: { p_header: Json }; Returns: string }
      ops_crm_email_prepare: { Args: { p_payload: Json }; Returns: Json }
      ops_crm_email_record_sent: { Args: { p_payload: Json }; Returns: Json }
      ops_crm_email_record_tracking: {
        Args: {
          p_event_at: string
          p_event_type: string
          p_ip?: string
          p_link_url?: string
          p_resend_message_id: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      ops_customer_statement: {
        Args: {
          p_customer_id: string
          p_from?: string
          p_to?: string
          p_unpaid_only?: boolean
        }
        Returns: Json
      }
      ops_decline_estimate_by_token: {
        Args: { p_reason?: string; p_token: string }
        Returns: Json
      }
      ops_delete_contact: { Args: { p_id: string }; Returns: undefined }
      ops_delete_custom_field_definition: {
        Args: { p_id: string }
        Returns: undefined
      }
      ops_delete_draft_invoice: { Args: { p_id: string }; Returns: undefined }
      ops_delete_email_template: { Args: { p_id: string }; Returns: undefined }
      ops_delete_late_fee_rule: { Args: { p_id: string }; Returns: undefined }
      ops_delete_reminder_schedule: {
        Args: { p_id: string }
        Returns: undefined
      }
      ops_delete_tax_authority: { Args: { p_id: string }; Returns: undefined }
      ops_delete_tax_rate: { Args: { p_id: string }; Returns: undefined }
      ops_due_payment_reminders: { Args: never; Returns: Json }
      ops_entity_timeline: {
        Args: { p_entity_id: string; p_entity_type: string; p_limit?: number }
        Returns: Json
      }
      ops_flag_overdue_invoices: { Args: never; Returns: number }
      ops_get_estimate_send_bundle: {
        Args: { p_estimate: string }
        Returns: Json
      }
      ops_get_invoice_checkout_bundle: {
        Args: { p_invoice: string }
        Returns: Json
      }
      ops_get_invoice_checkout_bundle_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      ops_get_invoice_expense_receipts: {
        Args: { p_invoice: string }
        Returns: {
          receipt_storage_path: string
          suggested_filename: string
        }[]
      }
      ops_get_merge_tag_catalog: { Args: never; Returns: Json }
      ops_get_public_document_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      ops_get_refundable_payment: { Args: { p_payment: string }; Returns: Json }
      ops_handle_stripe_checkout_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_customer: string
          p_event_id: string
          p_event_type: string
          p_invoice: string
          p_mode: string
          p_org: string
          p_payload: Json
          p_payment_intent: string
          p_session: string
        }
        Returns: string
      }
      ops_handle_stripe_refund: {
        Args: {
          p_amount_refunded: number
          p_event_id: string
          p_event_type: string
          p_payload: Json
          p_payment_intent: string
        }
        Returns: string
      }
      ops_import_customers: {
        Args: { p_mode?: string; p_on_conflict?: string; p_rows: Json }
        Returns: Json
      }
      ops_import_items: {
        Args: { p_mode?: string; p_on_conflict?: string; p_rows: Json }
        Returns: Json
      }
      ops_list_activity: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: Json
      }
      ops_list_comments: {
        Args: { p_document_id: string; p_document_type: string }
        Returns: Json
      }
      ops_list_contacts: {
        Args: { p_customer_id: string }
        Returns: {
          created_at: string
          customer_id: string
          email: string
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          phone: string
          portal_access_enabled: boolean
          role: string
          salutation: string
          updated_at: string
        }[]
      }
      ops_list_currencies: { Args: never; Returns: Json }
      ops_list_custom_field_definitions: {
        Args: { p_entity_type?: string }
        Returns: Json
      }
      ops_list_email_templates: { Args: never; Returns: Json }
      ops_list_invoice_payments: { Args: { p_invoice: string }; Returns: Json }
      ops_list_late_fee_rules: { Args: never; Returns: Json }
      ops_list_numbering_schemes: { Args: never; Returns: Json }
      ops_list_reminder_schedules: { Args: never; Returns: Json }
      ops_list_salespeople: { Args: never; Returns: Json }
      ops_list_tax_authorities: { Args: never; Returns: Json }
      ops_list_tax_rates: { Args: never; Returns: Json }
      ops_mark_invoice_sent: {
        Args: { p_invoice: string; p_org: string }
        Returns: undefined
      }
      ops_mint_public_token: {
        Args: {
          p_document_id: string
          p_document_type: string
          p_expires_in_days?: number
          p_purpose: string
        }
        Returns: string
      }
      ops_record_payment: {
        Args: { p_invoice: string; p_payment: Json }
        Returns: string
      }
      ops_record_reminder_sent: {
        Args: {
          p_invoice: string
          p_reminder: string
          p_status?: string
          p_to_email: string
        }
        Returns: string
      }
      ops_refund_credit_note: {
        Args: { p_amount: number; p_id: string }
        Returns: string
      }
      ops_render_email_preview: {
        Args: { p_context?: Json; p_template_type: string }
        Returns: Json
      }
      ops_render_invoice_reminder: {
        Args: { p_invoice: string; p_template_type?: string }
        Returns: Json
      }
      ops_run_recurring_expenses: { Args: never; Returns: number }
      ops_run_recurring_invoices: { Args: never; Returns: number }
      ops_set_credit_note_status: {
        Args: { p_action: string; p_id: string }
        Returns: string
      }
      ops_set_custom_field_values: {
        Args: { p_entity_id: string; p_entity_type: string; p_values: Json }
        Returns: undefined
      }
      ops_set_document_salesperson: {
        Args: {
          p_document_id: string
          p_document_type: string
          p_salesperson: string
        }
        Returns: undefined
      }
      ops_set_estimate_status: {
        Args: { p_action: string; p_id: string }
        Returns: string
      }
      ops_set_invoice_status: {
        Args: { p_action: string; p_id: string }
        Returns: string
      }
      ops_set_retainer_status: {
        Args: { p_action: string; p_id: string }
        Returns: string
      }
      ops_set_user_commission_rate: {
        Args: { p_rate: number; p_user_id: string }
        Returns: undefined
      }
      ops_start_timer: {
        Args: {
          p_description?: string
          p_project: string
          p_project_task?: string
        }
        Returns: string
      }
      ops_stop_timer: { Args: { p_id?: string }; Returns: number }
      ops_update_contact: {
        Args: { p_id: string; p_payload: Json }
        Returns: undefined
      }
      ops_update_estimate: {
        Args: { p_header: Json; p_id: string; p_lines: Json }
        Returns: string
      }
      ops_update_invoice: {
        Args: { p_header: Json; p_id: string; p_lines: Json }
        Returns: string
      }
      ops_update_numbering_scheme: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_update_org_branding: { Args: { p_patch: Json }; Returns: undefined }
      ops_upsert_currency: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_upsert_custom_field_definition: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_upsert_email_template: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_upsert_late_fee_rule: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_upsert_reminder_schedule: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_upsert_stripe_customer: {
        Args: {
          p_customer: string
          p_org: string
          p_stripe_customer_id: string
        }
        Returns: undefined
      }
      ops_upsert_tax_authority: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_upsert_tax_rate: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      opt_in_to_newsletter: { Args: never; Returns: Json }
      opt_out_of_newsletter: { Args: never; Returns: Json }
      org_has_feature: {
        Args: { p_feature: string; p_org: string }
        Returns: boolean
      }
      org_set_mfa_required: {
        Args: { p_enabled: boolean; p_organization_id: string }
        Returns: Json
      }
      peer_access_request_create: {
        Args: { p_target_user_id: string }
        Returns: {
          out_action_token: string
          out_created_at: string
          out_expires_at: string
          out_request_id: string
          out_requester_full_name: string
          out_target_email: string
          out_target_full_name: string
          out_target_user_id: string
        }[]
      }
      peer_access_request_respond: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: {
          out_request_id: string
          out_responded_at: string
          out_status: string
        }[]
      }
      peer_ptp_request_granted: {
        Args: { p_owner_user_id: string; p_viewer_user_id: string }
        Returns: boolean
      }
      peer_ptp_visible: {
        Args: { p_owner_user_id: string; p_viewer_user_id: string }
        Returns: boolean
      }
      platform_feature_set: {
        Args: { p_enabled: boolean; p_feature: string; p_reason: string }
        Returns: Json
      }
      preview_article_as_viewer_class: {
        Args: { p_article_id: string; p_viewer_class: string }
        Returns: Json
      }
      process_due_scheduled_articles: { Args: never; Returns: Json }
      process_due_scheduled_assignments: { Args: never; Returns: Json }
      promote_to_library: {
        Args: {
          p_asset_id: string
          p_library_name: string
          p_library_tags: string[]
          p_reason: string
        }
        Returns: Json
      }
      prune_newsletter_draft_versions: { Args: never; Returns: Json }
      prune_newsletter_subscribe_attempts: { Args: never; Returns: Json }
      pseudonymize_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: number
      }
      publish_article: {
        Args: { p_article_id: string; p_reason: string }
        Returns: Json
      }
      reap_pending_uploads: { Args: never; Returns: Json }
      reconcile_supervisors_for_org: {
        Args: { p_organization_id: string }
        Returns: {
          out_patched_user_ids: string[]
          out_users_patched: number
        }[]
      }
      reconcile_supervisors_for_user: {
        Args: { p_new_user_id: string }
        Returns: number
      }
      record_video_progress: {
        Args: {
          p_content_item_id: string
          p_last_position_seconds?: number
          p_watch_pct: number
        }
        Returns: Json
      }
      reorder_content_items: {
        Args: { p_module_id: string; p_ordered_ids: string[]; p_reason: string }
        Returns: Json
      }
      reorder_quiz_questions: {
        Args: {
          p_content_item_id: string
          p_ordered_ids: string[]
          p_reason: string
        }
        Returns: Json
      }
      replace_asset: {
        Args: {
          p_new_asset_id: string
          p_old_asset_id: string
          p_reason: string
        }
        Returns: Json
      }
      replace_lesson_blocks: {
        Args: { p_blocks: Json; p_content_item_id: string; p_reason: string }
        Returns: Json
      }
      request_asset_upload: {
        Args: {
          p_asset_kind: string
          p_certification_path_id?: string
          p_content_item_id?: string
          p_curriculum_id?: string
          p_is_library_asset?: boolean
          p_lesson_block_id?: string
          p_library_name?: string
          p_library_tags?: string[]
          p_mime_type: string
          p_module_id?: string
          p_newsletter_article_id?: string
          p_original_filename: string
          p_reason: string
          p_ref_field?: string
          p_resource_id?: string
          p_size_bytes: number
          p_user_id?: string
        }
        Returns: Json
      }
      request_new_asset_version: {
        Args: {
          p_asset_id: string
          p_mime_type: string
          p_original_filename: string
          p_reason: string
          p_size_bytes: number
        }
        Returns: Json
      }
      request_skills_revision: {
        Args: {
          p_content_item_id: string
          p_revision_comment: string
          p_trainee_user_id: string
        }
        Returns: Json
      }
      restore_article_version: {
        Args: { p_reason: string; p_version_id: string }
        Returns: Json
      }
      revoke_certification: {
        Args: { p_certification_id: string; p_reason: string }
        Returns: Json
      }
      run_asset_hard_delete: { Args: never; Returns: Json }
      save_lesson_block_draft: {
        Args: { p_content_item_id: string; p_draft_json: Json }
        Returns: Json
      }
      save_org_intervention: {
        Args: {
          p_description: string
          p_epn_delta_narrative_id?: string
          p_instrument_id: string
          p_intervention_type?: string
          p_narrative_id: string
          p_priority?: string
          p_ptp_delta_narrative_id?: string
          p_status?: string
          p_target_dimensions: string[]
          p_time_horizon?: string
          p_title: string
          p_tracking_notes?: string
        }
        Returns: string
      }
      save_skills_trainee_input: {
        Args: { p_content_item_id: string; p_text: string }
        Returns: Json
      }
      schedule_article: {
        Args: { p_article_id: string; p_publish_at: string; p_reason: string }
        Returns: Json
      }
      search_impersonation_targets: {
        Args: {
          p_account_status_in?: string[]
          p_account_types?: string[]
          p_certification_statuses?: string[]
          p_created_within?: string
          p_has_active_assignments?: boolean
          p_has_supervisor?: boolean
          p_is_mentor?: boolean
          p_last_active_within?: string
          p_limit?: number
          p_offset?: number
          p_organization_ids?: string[]
          p_query: string
          p_sort_column?: string
          p_sort_direction?: string
          p_specific_user_id?: string
        }
        Returns: {
          account_status: string
          account_type: string
          active_assignment_count: number
          certification_count: number
          email: string
          full_name: string
          is_mentor: boolean
          last_sign_in_at: string
          organization_id: string
          organization_name: string
          show_coach_tab: boolean
          total_count: number
          user_id: string
          worst_certification_status: string
        }[]
      }
      seat_count_available: { Args: { p_org: string }; Returns: number }
      seat_count_used: { Args: { p_org: string }; Returns: number }
      self_enroll_in_certification_path: {
        Args: { p_certification_path_id: string }
        Returns: Json
      }
      self_enroll_in_curriculum: {
        Args: { p_curriculum_id: string }
        Returns: Json
      }
      self_enroll_in_module: { Args: { p_module_id: string }; Returns: Json }
      send_coach_invitation_email: {
        Args: {
          p_email_type?: string
          p_html: string
          p_subject: string
          p_to: string
        }
        Returns: Json
      }
      send_grace_period_reminders: {
        Args: never
        Returns: {
          reminders_logged: number
          run_at: string
        }[]
      }
      set_content_item_completion: {
        Args: {
          p_complete: boolean
          p_content_item_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      set_content_item_completion_bulk: {
        Args: {
          p_complete: boolean
          p_content_item_id: string
          p_reason: string
          p_user_ids: string[]
        }
        Returns: Json
      }
      set_curriculum_completion: {
        Args: { p_assignment_id: string; p_complete: boolean; p_reason: string }
        Returns: Json
      }
      set_curriculum_completion_bulk: {
        Args: {
          p_complete: boolean
          p_curriculum_id: string
          p_reason: string
          p_user_ids: string[]
        }
        Returns: Json
      }
      set_mentor_role: {
        Args: { p_is_mentor: boolean; p_reason: string; p_user_id: string }
        Returns: Json
      }
      set_module_completion: {
        Args: {
          p_complete: boolean
          p_module_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      set_module_completion_bulk: {
        Args: {
          p_complete: boolean
          p_module_id: string
          p_reason: string
          p_user_ids: string[]
        }
        Returns: Json
      }
      set_notification_preference: {
        Args: { p_channel: string; p_notification_type: string }
        Returns: Json
      }
      set_resource_access_grants: {
        Args: { p_grants: Json; p_reason: string; p_resource_id: string }
        Returns: Json
      }
      set_skills_practice_attachment: {
        Args: {
          p_content_item_id: string
          p_role: string
          p_storage_path: string
          p_trainee_user_id?: string
        }
        Returns: Json
      }
      set_user_avatar: {
        Args: { p_asset_id: string; p_reason: string; p_user_id: string }
        Returns: Json
      }
      sharing_preferences_upsert: {
        Args: {
          p_share_ptp_with_company_admin?: boolean
          p_share_ptp_with_direct_reports?: boolean
          p_share_ptp_with_organization?: boolean
          p_share_ptp_with_supervisor?: boolean
          p_share_ptp_with_team?: boolean
        }
        Returns: {
          out_share_ptp_with_company_admin: boolean
          out_share_ptp_with_direct_reports: boolean
          out_share_ptp_with_organization: boolean
          out_share_ptp_with_supervisor: boolean
          out_share_ptp_with_team: boolean
          out_updated_at: string
          out_user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_assessment: {
        Args: {
          p_acknowledgment_version_hash?: string
          p_context_type?: string
          p_instrument_id: string
          p_preexisting_assessment_id?: string
          p_rater_type?: string
        }
        Returns: Json
      }
      start_epn_assessment: {
        Args: {
          p_acknowledgment_version_hash?: string
          p_assignment_id: string
        }
        Returns: string
      }
      start_lesson_reattempt: {
        Args: { p_content_item_id: string }
        Returns: Json
      }
      submit_file_upload: {
        Args: {
          p_content_item_id: string
          p_file_url: string
          p_filename: string
          p_size_bytes: number
        }
        Returns: Json
      }
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_content_item_id: string }
        Returns: Json
      }
      submit_written_summary: {
        Args: { p_content: string; p_content_item_id: string }
        Returns: Json
      }
      subscribe_to_newsletter: {
        Args: { p_email: string; p_source?: string; p_turnstile_token: string }
        Returns: Json
      }
      super_admin_list_orgs_with_usage: {
        Args: never
        Returns: {
          id: string
          name: string
          seat_count: number
          seats_used: number
          status: string
        }[]
      }
      supervisor_dashboard_set: {
        Args: { p_enabled: boolean; p_org: string }
        Returns: undefined
      }
      sweep_expired_deactivations: {
        Args: never
        Returns: {
          run_at: string
          users_logged: number
          users_pseudonymized: number
        }[]
      }
      unassign_curriculum: {
        Args: { p_assignment_id: string; p_reason: string }
        Returns: Json
      }
      unassign_curriculum_bulk: {
        Args: { p_assignment_ids: string[]; p_reason: string }
        Returns: Json
      }
      unassign_mentor: {
        Args: {
          p_assignment_id: string
          p_end_reason: string
          p_reason: string
        }
        Returns: Json
      }
      unassign_mentor_bulk: {
        Args: {
          p_assignment_ids: string[]
          p_end_reason: string
          p_reason: string
        }
        Returns: Json
      }
      unassign_module: {
        Args: { p_assignment_id: string; p_reason: string }
        Returns: Json
      }
      unassign_module_bulk: {
        Args: { p_assignment_ids: string[]; p_reason: string }
        Returns: Json
      }
      unpublish_article: {
        Args: { p_article_id: string; p_reason: string }
        Returns: Json
      }
      unsubscribe_from_newsletter: { Args: { p_token: string }; Returns: Json }
      update_chat_session: {
        Args: {
          p_message_count: number
          p_messages: Json
          p_session_id: string
        }
        Returns: undefined
      }
      update_newsletter_category: {
        Args: {
          p_display_name: string
          p_id: string
          p_reason: string
          p_slug: string
          p_sort_order: number
        }
        Returns: Json
      }
      update_org_intervention: {
        Args: {
          p_actual_completion_date?: string
          p_assigned_owner_user_id?: string
          p_clear_actual_date?: boolean
          p_clear_notes?: boolean
          p_clear_owner?: boolean
          p_clear_target_date?: boolean
          p_intervention_id: string
          p_status?: string
          p_target_completion_date?: string
          p_tracking_notes?: string
        }
        Returns: Json
      }
      update_poll: {
        Args: {
          p_is_locked: boolean
          p_options: Json
          p_poll_id: string
          p_question: string
          p_reason: string
          p_style: string
          p_votes_visible: boolean
        }
        Returns: Json
      }
      update_user_bio: {
        Args: { p_bio: string; p_reason: string; p_user_id: string }
        Returns: Json
      }
      upsert_ai_authoring_conversation: {
        Args: {
          p_attached_document_ids: string[]
          p_content_item_id: string
          p_custom_voice_example: string
          p_custom_voice_guidance: string
          p_full_content_state: Json
          p_length_preference?: string
          p_messages: Json
          p_mode: string
          p_outline_state: Json
          p_stage: string
          p_voice_preset_key: string
        }
        Returns: {
          out_id: string
          out_updated_at: string
        }[]
      }
      upsert_article: {
        Args: {
          p_allowed_plan_tiers: string[]
          p_article_id: string
          p_author_user_ids: string[]
          p_body_tiptap: Json
          p_canonical_url: string
          p_category_id: string
          p_cover_asset_id: string
          p_default_layout_width: string
          p_excerpt: string
          p_eyebrow_text: string
          p_gate: string
          p_is_issue_based: boolean
          p_issue_label: string
          p_masthead_logo_glyph: string
          p_masthead_publication: string
          p_og_image_asset_id: string
          p_read_time_minutes: number
          p_reason: string
          p_seo_description: string
          p_seo_title: string
          p_slug: string
          p_source_type: string
          p_tags: string[]
          p_theme_variant: string
          p_title: string
          p_word_count: number
        }
        Returns: Json
      }
      upsert_certification_path: {
        Args: {
          p_cert_dimension_ids?: Json
          p_cert_instrument_ids: Json
          p_certification_type: string
          p_delivery_mode: string
          p_description: string
          p_display_order: number
          p_id: string
          p_is_published: boolean
          p_is_self_enrollable?: boolean
          p_name: string
          p_prerequisite_path_id: string
          p_reason: string
          p_self_enroll_currency?: string
          p_self_enroll_price_cents?: number
          p_slug: string
          p_thumbnail_asset_id?: string
        }
        Returns: Json
      }
      upsert_content_item: {
        Args: {
          p_description: string
          p_display_order: number
          p_id: string
          p_is_required: boolean
          p_item_type: string
          p_lesson_completion_mode: string
          p_module_id: string
          p_reason: string
          p_thumbnail_asset_id?: string
          p_title: string
          p_type_config: Json
        }
        Returns: Json
      }
      upsert_curriculum: {
        Args: {
          p_attachment_display_order: number
          p_attachment_is_required: boolean
          p_audience_tags: string[]
          p_certification_path_id: string
          p_description: string
          p_estimated_minutes: number
          p_id: string
          p_is_published: boolean
          p_is_self_enrollable?: boolean
          p_mode: string
          p_name: string
          p_prerequisite_curriculum_id: string
          p_reason: string
          p_self_enroll_currency?: string
          p_self_enroll_price_cents?: number
          p_slug: string
          p_thumbnail_asset_id?: string
        }
        Returns: Json
      }
      upsert_feedback_template: {
        Args: {
          p_id: string
          p_name: string
          p_panel_type: string
          p_text: string
        }
        Returns: Json
      }
      upsert_lesson_block_progress: {
        Args: { p_block_id: string; p_completion_data?: Json; p_status: string }
        Returns: Json
      }
      upsert_lesson_progress: {
        Args: {
          p_content_item_id: string
          p_furthest_continue_client_id?: string
          p_last_block_id?: string
        }
        Returns: Json
      }
      upsert_mentor_trainee_note: {
        Args: { p_assignment_id: string; p_id: string; p_note_text: string }
        Returns: Json
      }
      upsert_module: {
        Args: {
          p_attachment_display_order: number
          p_attachment_is_required: boolean
          p_audience_tags: string[]
          p_curriculum_id: string
          p_description: string
          p_estimated_minutes: number
          p_id: string
          p_is_published: boolean
          p_is_self_enrollable?: boolean
          p_name: string
          p_prerequisite_module_id: string
          p_reason: string
          p_self_enroll_currency?: string
          p_self_enroll_price_cents?: number
          p_slug: string
          p_thumbnail_asset_id?: string
        }
        Returns: Json
      }
      upsert_quiz_answer_option: {
        Args: {
          p_display_order: number
          p_id: string
          p_is_correct: boolean
          p_match_pair_key: string
          p_option_image_url: string
          p_option_text: string
          p_question_id: string
          p_reason: string
        }
        Returns: Json
      }
      upsert_quiz_question: {
        Args: {
          p_content_item_id: string
          p_display_order: number
          p_explanation: string
          p_id: string
          p_points: number
          p_question_image_url: string
          p_question_text: string
          p_question_type: string
          p_reason: string
        }
        Returns: Json
      }
      upsert_resource: {
        Args: {
          p_content_asset_id?: string
          p_content_type: string
          p_id: string
          p_is_published: boolean
          p_reason: string
          p_resource_tab_id: string
          p_summary: string
          p_thumbnail_asset_id?: string
          p_title: string
          p_url_kind?: string
          p_url_or_content: string
        }
        Returns: Json
      }
      user_assign_supervisor: {
        Args: { p_supervisor_user_id: string; p_target_user_id: string }
        Returns: {
          out_supervisor_user_id: string
          out_target_user_id: string
          out_updated_at: string
        }[]
      }
      user_deactivate: {
        Args: { p_reason?: string; p_target_user_id: string }
        Returns: {
          out_deactivated_at: string
          out_reactivation_deadline: string
          out_user_id: string
        }[]
      }
      user_effective_allowances: {
        Args: { p_user?: string }
        Returns: {
          ai_chat_enabled: boolean
          chat_allowance_per_user: number
          chat_remaining: number
          chat_used_this_month: number
        }[]
      }
      user_has_feature: {
        Args: { p_feature: string; p_user: string }
        Returns: boolean
      }
      user_has_features_bulk: {
        Args: { p_features: string[]; p_user: string }
        Returns: {
          enabled: boolean
          feature: string
        }[]
      }
      user_reactivate: {
        Args: { p_target_user_id: string }
        Returns: {
          out_reactivated_at: string
          out_user_id: string
        }[]
      }
      user_resource_audiences: { Args: { p_user: string }; Returns: string[] }
      validate_impersonation_session: {
        Args: { p_session_id: string }
        Returns: {
          ended_at: string
          expires_at: string
          is_valid: boolean
          mode: string
          reason: string
          super_admin_user_id: string
          target_user_id: string
        }[]
      }
      vote_on_poll: {
        Args: { p_option_id: string; p_poll_id: string }
        Returns: Json
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
