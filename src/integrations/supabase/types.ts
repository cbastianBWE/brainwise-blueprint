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
      assessment_purchases: {
        Row: {
          amount_paid: number
          consumed_at: string | null
          consumed_by_assessment_id: string | null
          id: string
          instrument_id: string
          purchased_at: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          consumed_at?: string | null
          consumed_by_assessment_id?: string | null
          id?: string
          instrument_id: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          consumed_at?: string | null
          consumed_by_assessment_id?: string | null
          id?: string
          instrument_id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_purchases_consumed_by_assessment_id_fkey"
            columns: ["consumed_by_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
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
          id: string
          instrument_id: string | null
          instrument_version: string | null
          manager_dimension_scores: Json | null
          overall_profile: Json | null
          self_manager_divergence: Json | null
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
          id?: string
          instrument_id?: string | null
          instrument_version?: string | null
          manager_dimension_scores?: Json | null
          overall_profile?: Json | null
          self_manager_divergence?: Json | null
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
          id?: string
          instrument_id?: string | null
          instrument_version?: string | null
          manager_dimension_scores?: Json | null
          overall_profile?: Json | null
          self_manager_divergence?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
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
          id: string
          instrument_id: string
          instrument_version: string
          ordered_by_coach_id: string | null
          rater_type: string
          started_at: string
          status: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context_type?: string | null
          id?: string
          instrument_id: string
          instrument_version: string
          ordered_by_coach_id?: string | null
          rater_type?: string
          started_at?: string
          status?: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context_type?: string | null
          id?: string
          instrument_id?: string
          instrument_version?: string
          ordered_by_coach_id?: string | null
          rater_type?: string
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
          actor_type: string
          certification_id: string
          coach_user_id: string
          completed_at: string | null
          created_at: string
          id: string
          instrument_id: string
          status: string
        }
        Insert: {
          access_code?: string
          actor_email: string
          actor_first_name?: string | null
          actor_type: string
          certification_id: string
          coach_user_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instrument_id: string
          status?: string
        }
        Update: {
          access_code?: string
          actor_email?: string
          actor_first_name?: string | null
          actor_type?: string
          certification_id?: string
          coach_user_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instrument_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_certification_actors_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "coach_certifications"
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
          id: string
          notes: string | null
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
          id?: string
          notes?: string | null
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
          id?: string
          notes?: string | null
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
          assessment_id: string | null
          client_email: string
          client_user_id: string | null
          coach_notes: string | null
          coach_user_id: string
          coupon_amount: number | null
          coupon_expires_at: string | null
          coupon_redeemed: boolean
          created_at: string
          debrief_completed: boolean
          id: string
          instrument_id: string | null
          invitation_status: string
          results_released: boolean
          stripe_coupon_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          client_email: string
          client_user_id?: string | null
          coach_notes?: string | null
          coach_user_id: string
          coupon_amount?: number | null
          coupon_expires_at?: string | null
          coupon_redeemed?: boolean
          created_at?: string
          debrief_completed?: boolean
          id?: string
          instrument_id?: string | null
          invitation_status?: string
          results_released?: boolean
          stripe_coupon_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          client_email?: string
          client_user_id?: string | null
          coach_notes?: string | null
          coach_user_id?: string
          coupon_amount?: number | null
          coupon_expires_at?: string | null
          coupon_redeemed?: boolean
          created_at?: string
          debrief_completed?: boolean
          id?: string
          instrument_id?: string | null
          invitation_status?: string
          results_released?: boolean
          stripe_coupon_id?: string | null
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
        ]
      }
      coach_invitations: {
        Row: {
          accepted_at: string | null
          certification_type: string
          created_at: string
          email: string
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
      company_admin_audit_log: {
        Row: {
          action_details: Json | null
          action_type: string
          actor_role: string
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          organization_id: string
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
          created_at?: string
          id?: string
          ip_address?: unknown
          organization_id: string
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
          created_at?: string
          id?: string
          ip_address?: unknown
          organization_id?: string
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
      corporate_contracts_legacy: {
        Row: {
          ai_chat_enabled: boolean
          ai_monthly_message_allowance: number | null
          ai_report_regeneration_allowance: number | null
          contract_end_date: string
          contract_notes: string | null
          contract_start_date: string
          created_at: string
          created_by_user_id: string | null
          data_retention_mode: string
          id: string
          license_count: number
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_chat_enabled?: boolean
          ai_monthly_message_allowance?: number | null
          ai_report_regeneration_allowance?: number | null
          contract_end_date: string
          contract_notes?: string | null
          contract_start_date: string
          created_at?: string
          created_by_user_id?: string | null
          data_retention_mode?: string
          id?: string
          license_count: number
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_chat_enabled?: boolean
          ai_monthly_message_allowance?: number | null
          ai_report_regeneration_allowance?: number | null
          contract_end_date?: string
          contract_notes?: string | null
          contract_start_date?: string
          created_at?: string
          created_by_user_id?: string | null
          data_retention_mode?: string
          id?: string
          license_count?: number
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_contracts_legacy_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_legacy_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "corporate_contracts_legacy_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_legacy_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_contracts_legacy_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          name: string
          primary_contact_email: string | null
          seat_count: number
          seats_used: number
          status: string
          subscription_status: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name: string
          primary_contact_email?: string | null
          seat_count?: number
          seats_used?: number
          status?: string
          subscription_status?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name?: string
          primary_contact_email?: string | null
          seat_count?: number
          seats_used?: number
          status?: string
          subscription_status?: string | null
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
      resources: {
        Row: {
          access_tier: string
          content_type: string | null
          id: string
          published_at: string
          subscale_tags: string[] | null
          title: string
          url_or_content: string | null
        }
        Insert: {
          access_tier?: string
          content_type?: string | null
          id?: string
          published_at?: string
          subscale_tags?: string[] | null
          title: string
          url_or_content?: string | null
        }
        Update: {
          access_tier?: string
          content_type?: string | null
          id?: string
          published_at?: string
          subscale_tags?: string[] | null
          title?: string
          url_or_content?: string | null
        }
        Relationships: []
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
      super_admin_audit_log: {
        Row: {
          action_type: string
          affected_user_id: string | null
          company_id: string | null
          created_at: string
          detail: Json | null
          id: string
          session_id: string
          super_admin_user_id: string
        }
        Insert: {
          action_type: string
          affected_user_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          session_id: string
          super_admin_user_id: string
        }
        Update: {
          action_type?: string
          affected_user_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          session_id?: string
          super_admin_user_id?: string
        }
        Relationships: [
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
      users: {
        Row: {
          account_status: string
          account_type: string | null
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
          notifications: Json | null
          onboarding_instrument_version: string | null
          org_level: string | null
          organization_id: string | null
          reactivation_deadline: string | null
          share_results_with_coach: boolean
          stripe_coupon_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_tier: string
          supervisor_user_id: string | null
          timezone: string | null
        }
        Insert: {
          account_status?: string
          account_type?: string | null
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
          notifications?: Json | null
          onboarding_instrument_version?: string | null
          org_level?: string | null
          organization_id?: string | null
          reactivation_deadline?: string | null
          share_results_with_coach?: boolean
          stripe_coupon_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          supervisor_user_id?: string | null
          timezone?: string | null
        }
        Update: {
          account_status?: string
          account_type?: string | null
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
          notifications?: Json | null
          onboarding_instrument_version?: string | null
          org_level?: string | null
          organization_id?: string | null
          reactivation_deadline?: string | null
          share_results_with_coach?: boolean
          stripe_coupon_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          supervisor_user_id?: string | null
          timezone?: string | null
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
          client_user_id: string | null
          coach_user_id: string | null
          created_at: string | null
          id: string | null
          invitation_status: string | null
        }
        Insert: {
          assessment_id?: string | null
          client_email?: string | null
          client_user_id?: string | null
          coach_user_id?: string | null
          created_at?: string | null
          id?: string | null
          invitation_status?: string | null
        }
        Update: {
          assessment_id?: string | null
          client_email?: string | null
          client_user_id?: string | null
          coach_user_id?: string | null
          created_at?: string | null
          id?: string | null
          invitation_status?: string | null
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
      airsa_role_access: {
        Args: { p_owner_user_id: string; p_viewer_user_id: string }
        Returns: boolean
      }
      assert_super_admin: { Args: never; Returns: undefined }
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
      close_chat_session: { Args: { p_session_id: string }; Returns: undefined }
      consume_assessment_purchase: {
        Args: {
          p_assessment_id: string
          p_instrument_short_name: string
          p_user_id: string
        }
        Returns: string
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
      current_user_account_type: { Args: never; Returns: string }
      current_user_department_id: { Args: never; Returns: string }
      current_user_org_id: { Args: never; Returns: string }
      current_user_supervisor_id: { Args: never; Returns: string }
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
      generate_invitation_code: { Args: never; Returns: string }
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
      has_required_demographics: {
        Args: { p_user_id: string }
        Returns: boolean
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
      org_has_feature: {
        Args: { p_feature: string; p_org: string }
        Returns: boolean
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
      seat_count_available: { Args: { p_org: string }; Returns: number }
      seat_count_used: { Args: { p_org: string }; Returns: number }
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
      sweep_expired_deactivations: {
        Args: never
        Returns: {
          run_at: string
          users_logged: number
        }[]
      }
      update_chat_session: {
        Args: {
          p_message_count: number
          p_messages: Json
          p_session_id: string
        }
        Returns: undefined
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
      user_has_feature: {
        Args: { p_feature: string; p_user: string }
        Returns: boolean
      }
      user_reactivate: {
        Args: { p_target_user_id: string }
        Returns: {
          out_reactivated_at: string
          out_user_id: string
        }[]
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
