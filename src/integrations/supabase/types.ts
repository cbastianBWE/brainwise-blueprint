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
      account_activation_links: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by: string | null
          last_used_at: string | null
          purpose: string
          revoked_at: string | null
          token: string
          use_count: number
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          last_used_at?: string | null
          purpose?: string
          revoked_at?: string | null
          token?: string
          use_count?: number
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          last_used_at?: string | null
          purpose?: string
          revoked_at?: string | null
          token?: string
          use_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_activation_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_activation_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "account_activation_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_activation_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_activation_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_activation_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_activation_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "account_activation_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_activation_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_activation_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_digest_runs: {
        Row: {
          dispatched: boolean
          id: number
          sent_at: string
          subject: string | null
          summary: Json
          window_end: string
          window_start: string
        }
        Insert: {
          dispatched?: boolean
          id?: number
          sent_at?: string
          subject?: string | null
          summary?: Json
          window_end: string
          window_start: string
        }
        Update: {
          dispatched?: boolean
          id?: number
          sent_at?: string
          subject?: string | null
          summary?: Json
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      ai_image_generations: {
        Row: {
          asset_id: string | null
          created_at: string
          error_reason: string | null
          id: string
          model_id: string
          parent_id: string
          parent_kind: string
          prompt: string
          quality: string | null
          ref_field: string
          requested_by: string
          size: string | null
          status: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          model_id: string
          parent_id: string
          parent_kind: string
          prompt: string
          quality?: string | null
          ref_field: string
          requested_by: string
          size?: string | null
          status?: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          model_id?: string
          parent_id?: string
          parent_kind?: string
          prompt?: string
          quality?: string | null
          ref_field?: string
          requested_by?: string
          size?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_image_generations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "ai_image_generations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_registry: {
        Row: {
          model_id: string
          notes: string | null
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          model_id: string
          notes?: string | null
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          model_id?: string
          notes?: string | null
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          model_id: string | null
          model_role: string | null
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
          model_id?: string | null
          model_role?: string | null
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
          model_id?: string | null
          model_role?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "airsa_skills_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions_public"
            referencedColumns: ["dimension_id"]
          },
        ]
      }
      api_clients: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string | null
          rate_limit_per_min: number
          revoked_at: string | null
          scopes: string[]
          total_requests: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id?: string | null
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          total_requests?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string | null
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          total_requests?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "api_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_log: {
        Row: {
          api_client_id: string | null
          duration_ms: number | null
          id: number
          ip: string | null
          method: string | null
          occurred_at: string
          path: string | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_client_id?: string | null
          duration_ms?: number | null
          id?: number
          ip?: string | null
          method?: string | null
          occurred_at?: string
          path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_client_id?: string | null
          duration_ms?: number | null
          id?: number
          ip?: string | null
          method?: string | null
          occurred_at?: string
          path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_api_client_id_fkey"
            columns: ["api_client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "assessment_responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_presentation"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      bdo_break_bank: {
        Row: {
          body: string
          created_at: string
          driving_force: string | null
          energy_context: string
          facet_hint: string | null
          id: string
          is_active: boolean
          max_minutes: number
          min_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          driving_force?: string | null
          energy_context?: string
          facet_hint?: string | null
          id?: string
          is_active?: boolean
          max_minutes?: number
          min_minutes?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          driving_force?: string | null
          energy_context?: string
          facet_hint?: string | null
          id?: string
          is_active?: boolean
          max_minutes?: number
          min_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bdo_day_plan_shares: {
        Row: {
          granted_at: string
          id: string
          mode: string
          owner_user_id: string
          revoked_at: string | null
          viewer_user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          mode?: string
          owner_user_id: string
          revoked_at?: string | null
          viewer_user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          mode?: string
          owner_user_id?: string
          revoked_at?: string | null
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bdo_day_plan_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bdo_day_plan_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bdo_day_plans: {
        Row: {
          completed_at: string | null
          created_at: string
          exchange_budget: number
          exchanges_spent: number
          form: Json
          generations_used: number
          id: string
          plan: Json | null
          plan_date: string
          reshape_allowance: number
          reshapes_used: number
          status: string
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exchange_budget?: number
          exchanges_spent?: number
          form?: Json
          generations_used?: number
          id?: string
          plan?: Json | null
          plan_date: string
          reshape_allowance?: number
          reshapes_used?: number
          status?: string
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exchange_budget?: number
          exchanges_spent?: number
          form?: Json
          generations_used?: number
          id?: string
          plan?: Json | null
          plan_date?: string
          reshape_allowance?: number
          reshapes_used?: number
          status?: string
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bdo_day_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_day_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "bdo_day_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_day_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bdo_day_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bdo_definition: {
        Row: {
          created_at: string
          form_spec: Json
          id: string
          interview_prompt: string
          interview_seed: Json
          is_active: boolean
          notes: string | null
          plan_prompt: string
          probe_rules: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          form_spec: Json
          id?: string
          interview_prompt: string
          interview_seed: Json
          is_active?: boolean
          notes?: string | null
          plan_prompt: string
          probe_rules?: Json
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          form_spec?: Json
          id?: string
          interview_prompt?: string
          interview_seed?: Json
          is_active?: boolean
          notes?: string | null
          plan_prompt?: string
          probe_rules?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      bdo_plan_items: {
        Row: {
          completed_at: string | null
          created_at: string
          day_plan_id: string
          first_seen_date: string
          id: string
          move_count: number
          notes: string | null
          origin: string
          position: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_plan_id: string
          first_seen_date: string
          id?: string
          move_count?: number
          notes?: string | null
          origin?: string
          position?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_plan_id?: string
          first_seen_date?: string
          id?: string
          move_count?: number
          notes?: string | null
          origin?: string
          position?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bdo_plan_items_day_plan_id_fkey"
            columns: ["day_plan_id"]
            isOneToOne: false
            referencedRelation: "bdo_day_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "bdo_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bdo_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bdo_plan_items_user_id_fkey"
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
          reason: string | null
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
          reason?: string | null
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
          reason?: string | null
          role?: string
          source?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bw_house_style_terms: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          note: string | null
          pattern: string
          replacement: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          note?: string | null
          pattern: string
          replacement: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          note?: string | null
          pattern?: string
          replacement?: string
        }
        Relationships: []
      }
      bw_prompt_ab_snapshot: {
        Row: {
          arm: string
          id: number
          owner_id: string
          payload: Json | null
          section_type: string
          source_table: string
          taken_at: string
        }
        Insert: {
          arm: string
          id?: number
          owner_id: string
          payload?: Json | null
          section_type: string
          source_table: string
          taken_at?: string
        }
        Update: {
          arm?: string
          id?: number
          owner_id?: string
          payload?: Json | null
          section_type?: string
          source_table?: string
          taken_at?: string
        }
        Relationships: []
      }
      bw_walkthrough_config: {
        Row: {
          free_exchange_budget: number
          id: boolean
          updated_at: string
        }
        Insert: {
          free_exchange_budget?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          free_exchange_budget?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bw_walkthrough_definition: {
        Row: {
          created_at: string
          is_active: boolean
          notes: string | null
          steps: Json
          system_prompt: string
          version: number
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          notes?: string | null
          steps: Json
          system_prompt: string
          version: number
        }
        Update: {
          created_at?: string
          is_active?: boolean
          notes?: string | null
          steps?: Json
          system_prompt?: string
          version?: number
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      chat_session_documents: {
        Row: {
          chat_session_id: string | null
          created_at: string
          extracted_text: string
          extracted_text_token_count: number
          file_name: string
          file_size_bytes: number
          id: string
          mime_type: string
          user_id: string
          was_truncated: boolean
        }
        Insert: {
          chat_session_id?: string | null
          created_at?: string
          extracted_text: string
          extracted_text_token_count: number
          file_name: string
          file_size_bytes: number
          id?: string
          mime_type: string
          user_id: string
          was_truncated?: boolean
        }
        Update: {
          chat_session_id?: string | null
          created_at?: string
          extracted_text?: string
          extracted_text_token_count?: number
          file_name?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          user_id?: string
          was_truncated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chat_session_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_session_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "chat_session_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_session_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_session_documents_user_id_fkey"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      client_disclosure_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
          version_hash: string
          version_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
          version_hash: string
          version_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
          version_hash?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_disclosure_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_disclosure_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "client_disclosure_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_disclosure_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_disclosure_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_disclosure_acceptances_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "client_disclosure_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_disclosure_versions: {
        Row: {
          body_markdown: string
          created_at: string
          effective_from: string
          id: string
          is_current: boolean
          kind: string
          version_hash: string
        }
        Insert: {
          body_markdown: string
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          kind?: string
          version_hash: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          kind?: string
          version_hash?: string
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          app_version: string | null
          error_code: string | null
          fingerprint: string
          id: string
          message_normalised: string | null
          occurred_at: string
          operation: string | null
          raw: Json | null
          route: string | null
          source: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          error_code?: string | null
          fingerprint: string
          id?: string
          message_normalised?: string | null
          occurred_at?: string
          operation?: string | null
          raw?: Json | null
          route?: string | null
          source: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          error_code?: string | null
          fingerprint?: string
          id?: string
          message_normalised?: string | null
          occurred_at?: string
          operation?: string | null
          raw?: Json | null
          route?: string | null
          source?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "client_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_bulk_links: {
        Row: {
          coach_note: string | null
          coach_user_id: string
          created_at: string
          expires_at: string | null
          id: string
          instrument_id: string
          paid_at: string | null
          preferred_first_context: string | null
          results_released: boolean
          seats_claimed: number
          seats_total: number
          status: string
          stripe_payment_intent_id: string | null
          token: string
          total_amount: number | null
          walkthrough_enabled: boolean | null
        }
        Insert: {
          coach_note?: string | null
          coach_user_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          instrument_id: string
          paid_at?: string | null
          preferred_first_context?: string | null
          results_released?: boolean
          seats_claimed?: number
          seats_total: number
          status?: string
          stripe_payment_intent_id?: string | null
          token: string
          total_amount?: number | null
          walkthrough_enabled?: boolean | null
        }
        Update: {
          coach_note?: string | null
          coach_user_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          instrument_id?: string
          paid_at?: string | null
          preferred_first_context?: string | null
          results_released?: boolean
          seats_claimed?: number
          seats_total?: number
          status?: string
          stripe_payment_intent_id?: string | null
          token?: string
          total_amount?: number | null
          walkthrough_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_bulk_links_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bulk_links_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_bulk_links_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bulk_links_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_bulk_links_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bulk_links_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          certificate_image_path: string | null
          certification_path_id: string | null
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
          certificate_image_path?: string | null
          certification_path_id?: string | null
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
          certificate_image_path?: string | null
          certification_path_id?: string | null
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
            foreignKeyName: "coach_certifications_certification_path_id_fkey"
            columns: ["certification_path_id"]
            isOneToOne: false
            referencedRelation: "certification_paths"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          bulk_link_id: string | null
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
          invite_token: string
          invite_token_claimed_at: string | null
          paired_assessment_id: string | null
          preferred_first_context: string | null
          refund_amount: number | null
          refund_failure_reason: string | null
          refunded_at: string | null
          results_released: boolean
          revoked_at: string | null
          stripe_coupon_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          walkthrough_enabled: boolean | null
        }
        Insert: {
          actor_id?: string | null
          assessment_id?: string | null
          bulk_link_id?: string | null
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
          invite_token?: string
          invite_token_claimed_at?: string | null
          paired_assessment_id?: string | null
          preferred_first_context?: string | null
          refund_amount?: number | null
          refund_failure_reason?: string | null
          refunded_at?: string | null
          results_released?: boolean
          revoked_at?: string | null
          stripe_coupon_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          walkthrough_enabled?: boolean | null
        }
        Update: {
          actor_id?: string | null
          assessment_id?: string | null
          bulk_link_id?: string | null
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
          invite_token?: string
          invite_token_claimed_at?: string | null
          paired_assessment_id?: string | null
          preferred_first_context?: string | null
          refund_amount?: number | null
          refund_failure_reason?: string | null
          refunded_at?: string | null
          results_released?: boolean
          revoked_at?: string | null
          stripe_coupon_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          walkthrough_enabled?: boolean | null
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
            foreignKeyName: "coach_clients_bulk_link_id_fkey"
            columns: ["bulk_link_id"]
            isOneToOne: false
            referencedRelation: "coach_bulk_links"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          kind: string
          version_hash: string
        }
        Insert: {
          body_markdown: string
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          kind?: string
          version_hash: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          kind?: string
          version_hash?: string
        }
        Relationships: []
      }
      coach_free_assessment_pool: {
        Row: {
          balance: number
          coach_user_id: string
          created_at: string
          id: string
          instrument_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          coach_user_id: string
          created_at?: string
          id?: string
          instrument_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          coach_user_id?: string
          created_at?: string
          id?: string
          instrument_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_free_assessment_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_assessment_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_free_assessment_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_assessment_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_free_assessment_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_free_report_ledger: {
        Row: {
          actor_user_id: string | null
          balance_after: number
          coach_user_id: string
          created_at: string
          delta: number
          entry_type: string
          id: string
          reason: string
          report_order_id: string | null
          report_type: string
        }
        Insert: {
          actor_user_id?: string | null
          balance_after: number
          coach_user_id: string
          created_at?: string
          delta: number
          entry_type: string
          id?: string
          reason: string
          report_order_id?: string | null
          report_type: string
        }
        Update: {
          actor_user_id?: string | null
          balance_after?: number
          coach_user_id?: string
          created_at?: string
          delta?: number
          entry_type?: string
          id?: string
          reason?: string
          report_order_id?: string | null
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_free_report_ledger_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_ledger_report_order_id_fkey"
            columns: ["report_order_id"]
            isOneToOne: false
            referencedRelation: "report_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_free_report_pool: {
        Row: {
          balance: number
          coach_user_id: string
          created_at: string
          id: string
          report_type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          coach_user_id: string
          created_at?: string
          id?: string
          report_type: string
          updated_at?: string
        }
        Update: {
          balance?: number
          coach_user_id?: string
          created_at?: string
          id?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_free_report_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_free_report_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_free_report_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_free_report_pool_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      coach_order_notes: {
        Row: {
          coach_note: string
          coach_user_id: string
          consumed_at: string | null
          created_at: string
          id: string
        }
        Insert: {
          coach_note: string
          coach_user_id: string
          consumed_at?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          coach_note?: string
          coach_user_id?: string
          consumed_at?: string | null
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      coach_pending_bulk_batches: {
        Row: {
          coach_user_id: string
          completed_at: string | null
          created_at: string
          id: string
          preferred_first_context: string | null
          results_released: boolean
          rows: Json
          status: string
          stripe_session_id: string | null
          total_amount: number
          walkthrough_enabled: boolean | null
        }
        Insert: {
          coach_user_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          preferred_first_context?: string | null
          results_released?: boolean
          rows: Json
          status?: string
          stripe_session_id?: string | null
          total_amount: number
          walkthrough_enabled?: boolean | null
        }
        Update: {
          coach_user_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          preferred_first_context?: string | null
          results_released?: boolean
          rows?: Json
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
          walkthrough_enabled?: boolean | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      coach_settings: {
        Row: {
          coach_user_id: string
          created_at: string
          updated_at: string
          walkthrough_default: boolean
        }
        Insert: {
          coach_user_id: string
          created_at?: string
          updated_at?: string
          walkthrough_default?: boolean
        }
        Update: {
          coach_user_id?: string
          created_at?: string
          updated_at?: string
          walkthrough_default?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "coach_settings_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_settings_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coach_settings_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_settings_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: true
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coach_settings_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_activities: {
        Row: {
          code: string
          created_at: string
          definition: Json
          desired_outcome: string | null
          id: string
          module_group: string
          sequence: number | null
          status: string
          tags: string[]
          thumbnail_url: string | null
          tier: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          definition?: Json
          desired_outcome?: string | null
          id?: string
          module_group: string
          sequence?: number | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          tier?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          definition?: Json
          desired_outcome?: string | null
          id?: string
          module_group?: string
          sequence?: number | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          tier?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      coaching_activity_embeddings: {
        Row: {
          activity_id: string
          content: string
          embedding: string | null
          search_tsv: unknown
          updated_at: string
        }
        Insert: {
          activity_id: string
          content: string
          embedding?: string | null
          search_tsv?: unknown
          updated_at?: string
        }
        Update: {
          activity_id?: string
          content?: string
          embedding?: string | null
          search_tsv?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_activity_embeddings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "coaching_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_embeddings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "coaching_activities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_activity_sessions: {
        Row: {
          activity_id: string
          coach_visible: boolean
          completed_at: string | null
          context_snapshot: Json | null
          created_at: string
          current_step: number
          id: string
          parent_session_id: string | null
          responses: Json
          run_number: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          coach_visible?: boolean
          completed_at?: string | null
          context_snapshot?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          parent_session_id?: string | null
          responses?: Json
          run_number?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          coach_visible?: boolean
          completed_at?: string | null
          context_snapshot?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          parent_session_id?: string | null
          responses?: Json
          run_number?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_activity_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "coaching_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "coaching_activities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "coaching_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_activity_shares: {
        Row: {
          granted_at: string
          id: string
          mode: string
          owner_user_id: string
          revoked_at: string | null
          viewer_user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          mode?: string
          owner_user_id: string
          revoked_at?: string | null
          viewer_user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          mode?: string
          owner_user_id?: string
          revoked_at?: string | null
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_activity_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_activity_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_assessment_uploads: {
        Row: {
          coaching_session_id: string
          created_at: string
          extracted_text: string | null
          file_type: string
          id: string
          label: string | null
          original_filename: string | null
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          coaching_session_id: string
          created_at?: string
          extracted_text?: string | null
          file_type: string
          id?: string
          label?: string | null
          original_filename?: string | null
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          coaching_session_id?: string
          created_at?: string
          extracted_text?: string | null
          file_type?: string
          id?: string
          label?: string | null
          original_filename?: string | null
          status?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_assessment_uploads_coaching_session_id_fkey"
            columns: ["coaching_session_id"]
            isOneToOne: false
            referencedRelation: "coaching_activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_credit_grants: {
        Row: {
          amount: number
          created_at: string
          id: string
          source: string | null
          source_ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source?: string | null
          source_ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source?: string | null
          source_ref?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_foundational_grandfathered: {
        Row: {
          captured_at: string
          reason: string
          user_id: string
        }
        Insert: {
          captured_at?: string
          reason?: string
          user_id: string
        }
        Update: {
          captured_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_foundational_grandfathered_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_foundational_grandfathered_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_foundational_grandfathered_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_foundational_grandfathered_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_foundational_grandfathered_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_media_library: {
        Row: {
          active: boolean
          alt: string | null
          alt_ai: boolean
          bucket_id: string
          category: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          alt?: string | null
          alt_ai?: boolean
          bucket_id?: string
          category: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          alt?: string | null
          alt_ai?: boolean
          bucket_id?: string
          category?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      coaching_notes: {
        Row: {
          activity_id: string
          body: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          body?: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          body?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_notes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "coaching_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_notes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "coaching_activities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_plan_block_feedback: {
        Row: {
          block_index: number
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          block_index: number
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          user_id: string
          verdict: string
        }
        Update: {
          block_index?: number
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_plan_block_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_plan_block_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_plan_block_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_plan_block_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_plan_block_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_plan_block_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_response_extracts: {
        Row: {
          activity_id: string
          content: string
          context: string | null
          created_at: string
          embedding: string | null
          id: string
          item_index: number
          response_key: string
          session_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          context?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          item_index?: number
          response_key: string
          session_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          context?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          item_index?: number
          response_key?: string
          session_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_response_extracts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "coaching_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_extracts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "coaching_activities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_extracts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_extracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_extracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_response_extracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_extracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_response_extracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_response_media: {
        Row: {
          activity_code: string | null
          coaching_session_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          kind: string
          mux_asset_id: string | null
          mux_status: string
          mux_upload_id: string | null
          playback_id: string | null
          question_key: string
          relationship_session_id: string | null
          three_sixty_response_id: string | null
          transcript: string | null
          transcript_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_code?: string | null
          coaching_session_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind: string
          mux_asset_id?: string | null
          mux_status?: string
          mux_upload_id?: string | null
          playback_id?: string | null
          question_key: string
          relationship_session_id?: string | null
          three_sixty_response_id?: string | null
          transcript?: string | null
          transcript_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_code?: string | null
          coaching_session_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          mux_asset_id?: string | null
          mux_status?: string
          mux_upload_id?: string | null
          playback_id?: string | null
          question_key?: string
          relationship_session_id?: string | null
          three_sixty_response_id?: string | null
          transcript?: string | null
          transcript_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_response_media_relationship_session_id_fkey"
            columns: ["relationship_session_id"]
            isOneToOne: false
            referencedRelation: "relationship_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_media_three_sixty_response_id_fkey"
            columns: ["three_sixty_response_id"]
            isOneToOne: false
            referencedRelation: "three_sixty_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_response_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_response_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_response_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_reviews: {
        Row: {
          activity_count: number
          created_at: string
          id: string
          review: Json
          run_number: number
          user_id: string
        }
        Insert: {
          activity_count?: number
          created_at?: string
          id?: string
          review: Json
          run_number?: number
          user_id: string
        }
        Update: {
          activity_count?: number
          created_at?: string
          id?: string
          review?: Json
          run_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_saying_library: {
        Row: {
          active: boolean
          author: string | null
          category: string
          created_at: string
          id: string
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          author?: string | null
          category?: string
          created_at?: string
          id?: string
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          author?: string | null
          category?: string
          created_at?: string
          id?: string
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_usage_counters: {
        Row: {
          count: number
          created_at: string
          id: string
          org_id: string | null
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          org_id?: string | null
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          org_id?: string | null
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_user_summary: {
        Row: {
          current_run: number
          last_session_id: string | null
          prior_runs: Json
          summary: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          current_run?: number
          last_session_id?: string | null
          prior_runs?: Json
          summary?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          current_run?: number
          last_session_id?: string | null
          prior_runs?: Json
          summary?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_user_summary_last_session_id_fkey"
            columns: ["last_session_id"]
            isOneToOne: false
            referencedRelation: "coaching_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_user_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_user_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "coaching_user_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_user_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "coaching_user_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          is_active: boolean
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cohort_event_attendance: {
        Row: {
          event_id: string
          home_cohort_id: string | null
          id: string
          invite_sent_at: string | null
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          home_cohort_id?: string | null
          id?: string
          invite_sent_at?: string | null
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          home_cohort_id?: string | null
          id?: string
          invite_sent_at?: string | null
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cohort_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_attendance_home_cohort_id_fkey"
            columns: ["home_cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "cohort_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cohort_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_event_email_schedules: {
        Row: {
          audience: string
          created_at: string
          id: string
          is_active: boolean
          offset_minutes: number
          scope: string
          template_type: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          id?: string
          is_active?: boolean
          offset_minutes?: number
          scope: string
          template_type: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          is_active?: boolean
          offset_minutes?: number
          scope?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cohort_event_email_sends: {
        Row: {
          cohort_id: string | null
          event_id: string | null
          id: string
          send_status: string
          sent_at: string
          template_type: string
          user_id: string
        }
        Insert: {
          cohort_id?: string | null
          event_id?: string | null
          id?: string
          send_status?: string
          sent_at?: string
          template_type: string
          user_id: string
        }
        Update: {
          cohort_id?: string | null
          event_id?: string | null
          id?: string
          send_status?: string
          sent_at?: string
          template_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_event_email_sends_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_email_sends_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cohort_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "cohort_event_email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_event_email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cohort_event_email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_events: {
        Row: {
          cohort_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          graph_organizer_id: string | null
          ics_sequence: number
          ics_uid: string
          id: string
          is_published: boolean
          sequence_no: number
          starts_at: string
          teams_join_url: string | null
          teams_meeting_id: string | null
          teams_meeting_kind: string | null
          timezone: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cohort_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          graph_organizer_id?: string | null
          ics_sequence?: number
          ics_uid?: string
          id?: string
          is_published?: boolean
          sequence_no: number
          starts_at: string
          teams_join_url?: string | null
          teams_meeting_id?: string | null
          teams_meeting_kind?: string | null
          timezone?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cohort_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          graph_organizer_id?: string | null
          ics_sequence?: number
          ics_uid?: string
          id?: string
          is_published?: boolean
          sequence_no?: number
          starts_at?: string
          teams_join_url?: string | null
          teams_meeting_id?: string | null
          teams_meeting_kind?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_events_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          practitioner_competency_url: string | null
          practitioner_email: string | null
          practitioner_name: string | null
          practitioner_ptp_debrief_url: string | null
          practitioner_scheduling_url: string | null
          starts_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          welcome_attachment_asset_id: string | null
          welcome_attachment_url: string | null
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
          practitioner_competency_url?: string | null
          practitioner_email?: string | null
          practitioner_name?: string | null
          practitioner_ptp_debrief_url?: string | null
          practitioner_scheduling_url?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          welcome_attachment_asset_id?: string | null
          welcome_attachment_url?: string | null
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
          practitioner_competency_url?: string | null
          practitioner_email?: string | null
          practitioner_name?: string | null
          practitioner_ptp_debrief_url?: string | null
          practitioner_scheduling_url?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          welcome_attachment_asset_id?: string | null
          welcome_attachment_url?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cohorts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_welcome_attachment_asset_id_fkey"
            columns: ["welcome_attachment_asset_id"]
            isOneToOne: false
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "cohorts_welcome_attachment_asset_id_fkey"
            columns: ["welcome_attachment_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      comp_coupons: {
        Row: {
          applicable_account_types: string[] | null
          applicable_coach_user_ids: string[] | null
          applicable_instrument_ids: string[] | null
          applicable_report_types: string[] | null
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
          promo_code: string | null
          redeem_by: string
          stripe_coupon_id: string
        }
        Insert: {
          applicable_account_types?: string[] | null
          applicable_coach_user_ids?: string[] | null
          applicable_instrument_ids?: string[] | null
          applicable_report_types?: string[] | null
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
          promo_code?: string | null
          redeem_by: string
          stripe_coupon_id: string
        }
        Update: {
          applicable_account_types?: string[] | null
          applicable_coach_user_ids?: string[] | null
          applicable_instrument_ids?: string[] | null
          applicable_report_types?: string[] | null
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
          promo_code?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          quiz_answer_option_id: string | null
          quiz_question_id: string | null
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
          quiz_answer_option_id?: string | null
          quiz_question_id?: string | null
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
          quiz_answer_option_id?: string | null
          quiz_question_id?: string | null
          ref_field?: string
          resource_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_asset_refs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "content_asset_refs_quiz_answer_option_id_fkey"
            columns: ["quiz_answer_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_answer_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_asset_refs_quiz_question_id_fkey"
            columns: ["quiz_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          is_embed_only: boolean
          is_required: boolean
          item_type: string
          lesson_completion_mode: string | null
          module_id: string
          mux_asset_id: string | null
          mux_status: string | null
          outcomes: string[] | null
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
          is_embed_only?: boolean
          is_required?: boolean
          item_type: string
          lesson_completion_mode?: string | null
          module_id: string
          mux_asset_id?: string | null
          mux_status?: string | null
          outcomes?: string[] | null
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
          is_embed_only?: boolean
          is_required?: boolean
          item_type?: string
          lesson_completion_mode?: string | null
          module_id?: string
          mux_asset_id?: string | null
          mux_status?: string | null
          outcomes?: string[] | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          contract_total_annual_override: number | null
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
          paired_reports_included_qty: number
          paired_reports_unlimited: boolean
          price_per_user_annual_override: number | null
          seat_count: number
          start_date: string
          supervisor_dashboard_enabled: boolean
          team_reports_included_qty: number
          team_reports_unlimited: boolean
          tier_id: string
          updated_at: string
        }
        Insert: {
          ai_chat_enabled_override?: boolean | null
          contract_total_annual_override?: number | null
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
          paired_reports_included_qty?: number
          paired_reports_unlimited?: boolean
          price_per_user_annual_override?: number | null
          seat_count: number
          start_date: string
          supervisor_dashboard_enabled?: boolean
          team_reports_included_qty?: number
          team_reports_unlimited?: boolean
          tier_id: string
          updated_at?: string
        }
        Update: {
          ai_chat_enabled_override?: boolean | null
          contract_total_annual_override?: number | null
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
          paired_reports_included_qty?: number
          paired_reports_unlimited?: boolean
          price_per_user_annual_override?: number | null
          seat_count?: number
          start_date?: string
          supervisor_dashboard_enabled?: boolean
          team_reports_included_qty?: number
          team_reports_unlimited?: boolean
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          assessment_completed_at: string | null
          code: string
          created_at: string
          created_by_user_id: string
          department_id: string | null
          department_name: string | null
          expires_at: string
          id: string
          invitee_email: string
          last_assessment_reminder_at: string | null
          last_signup_reminder_at: string | null
          org_level: string | null
          organization_id: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          required_instrument_id: string | null
          supervisor_email: string | null
        }
        Insert: {
          account_type?: string
          assessment_completed_at?: string | null
          code: string
          created_at?: string
          created_by_user_id: string
          department_id?: string | null
          department_name?: string | null
          expires_at?: string
          id?: string
          invitee_email: string
          last_assessment_reminder_at?: string | null
          last_signup_reminder_at?: string | null
          org_level?: string | null
          organization_id: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          required_instrument_id?: string | null
          supervisor_email?: string | null
        }
        Update: {
          account_type?: string
          assessment_completed_at?: string | null
          code?: string
          created_at?: string
          created_by_user_id?: string
          department_id?: string | null
          department_name?: string | null
          expires_at?: string
          id?: string
          invitee_email?: string
          last_assessment_reminder_at?: string | null
          last_signup_reminder_at?: string | null
          org_level?: string | null
          organization_id?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          required_instrument_id?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      development_plan_coach_shares: {
        Row: {
          client_user_id: string
          coach_user_id: string
          granted_at: string
          id: string
          revoked_at: string | null
        }
        Insert: {
          client_user_id: string
          coach_user_id: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
        }
        Update: {
          client_user_id?: string
          coach_user_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_plan_coach_shares_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_plan_coach_shares_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plan_comments: {
        Row: {
          author_role: string
          author_user_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          item_id: string
          plan_owner_user_id: string
        }
        Insert: {
          author_role: string
          author_user_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          item_id: string
          plan_owner_user_id: string
        }
        Update: {
          author_role?: string
          author_user_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          item_id?: string
          plan_owner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plan_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "development_plan_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_plan_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "development_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_comments_plan_owner_user_id_fkey"
            columns: ["plan_owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_comments_plan_owner_user_id_fkey"
            columns: ["plan_owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "development_plan_comments_plan_owner_user_id_fkey"
            columns: ["plan_owner_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_comments_plan_owner_user_id_fkey"
            columns: ["plan_owner_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_plan_comments_plan_owner_user_id_fkey"
            columns: ["plan_owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plan_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          item_id: string
          metric_label: string | null
          metric_value: number | null
          note: string | null
          progress_pct: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          item_id: string
          metric_label?: string | null
          metric_value?: number | null
          note?: string | null
          progress_pct?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          item_id?: string
          metric_label?: string | null
          metric_value?: number | null
          note?: string | null
          progress_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plan_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "development_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "development_plan_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_plan_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plan_items: {
        Row: {
          action_text: string
          archived_at: string | null
          card_title: string | null
          created_at: string
          dimension_tags: string[]
          id: string
          progress_pct: number | null
          sort_order: number
          source: string
          source_context: string | null
          source_report_id: string | null
          source_result_id: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_text: string
          archived_at?: string | null
          card_title?: string | null
          created_at?: string
          dimension_tags?: string[]
          id?: string
          progress_pct?: number | null
          sort_order?: number
          source?: string
          source_context?: string | null
          source_report_id?: string | null
          source_result_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_text?: string
          archived_at?: string | null
          card_title?: string | null
          created_at?: string
          dimension_tags?: string[]
          id?: string
          progress_pct?: number | null
          sort_order?: number
          source?: string
          source_context?: string | null
          source_report_id?: string | null
          source_result_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plan_items_source_result_id_fkey"
            columns: ["source_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "development_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      dp_nudge_runs: {
        Row: {
          channel: string
          detail: Json
          dormant_skipped: number
          id: number
          ran_at: string
          users_considered: number
          users_notified: number
        }
        Insert: {
          channel: string
          detail?: Json
          dormant_skipped?: number
          id?: never
          ran_at?: string
          users_considered?: number
          users_notified?: number
        }
        Update: {
          channel?: string
          detail?: Json
          dormant_skipped?: number
          id?: never
          ran_at?: string
          users_considered?: number
          users_notified?: number
        }
        Relationships: []
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      facet_interpretations_pre_run_on_regen_backup: {
        Row: {
          assessment_result_id: string | null
          backed_up_at: string | null
          facet_data: Json | null
          generated_at: string | null
          id: string | null
          section_type: string | null
        }
        Insert: {
          assessment_result_id?: string | null
          backed_up_at?: string | null
          facet_data?: Json | null
          generated_at?: string | null
          id?: string | null
          section_type?: string | null
        }
        Update: {
          assessment_result_id?: string | null
          backed_up_at?: string | null
          facet_data?: Json | null
          generated_at?: string | null
          id?: string | null
          section_type?: string | null
        }
        Relationships: []
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      help_guide_chunks: {
        Row: {
          content: string
          content_hash: string
          embedding: string | null
          grain: string
          guide_id: string
          guide_summary: string
          guide_title: string
          id: string
          role: string
          role_label: string
          source_commit: string | null
          step_index: number | null
          step_title: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_hash: string
          embedding?: string | null
          grain: string
          guide_id: string
          guide_summary: string
          guide_title: string
          id?: string
          role: string
          role_label: string
          source_commit?: string | null
          step_index?: number | null
          step_title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_hash?: string
          embedding?: string | null
          grain?: string
          guide_id?: string
          guide_summary?: string
          guide_title?: string
          id?: string
          role?: string
          role_label?: string
          source_commit?: string | null
          step_index?: number | null
          step_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      heygen_catalog_cache: {
        Row: {
          fetched_at: string
          id: string
          payload: Json
        }
        Insert: {
          fetched_at?: string
          id?: string
          payload: Json
        }
        Update: {
          fetched_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      http_request_labels: {
        Row: {
          created_at: string
          method: string | null
          request_id: number
          url: string | null
        }
        Insert: {
          created_at?: string
          method?: string | null
          request_id: number
          url?: string | null
        }
        Update: {
          created_at?: string
          method?: string | null
          request_id?: number
          url?: string | null
        }
        Relationships: []
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      in_relationship_profile: {
        Row: {
          last_session_id: string | null
          profile: Json
          relationship_id: string
          run_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_session_id?: string | null
          profile?: Json
          relationship_id: string
          run_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_session_id?: string | null
          profile?: Json
          relationship_id?: string
          run_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_relationship_profile_last_session_id_fkey"
            columns: ["last_session_id"]
            isOneToOne: false
            referencedRelation: "relationship_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_relationship_profile_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_relationship_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_relationship_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "in_relationship_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_relationship_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "in_relationship_profile_user_id_fkey"
            columns: ["user_id"]
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
      internal_function_secrets: {
        Row: {
          created_at: string
          name: string
          secret: string
        }
        Insert: {
          created_at?: string
          name: string
          secret: string
        }
        Update: {
          created_at?: string
          name?: string
          secret?: string
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
          include_in_romantic: boolean | null
          instrument_id: string
          instrument_version: string | null
          item_id: string
          item_number: number | null
          item_text: string
          notes: string | null
          rater_type: string | null
          reverse_scored: boolean
          romantic_include_reason: string | null
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
          include_in_romantic?: boolean | null
          instrument_id: string
          instrument_version?: string | null
          item_id: string
          item_number?: number | null
          item_text: string
          notes?: string | null
          rater_type?: string | null
          reverse_scored?: boolean
          romantic_include_reason?: string | null
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
          include_in_romantic?: boolean | null
          instrument_id?: string
          instrument_version?: string | null
          item_id?: string
          item_number?: number | null
          item_text?: string
          notes?: string | null
          rater_type?: string | null
          reverse_scored?: boolean
          romantic_include_reason?: string | null
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
            foreignKeyName: "items_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions_public"
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
      learning_folder_access_grants: {
        Row: {
          created_at: string
          created_by: string | null
          folder_id: string
          grant_org_id: string | null
          grant_type: string
          grant_value: string | null
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_id: string
          grant_org_id?: string | null
          grant_type: string
          grant_value?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_id?: string
          grant_org_id?: string | null
          grant_type?: string
          grant_value?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_folder_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folder_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "learning_folder_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folder_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_folder_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folder_access_grants_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "learning_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folder_access_grants_grant_org_id_fkey"
            columns: ["grant_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_folder_items: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          entity_id: string
          entity_type: string
          folder_id: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          entity_id: string
          entity_type: string
          folder_id: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          entity_id?: string
          entity_type?: string
          folder_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_folder_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folder_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "learning_folder_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folder_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_folder_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "learning_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_folders: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          name: string
          parent_folder_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name: string
          parent_folder_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name?: string
          parent_folder_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "learning_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "learning_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_notes: {
        Row: {
          body: string
          content_item_id: string
          created_at: string
          id: string
          shared_at: string | null
          shared_with_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          content_item_id: string
          created_at?: string
          id?: string
          shared_at?: string | null
          shared_with_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          content_item_id?: string
          created_at?: string
          id?: string
          shared_at?: string | null
          shared_with_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_notes_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_notes_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_notes_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "learning_notes_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_notes_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_notes_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "learning_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_audio_generations: {
        Row: {
          asset_id: string | null
          char_count: number
          content_item_id: string | null
          created_at: string
          error_reason: string | null
          id: string
          model_id: string
          requested_by: string
          status: string
          voice_id: string
        }
        Insert: {
          asset_id?: string | null
          char_count?: number
          content_item_id?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          model_id: string
          requested_by: string
          status?: string
          voice_id: string
        }
        Update: {
          asset_id?: string | null
          char_count?: number
          content_item_id?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          model_id?: string
          requested_by?: string
          status?: string
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_audio_generations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "lesson_audio_generations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_audio_generations_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      lesson_brands: {
        Row: {
          color_accent: string | null
          color_cta: string | null
          color_free1: string | null
          color_free2: string | null
          color_primary: string | null
          color_surface: string | null
          content_item_id: string
          created_at: string
          created_by: string | null
          font_body_key: string | null
          font_display_key: string | null
          logo_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color_accent?: string | null
          color_cta?: string | null
          color_free1?: string | null
          color_free2?: string | null
          color_primary?: string | null
          color_surface?: string | null
          content_item_id: string
          created_at?: string
          created_by?: string | null
          font_body_key?: string | null
          font_display_key?: string | null
          logo_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color_accent?: string | null
          color_cta?: string | null
          color_free1?: string | null
          color_free2?: string | null
          color_primary?: string | null
          color_surface?: string | null
          content_item_id?: string
          created_at?: string
          created_by?: string | null
          font_body_key?: string | null
          font_display_key?: string | null
          logo_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_brands_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: true
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_hotspot_autoplace_log: {
        Row: {
          content_item_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_item_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_item_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_open_responses: {
        Row: {
          ai_feedback: string
          attempt_number: number
          block_id: string
          content_item_id: string
          created_at: string
          id: string
          model: string | null
          response_text: string
          user_id: string
        }
        Insert: {
          ai_feedback: string
          attempt_number: number
          block_id: string
          content_item_id: string
          created_at?: string
          id?: string
          model?: string | null
          response_text: string
          user_id: string
        }
        Update: {
          ai_feedback?: string
          attempt_number?: number
          block_id?: string
          content_item_id?: string
          created_at?: string
          id?: string
          model?: string | null
          response_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_open_responses_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_open_responses_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_open_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_open_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "lesson_open_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_open_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lesson_open_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_video_generations: {
        Row: {
          avatar_id: string
          content_item_id: string | null
          created_at: string
          error_reason: string | null
          heygen_video_id: string | null
          id: string
          requested_by: string
          script: string
          status: string
          target_block_client_id: string | null
          target_kind: string
          target_lesson_content_item_id: string | null
          updated_at: string
          voice_id: string
        }
        Insert: {
          avatar_id: string
          content_item_id?: string | null
          created_at?: string
          error_reason?: string | null
          heygen_video_id?: string | null
          id?: string
          requested_by: string
          script: string
          status?: string
          target_block_client_id?: string | null
          target_kind: string
          target_lesson_content_item_id?: string | null
          updated_at?: string
          voice_id: string
        }
        Update: {
          avatar_id?: string
          content_item_id?: string | null
          created_at?: string
          error_reason?: string | null
          heygen_video_id?: string | null
          id?: string
          requested_by?: string
          script?: string
          status?: string
          target_block_client_id?: string | null
          target_kind?: string
          target_lesson_content_item_id?: string | null
          updated_at?: string
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_video_generations_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_video_generations_target_lesson_content_item_id_fkey"
            columns: ["target_lesson_content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_team_members: {
        Row: {
          bio: string | null
          booking_url: string | null
          created_at: string
          credentials: string | null
          display_name: string
          headline: string | null
          headshot_bucket: string
          headshot_path: string | null
          id: string
          is_published: boolean
          linkedin_url: string | null
          role_title: string | null
          short_bio: string | null
          slug: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          booking_url?: string | null
          created_at?: string
          credentials?: string | null
          display_name: string
          headline?: string | null
          headshot_bucket?: string
          headshot_path?: string | null
          id?: string
          is_published?: boolean
          linkedin_url?: string | null
          role_title?: string | null
          short_bio?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          booking_url?: string | null
          created_at?: string
          credentials?: string | null
          display_name?: string
          headline?: string | null
          headshot_bucket?: string
          headshot_path?: string | null
          id?: string
          is_published?: boolean
          linkedin_url?: string | null
          role_title?: string | null
          short_bio?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      marketing_testimonials: {
        Row: {
          attribution_name: string
          attribution_org: string | null
          attribution_title: string | null
          created_at: string
          headshot_bucket: string
          headshot_path: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          placements: string[]
          quote: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          attribution_name: string
          attribution_org?: string | null
          attribution_title?: string | null
          created_at?: string
          headshot_bucket?: string
          headshot_path?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          placements?: string[]
          quote: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attribution_name?: string
          attribution_org?: string | null
          attribution_title?: string | null
          created_at?: string
          headshot_bucket?: string
          headshot_path?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          placements?: string[]
          quote?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      module_definitions: {
        Row: {
          created_at: string
          default_enabled: boolean
          is_enforced: boolean
          is_sellable: boolean
          label: string
          module: string
        }
        Insert: {
          created_at?: string
          default_enabled?: boolean
          is_enforced?: boolean
          is_sellable?: boolean
          label: string
          module: string
        }
        Update: {
          created_at?: string
          default_enabled?: boolean
          is_enforced?: boolean
          is_sellable?: boolean
          label?: string
          module?: string
        }
        Relationships: []
      }
      module_entitlements: {
        Row: {
          created_at: string
          effect: string
          ends_at: string | null
          granted_by: string | null
          id: string
          module: string
          org_id: string | null
          principal_type: string
          revoked_at: string | null
          source: string
          source_ref: string | null
          starts_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          effect?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          module: string
          org_id?: string | null
          principal_type: string
          revoked_at?: string | null
          source: string
          source_ref?: string | null
          starts_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          effect?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          module?: string
          org_id?: string | null
          principal_type?: string
          revoked_at?: string | null
          source?: string
          source_ref?: string | null
          starts_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "module_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "module_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_module_fkey"
            columns: ["module"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["module"]
          },
          {
            foreignKeyName: "module_entitlements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "module_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "module_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      module_subscription_prices: {
        Row: {
          created_at: string
          grant_kind: string
          module: string
          stripe_price_id: string
        }
        Insert: {
          created_at?: string
          grant_kind?: string
          module: string
          stripe_price_id: string
        }
        Update: {
          created_at?: string
          grant_kind?: string
          module?: string
          stripe_price_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_subscription_prices_module_fkey"
            columns: ["module"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["module"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      mr_dispatch_runs: {
        Row: {
          considered: number
          detail: Json
          dry_run: boolean
          errors: number
          id: string
          ran_at: string
          sent: number
          suppressed: number
        }
        Insert: {
          considered?: number
          detail?: Json
          dry_run?: boolean
          errors?: number
          id?: string
          ran_at?: string
          sent?: number
          suppressed?: number
        }
        Update: {
          considered?: number
          detail?: Json
          dry_run?: boolean
          errors?: number
          id?: string
          ran_at?: string
          sent?: number
          suppressed?: number
        }
        Relationships: []
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      notification_dispatch_log: {
        Row: {
          channel: string
          dedup_key: string
          dispatched_at: string
          id: string
          notification_type: string
          user_id: string
        }
        Insert: {
          channel: string
          dedup_key: string
          dispatched_at?: string
          id?: string
          notification_type: string
          user_id: string
        }
        Update: {
          channel?: string
          dedup_key?: string
          dispatched_at?: string
          id?: string
          notification_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatch_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatch_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "notification_dispatch_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatch_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_dispatch_log_user_id_fkey"
            columns: ["user_id"]
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
          suppress_on_safety_concern: boolean
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
          suppress_on_safety_concern?: boolean
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
          suppress_on_safety_concern?: boolean
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      org_custom_domains: {
        Row: {
          created_at: string
          created_by: string | null
          hostname: string
          id: string
          is_primary: boolean
          is_verified: boolean
          kind: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hostname: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          kind?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hostname?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          kind?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_custom_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      organization_coaches: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          coach_user_id: string
          ended_at: string | null
          ended_by: string | null
          id: string
          note: string | null
          organization_id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          coach_user_id: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          note?: string | null
          organization_id: string
          status?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          coach_user_id?: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_coaches_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "organization_coaches_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_coaches_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "organization_coaches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_coaches_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "organization_coaches_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_coaches_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coaches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          brand_accent_color: string | null
          brand_logo_path: string | null
          brand_primary_color: string | null
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
          brand_accent_color?: string | null
          brand_logo_path?: string | null
          brand_primary_color?: string | null
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
          brand_accent_color?: string | null
          brand_logo_path?: string | null
          brand_primary_color?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      paired_profile_sections: {
        Row: {
          content: string | null
          id: string
          narrative_status: string
          paired_profile_id: string
          section_type: string
        }
        Insert: {
          content?: string | null
          id?: string
          narrative_status?: string
          paired_profile_id: string
          section_type: string
        }
        Update: {
          content?: string | null
          id?: string
          narrative_status?: string
          paired_profile_id?: string
          section_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "paired_profile_sections_paired_profile_id_fkey"
            columns: ["paired_profile_id"]
            isOneToOne: false
            referencedRelation: "paired_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paired_profile_subjects: {
        Row: {
          pair_role: string
          paired_profile_id: string
          source_assessment_id: string
          user_id: string
        }
        Insert: {
          pair_role: string
          paired_profile_id: string
          source_assessment_id: string
          user_id: string
        }
        Update: {
          pair_role?: string
          paired_profile_id?: string
          source_assessment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paired_profile_subjects_paired_profile_id_fkey"
            columns: ["paired_profile_id"]
            isOneToOne: false
            referencedRelation: "paired_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_profile_subjects_source_assessment_id_fkey"
            columns: ["source_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      paired_profiles: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          computed_at: string
          generated_by: string
          generated_by_role: string
          id: string
          instrument_id: string
          item_set: string
          narrative_status: string
          organization_id: string | null
          paired_assessment_id: string | null
          relationship_mode: string
          released_to_subjects: boolean
          structured: Json
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          computed_at?: string
          generated_by: string
          generated_by_role: string
          id?: string
          instrument_id?: string
          item_set: string
          narrative_status?: string
          organization_id?: string | null
          paired_assessment_id?: string | null
          relationship_mode: string
          released_to_subjects?: boolean
          structured: Json
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          computed_at?: string
          generated_by?: string
          generated_by_role?: string
          id?: string
          instrument_id?: string
          item_set?: string
          narrative_status?: string
          organization_id?: string | null
          paired_assessment_id?: string | null
          relationship_mode?: string
          released_to_subjects?: boolean
          structured?: Json
        }
        Relationships: [
          {
            foreignKeyName: "paired_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "paired_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "paired_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_profiles_paired_assessment_id_fkey"
            columns: ["paired_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      paired_report_highlights: {
        Row: {
          block_key: string
          block_text_sha: string
          color: string | null
          created_at: string
          end_offset: number
          id: string
          note: string | null
          paired_profile_id: string
          quoted_text: string
          start_offset: number
          updated_at: string
          viewer_user_id: string
        }
        Insert: {
          block_key: string
          block_text_sha: string
          color?: string | null
          created_at?: string
          end_offset: number
          id?: string
          note?: string | null
          paired_profile_id: string
          quoted_text: string
          start_offset: number
          updated_at?: string
          viewer_user_id: string
        }
        Update: {
          block_key?: string
          block_text_sha?: string
          color?: string | null
          created_at?: string
          end_offset?: number
          id?: string
          note?: string | null
          paired_profile_id?: string
          quoted_text?: string
          start_offset?: number
          updated_at?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paired_report_highlights_paired_profile_id_fkey"
            columns: ["paired_profile_id"]
            isOneToOne: false
            referencedRelation: "paired_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "paired_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paired_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "paired_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          audience: string
          created_at: string
          display_name: string
          entitlement_tier: string | null
          features: Json
          is_active: boolean
          one_time_credit_grant: number
          sort_order: number
          tier: string
          updated_at: string
        }
        Insert: {
          ai_coaching_limit?: number
          audience?: string
          created_at?: string
          display_name: string
          entitlement_tier?: string | null
          features?: Json
          is_active?: boolean
          one_time_credit_grant?: number
          sort_order?: number
          tier: string
          updated_at?: string
        }
        Update: {
          ai_coaching_limit?: number
          audience?: string
          created_at?: string
          display_name?: string
          entitlement_tier?: string | null
          features?: Json
          is_active?: boolean
          one_time_credit_grant?: number
          sort_order?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_admin_queries: {
        Row: {
          actor_user_id: string
          failed: boolean
          id: string
          ran_at: string
          row_count: number | null
          statement: string
        }
        Insert: {
          actor_user_id: string
          failed?: boolean
          id?: string
          ran_at?: string
          row_count?: number | null
          statement: string
        }
        Update: {
          actor_user_id?: string
          failed?: boolean
          id?: string
          ran_at?: string
          row_count?: number | null
          statement?: string
        }
        Relationships: []
      }
      platform_agent_executions: {
        Row: {
          actor_user_id: string
          after_row: Json | null
          applied_at: string
          before_row: Json
          id: string
          json_path: string[] | null
          note: string | null
          reverted_at: string | null
          reverted_by: string | null
          status: string
          target_column: string
          target_id: string
          target_table: string
          ticket_id: string | null
        }
        Insert: {
          actor_user_id: string
          after_row?: Json | null
          applied_at?: string
          before_row: Json
          id?: string
          json_path?: string[] | null
          note?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          status?: string
          target_column: string
          target_id: string
          target_table: string
          ticket_id?: string | null
        }
        Update: {
          actor_user_id?: string
          after_row?: Json | null
          applied_at?: string
          before_row?: Json
          id?: string
          json_path?: string[] | null
          note?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          status?: string
          target_column?: string
          target_id?: string
          target_table?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_agent_executions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_agent_heartbeats: {
        Row: {
          created_at: string
          id: number
          label: string
          observed_at: string
          response_id: number | null
          status_code: number
        }
        Insert: {
          created_at?: string
          id?: number
          label: string
          observed_at: string
          response_id?: number | null
          status_code: number
        }
        Update: {
          created_at?: string
          id?: number
          label?: string
          observed_at?: string
          response_id?: number | null
          status_code?: number
        }
        Relationships: []
      }
      platform_agent_liveness_expectations: {
        Row: {
          is_active: boolean
          label: string
          max_silence: string
          note: string | null
          severity: string
        }
        Insert: {
          is_active?: boolean
          label: string
          max_silence: string
          note?: string | null
          severity?: string
        }
        Update: {
          is_active?: boolean
          label?: string
          max_silence?: string
          note?: string | null
          severity?: string
        }
        Relationships: []
      }
      platform_agent_proposals: {
        Row: {
          adjustment: string | null
          applied_at: string | null
          apply_result: Json | null
          created_at: string
          decided_at: string | null
          decided_via: string | null
          expires_at: string
          id: string
          impact: string
          kind: string
          proposed_change: Json
          rationale: string
          reversal: string
          risk: string
          status: string
          ticket_id: string | null
          title: string
          token_enc: string | null
          token_hash: string
        }
        Insert: {
          adjustment?: string | null
          applied_at?: string | null
          apply_result?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_via?: string | null
          expires_at?: string
          id?: string
          impact: string
          kind: string
          proposed_change?: Json
          rationale: string
          reversal: string
          risk: string
          status?: string
          ticket_id?: string | null
          title: string
          token_enc?: string | null
          token_hash: string
        }
        Update: {
          adjustment?: string | null
          applied_at?: string | null
          apply_result?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_via?: string | null
          expires_at?: string
          id?: string
          impact?: string
          kind?: string
          proposed_change?: Json
          rationale?: string
          reversal?: string
          risk?: string
          status?: string
          ticket_id?: string | null
          title?: string
          token_enc?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_agent_proposals_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_diagnostic_evidence: {
        Row: {
          actor_user_id: string
          body: string | null
          captured_at: string | null
          created_at: string
          id: string
          kind: string
          route: string | null
          storage_path: string | null
          ticket_id: string | null
        }
        Insert: {
          actor_user_id: string
          body?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          kind: string
          route?: string | null
          storage_path?: string | null
          ticket_id?: string | null
        }
        Update: {
          actor_user_id?: string
          body?: string | null
          captured_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          route?: string | null
          storage_path?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_diagnostic_evidence_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_diagnostic_evidence_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_diagnostic_evidence_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_diagnostic_evidence_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_diagnostic_evidence_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_diagnostic_evidence_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_email_suppression: {
        Row: {
          added_at: string
          added_by: string | null
          email: string
          reason: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email: string
          reason: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string
          reason?: string
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
      platform_lovable_prompts: {
        Row: {
          created_at: string
          created_by: string
          files_cited: string[] | null
          id: string
          prompt: string
          status: string
          ticket_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          files_cited?: string[] | null
          id?: string
          prompt: string
          status?: string
          ticket_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          files_cited?: string[] | null
          id?: string
          prompt?: string
          status?: string
          ticket_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_lovable_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_lovable_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_lovable_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_lovable_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_lovable_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_lovable_prompts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ticket_actions: {
        Row: {
          action_code: string
          detail: Json
          id: string
          outcome: string
          performed_at: string
          reversal_hint: string | null
          reverted_at: string | null
          reverted_by: string | null
          subject_ref: string | null
          ticket_id: string | null
          ticket_type: string
        }
        Insert: {
          action_code: string
          detail?: Json
          id?: string
          outcome: string
          performed_at?: string
          reversal_hint?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          subject_ref?: string | null
          ticket_id?: string | null
          ticket_type: string
        }
        Update: {
          action_code?: string
          detail?: Json
          id?: string
          outcome?: string
          performed_at?: string
          reversal_hint?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          subject_ref?: string | null
          ticket_id?: string | null
          ticket_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_ticket_actions_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_ticket_actions_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_ticket_actions_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_ticket_actions_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_ticket_actions_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_ticket_actions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ticket_learnings: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          facts: Json
          id: string
          observation_window: string
          recurrence_checked_at: string | null
          resolution: string
          resolved_by_human: boolean
          source_kind: string
          superseded_at: string | null
          ticket_id: string | null
          ticket_type: string
          title: string | null
          verified_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          facts?: Json
          id?: string
          observation_window?: string
          recurrence_checked_at?: string | null
          resolution: string
          resolved_by_human: boolean
          source_kind?: string
          superseded_at?: string | null
          ticket_id?: string | null
          ticket_type: string
          title?: string | null
          verified_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          facts?: Json
          id?: string
          observation_window?: string
          recurrence_checked_at?: string | null
          resolution?: string
          resolved_by_human?: boolean
          source_kind?: string
          superseded_at?: string | null
          ticket_id?: string | null
          ticket_type?: string
          title?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_ticket_learnings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ticket_messages: {
        Row: {
          author_kind: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_kind: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_kind?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_ticket_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_ticket_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_ticket_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_ticket_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_ticket_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ticket_scan_state: {
        Row: {
          first_scan_completed_at: string | null
          id: boolean
          last_scan_at: string | null
          last_scan_opened: number
          last_scan_resolved: number
        }
        Insert: {
          first_scan_completed_at?: string | null
          id?: boolean
          last_scan_at?: string | null
          last_scan_opened?: number
          last_scan_resolved?: number
        }
        Update: {
          first_scan_completed_at?: string | null
          id?: boolean
          last_scan_at?: string | null
          last_scan_opened?: number
          last_scan_resolved?: number
        }
        Relationships: []
      }
      platform_ticket_types: {
        Row: {
          created_at: string
          default_severity: string
          description: string | null
          is_active: boolean
          label: string
          ticket_type: string
        }
        Insert: {
          created_at?: string
          default_severity: string
          description?: string | null
          is_active?: boolean
          label: string
          ticket_type: string
        }
        Update: {
          created_at?: string
          default_severity?: string
          description?: string | null
          is_active?: boolean
          label?: string
          ticket_type?: string
        }
        Relationships: []
      }
      platform_tickets: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          dedupe_key: string
          detail: Json
          escalated_at: string | null
          escalation_reason: string | null
          id: string
          is_backlog: boolean
          notified_at: string | null
          origin: string
          reported_by_user_id: string | null
          resolution: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_fingerprint: string | null
          status: string
          subject_email: string | null
          subject_ref: string | null
          subject_user_id: string | null
          ticket_type: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          dedupe_key: string
          detail?: Json
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          is_backlog?: boolean
          notified_at?: string | null
          origin?: string
          reported_by_user_id?: string | null
          resolution?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source_fingerprint?: string | null
          status?: string
          subject_email?: string | null
          subject_ref?: string | null
          subject_user_id?: string | null
          ticket_type: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          dedupe_key?: string
          detail?: Json
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          is_backlog?: boolean
          notified_at?: string | null
          origin?: string
          reported_by_user_id?: string | null
          resolution?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_fingerprint?: string | null
          status?: string
          subject_email?: string | null
          subject_ref?: string | null
          subject_user_id?: string | null
          ticket_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_tickets_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_tickets_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_tickets_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_tickets_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_tickets_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "platform_tickets_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_tickets_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_tickets_ticket_type_fkey"
            columns: ["ticket_type"]
            isOneToOne: false
            referencedRelation: "platform_ticket_types"
            referencedColumns: ["ticket_type"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      practitioner_bio_generations: {
        Row: {
          created_at: string
          id: string
          input_summary: Json | null
          model_id: string | null
          output_chars: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_summary?: Json | null
          model_id?: string | null
          output_chars?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_summary?: Json | null
          model_id?: string | null
          output_chars?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_bio_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_bio_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "practitioner_bio_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_bio_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practitioner_bio_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_directory_listing: {
        Row: {
          consent_note: string | null
          consent_recorded_at: string
          consent_source: string
          consented_at: string | null
          decision_version_id: string | null
          listed: boolean
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_note?: string | null
          consent_recorded_at?: string
          consent_source?: string
          consented_at?: string | null
          decision_version_id?: string | null
          listed?: boolean
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_note?: string | null
          consent_recorded_at?: string
          consent_source?: string
          consented_at?: string | null
          decision_version_id?: string | null
          listed?: boolean
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_directory_listing_decision_version_id_fkey"
            columns: ["decision_version_id"]
            isOneToOne: false
            referencedRelation: "coach_disclosure_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_listing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_listing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "practitioner_directory_listing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_listing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practitioner_directory_listing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_directory_profiles: {
        Row: {
          approved_at: string | null
          approved_payload: Json | null
          bio: string | null
          booking_url: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          headline: string | null
          headshot_path: string | null
          instagram_url: string | null
          linkedin_url: string | null
          moderation_status: string
          region: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_payload?: Json | null
          bio?: string | null
          booking_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          headshot_path?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          moderation_status?: string
          region?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_payload?: Json | null
          bio?: string | null
          booking_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          headshot_path?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          moderation_status?: string
          region?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_directory_profiles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practitioner_directory_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purchases: {
        Row: {
          amount_cents: number
          currency: string
          id: string
          metadata: Json
          payer: string
          purchased_at: string
          purchased_by: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_price_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          currency?: string
          id?: string
          metadata?: Json
          payer?: string
          purchased_at?: string
          purchased_by?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          currency?: string
          id?: string
          metadata?: Json
          payer?: string
          purchased_at?: string
          purchased_by?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "product_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      program_survey_links: {
        Row: {
          label: string | null
          scope: string
          updated_at: string
          url: string | null
        }
        Insert: {
          label?: string | null
          scope: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          label?: string | null
          scope?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      ptp_combined_reports: {
        Row: {
          dimension_scores: Json
          id: string
          interval_days: number | null
          paired_at: string
          personal_completed_at: string | null
          personal_result_id: string
          professional_completed_at: string | null
          professional_result_id: string
          source: string
          user_id: string
        }
        Insert: {
          dimension_scores: Json
          id?: string
          interval_days?: number | null
          paired_at?: string
          personal_completed_at?: string | null
          personal_result_id: string
          professional_completed_at?: string | null
          professional_result_id: string
          source?: string
          user_id: string
        }
        Update: {
          dimension_scores?: Json
          id?: string
          interval_days?: number | null
          paired_at?: string
          personal_completed_at?: string | null
          personal_result_id?: string
          professional_completed_at?: string | null
          professional_result_id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_combined_reports_personal_result_id_fkey"
            columns: ["personal_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_combined_reports_professional_result_id_fkey"
            columns: ["professional_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_combined_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_combined_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_combined_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_combined_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_combined_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_facet_types: {
        Row: {
          floor_risk: string
          item_id: string
          item_number: number
          resource_logic: string
          routes: boolean
          salience: string
          salience_weight: number
        }
        Insert: {
          floor_risk: string
          item_id: string
          item_number: number
          resource_logic: string
          routes: boolean
          salience: string
          salience_weight: number
        }
        Update: {
          floor_risk?: string
          item_id?: string
          item_number?: number
          resource_logic?: string
          routes?: boolean
          salience?: string
          salience_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ptp_facet_types_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "ptp_facet_types_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_presentation"
            referencedColumns: ["item_id"]
          },
        ]
      }
      ptp_generation_attempts: {
        Row: {
          assessment_result_id: string
          attempts: number
          first_dispatched_at: string | null
          last_dispatched_at: string | null
          last_error: string | null
          last_request_id: number | null
          last_status: number | null
          next_eligible_at: string | null
          state: string
          unit: string
          updated_at: string
        }
        Insert: {
          assessment_result_id: string
          attempts?: number
          first_dispatched_at?: string | null
          last_dispatched_at?: string | null
          last_error?: string | null
          last_request_id?: number | null
          last_status?: number | null
          next_eligible_at?: string | null
          state?: string
          unit: string
          updated_at?: string
        }
        Update: {
          assessment_result_id?: string
          attempts?: number
          first_dispatched_at?: string | null
          last_dispatched_at?: string | null
          last_error?: string | null
          last_request_id?: number | null
          last_status?: number | null
          next_eligible_at?: string | null
          state?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_generation_attempts_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_intro_gate_state: {
        Row: {
          created_at: string
          id: string
          outcome: string | null
          resolved_at: string
          triggering_result_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome?: string | null
          resolved_at?: string
          triggering_result_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string | null
          resolved_at?: string
          triggering_result_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_intro_gate_state_triggering_result_id_fkey"
            columns: ["triggering_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_intro_gate_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_intro_gate_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_intro_gate_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_intro_gate_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_intro_gate_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_intro_gate_videos: {
        Row: {
          card_body: string | null
          card_title: string | null
          created_at: string
          id: string
          is_active: boolean
          position: number
          resource_id: string
          runtime_label: string | null
          updated_at: string
        }
        Insert: {
          card_body?: string | null
          card_title?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          position: number
          resource_id: string
          runtime_label?: string | null
          updated_at?: string
        }
        Update: {
          card_body?: string | null
          card_title?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          resource_id?: string
          runtime_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_intro_gate_videos_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_intro_video_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          first_started_at: string | null
          gate_video_id: string
          id: string
          last_position_seconds: number
          max_percent: number
          resource_id: string | null
          status: string
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          first_started_at?: string | null
          gate_video_id: string
          id?: string
          last_position_seconds?: number
          max_percent?: number
          resource_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          first_started_at?: string | null
          gate_video_id?: string
          id?: string
          last_position_seconds?: number
          max_percent?: number
          resource_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "ptp_intro_video_progress_gate_video_id_fkey"
            columns: ["gate_video_id"]
            isOneToOne: false
            referencedRelation: "ptp_intro_gate_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_intro_video_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_intro_video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_intro_video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_intro_video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_intro_video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_intro_video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_report_highlights: {
        Row: {
          assessment_result_id: string
          block_key: string
          block_text_sha: string
          color: string | null
          context_tab: string
          created_at: string
          end_offset: number
          id: string
          note: string | null
          quoted_text: string
          start_offset: number
          updated_at: string
          viewer_user_id: string
        }
        Insert: {
          assessment_result_id: string
          block_key: string
          block_text_sha: string
          color?: string | null
          context_tab: string
          created_at?: string
          end_offset: number
          id?: string
          note?: string | null
          quoted_text: string
          start_offset: number
          updated_at?: string
          viewer_user_id: string
        }
        Update: {
          assessment_result_id?: string
          block_key?: string
          block_text_sha?: string
          color?: string | null
          context_tab?: string
          created_at?: string
          end_offset?: number
          id?: string
          note?: string | null
          quoted_text?: string
          start_offset?: number
          updated_at?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_report_highlights_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_result_shares: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          revoked_at: string | null
          viewer_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          revoked_at?: string | null
          viewer_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          revoked_at?: string | null
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_result_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_result_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_result_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_result_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_result_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_result_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_result_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_result_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_result_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_result_shares_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_share_attempts: {
        Row: {
          actor_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_share_attempts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_share_attempts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_share_attempts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_share_attempts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_share_attempts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_sharing_content: {
        Row: {
          audience: string
          created_at: string
          share_impact: boolean
          share_interpretation: boolean
          share_scores: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          audience: string
          created_at?: string
          share_impact?: boolean
          share_interpretation?: boolean
          share_scores?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          created_at?: string
          share_impact?: boolean
          share_interpretation?: boolean
          share_scores?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_sharing_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_sharing_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_sharing_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_sharing_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_sharing_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ptp_walkthrough_sessions: {
        Row: {
          assessment_result_id: string
          completed_at: string | null
          created_at: string
          current_step: string | null
          declined_count: number
          exchange_budget: number | null
          exchanges_spent: number
          funding: string | null
          id: string
          last_activity_at: string | null
          narrative_context: string
          offered_at: string
          opening_intent: string | null
          outcome_at_offer: string | null
          parent_session_id: string | null
          responses: Json
          run_number: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_result_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          declined_count?: number
          exchange_budget?: number | null
          exchanges_spent?: number
          funding?: string | null
          id?: string
          last_activity_at?: string | null
          narrative_context?: string
          offered_at?: string
          opening_intent?: string | null
          outcome_at_offer?: string | null
          parent_session_id?: string | null
          responses?: Json
          run_number?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_result_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          declined_count?: number
          exchange_budget?: number | null
          exchanges_spent?: number
          funding?: string | null
          id?: string
          last_activity_at?: string | null
          narrative_context?: string
          offered_at?: string
          opening_intent?: string | null
          outcome_at_offer?: string | null
          parent_session_id?: string | null
          responses?: Json
          run_number?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ptp_walkthrough_sessions_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "bw_walkthrough_usage"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "ptp_walkthrough_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
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
          option_image_asset_id: string | null
          option_image_url: string | null
          option_text: string | null
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
          option_image_asset_id?: string | null
          option_image_url?: string | null
          option_text?: string | null
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
          option_image_asset_id?: string | null
          option_image_url?: string | null
          option_text?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quiz_answer_options_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answer_options_option_image_asset_id_fkey"
            columns: ["option_image_asset_id"]
            isOneToOne: false
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "quiz_answer_options_option_image_asset_id_fkey"
            columns: ["option_image_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          question_image_asset_id: string | null
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
          question_image_asset_id?: string | null
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
          question_image_asset_id?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quiz_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_question_image_asset_id_fkey"
            columns: ["question_image_asset_id"]
            isOneToOne: false
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "quiz_questions_question_image_asset_id_fkey"
            columns: ["question_image_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      relationship_activities: {
        Row: {
          area_code: string
          barrier_blocks: string
          barrier_mode: string
          code: string
          created_at: string
          definition: Json
          est_minutes_high: number | null
          est_minutes_low: number | null
          hero_image_url: string | null
          id: string
          module_number: number | null
          partner_mode: string
          practitioner_gated: boolean
          practitioner_visibility: string
          prerequisite_codes: string[]
          repeatable: boolean
          requires_double_consent: boolean
          romantic_disclaimer: boolean
          sequence: number
          solo_unlock_eligible: boolean
          status: string
          tags: string[]
          title: string
          updated_at: string
          version: number
          visibility_mode: string
          writes_in_relationship_profile: boolean
          writes_relationship_profile: boolean
        }
        Insert: {
          area_code: string
          barrier_blocks?: string
          barrier_mode?: string
          code: string
          created_at?: string
          definition?: Json
          est_minutes_high?: number | null
          est_minutes_low?: number | null
          hero_image_url?: string | null
          id?: string
          module_number?: number | null
          partner_mode?: string
          practitioner_gated?: boolean
          practitioner_visibility?: string
          prerequisite_codes?: string[]
          repeatable?: boolean
          requires_double_consent?: boolean
          romantic_disclaimer?: boolean
          sequence: number
          solo_unlock_eligible?: boolean
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          version?: number
          visibility_mode: string
          writes_in_relationship_profile?: boolean
          writes_relationship_profile?: boolean
        }
        Update: {
          area_code?: string
          barrier_blocks?: string
          barrier_mode?: string
          code?: string
          created_at?: string
          definition?: Json
          est_minutes_high?: number | null
          est_minutes_low?: number | null
          hero_image_url?: string | null
          id?: string
          module_number?: number | null
          partner_mode?: string
          practitioner_gated?: boolean
          practitioner_visibility?: string
          prerequisite_codes?: string[]
          repeatable?: boolean
          requires_double_consent?: boolean
          romantic_disclaimer?: boolean
          sequence?: number
          solo_unlock_eligible?: boolean
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          version?: number
          visibility_mode?: string
          writes_in_relationship_profile?: boolean
          writes_relationship_profile?: boolean
        }
        Relationships: []
      }
      relationship_activity_artifacts: {
        Row: {
          activity_id: string
          claimed_at: string
          claimed_by: string | null
          created_at: string
          error: string | null
          generated_at: string | null
          html: string | null
          id: string
          model: string | null
          relationship_id: string
          run_number: number
          status: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          claimed_at?: string
          claimed_by?: string | null
          created_at?: string
          error?: string | null
          generated_at?: string | null
          html?: string | null
          id?: string
          model?: string | null
          relationship_id: string
          run_number?: number
          status?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          claimed_at?: string
          claimed_by?: string | null
          created_at?: string
          error?: string | null
          generated_at?: string | null
          html?: string | null
          id?: string
          model?: string | null
          relationship_id?: string
          run_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_activity_artifacts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_artifacts_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_activity_consent: {
        Row: {
          activity_id: string
          consented_at: string
          id: string
          relationship_id: string
          revoked_at: string | null
          run_number: number
          user_id: string
        }
        Insert: {
          activity_id: string
          consented_at?: string
          id?: string
          relationship_id: string
          revoked_at?: string | null
          run_number?: number
          user_id: string
        }
        Update: {
          activity_id?: string
          consented_at?: string
          id?: string
          relationship_id?: string
          revoked_at?: string | null
          run_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_activity_consent_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_consent_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_activity_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_activity_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_activity_embeddings: {
        Row: {
          activity_id: string
          content: string
          embedding: string
          search_tsv: unknown
          updated_at: string
        }
        Insert: {
          activity_id: string
          content: string
          embedding: string
          search_tsv?: unknown
          updated_at?: string
        }
        Update: {
          activity_id?: string
          content?: string
          embedding?: string
          search_tsv?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_activity_embeddings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_activity_sessions: {
        Row: {
          activity_id: string
          closed_without_reveal: boolean
          completed_at: string | null
          context_snapshot: Json | null
          created_at: string
          current_step: number
          id: string
          locked_at: string | null
          parent_session_id: string | null
          relationship_id: string
          responses: Json
          reveal_consumed_at: string | null
          run_number: number
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          closed_without_reveal?: boolean
          completed_at?: string | null
          context_snapshot?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          locked_at?: string | null
          parent_session_id?: string | null
          relationship_id: string
          responses?: Json
          reveal_consumed_at?: string | null
          run_number?: number
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          closed_without_reveal?: boolean
          completed_at?: string | null
          context_snapshot?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          locked_at?: string | null
          parent_session_id?: string | null
          relationship_id?: string
          responses?: Json
          reveal_consumed_at?: string | null
          run_number?: number
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_activity_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "relationship_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_sessions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_activity_state: {
        Row: {
          activity_id: string
          barrier_cleared_at: string | null
          created_at: string
          first_lock_at: string | null
          id: string
          last_nudge_at: string | null
          nudge_count: number
          relationship_id: string
          run_number: number
          solo_unlock_available_at: string | null
          solo_unlocked_at: string | null
          solo_unlocked_for: string | null
          updated_at: string
          user_one_locked_at: string | null
          user_two_locked_at: string | null
        }
        Insert: {
          activity_id: string
          barrier_cleared_at?: string | null
          created_at?: string
          first_lock_at?: string | null
          id?: string
          last_nudge_at?: string | null
          nudge_count?: number
          relationship_id: string
          run_number?: number
          solo_unlock_available_at?: string | null
          solo_unlocked_at?: string | null
          solo_unlocked_for?: string | null
          updated_at?: string
          user_one_locked_at?: string | null
          user_two_locked_at?: string | null
        }
        Update: {
          activity_id?: string
          barrier_cleared_at?: string | null
          created_at?: string
          first_lock_at?: string | null
          id?: string
          last_nudge_at?: string | null
          nudge_count?: number
          relationship_id?: string
          run_number?: number
          solo_unlock_available_at?: string | null
          solo_unlocked_at?: string | null
          solo_unlocked_for?: string | null
          updated_at?: string
          user_one_locked_at?: string | null
          user_two_locked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_activity_state_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_state_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_state_solo_unlocked_for_fkey"
            columns: ["solo_unlocked_for"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_state_solo_unlocked_for_fkey"
            columns: ["solo_unlocked_for"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_activity_state_solo_unlocked_for_fkey"
            columns: ["solo_unlocked_for"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_activity_state_solo_unlocked_for_fkey"
            columns: ["solo_unlocked_for"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_activity_state_solo_unlocked_for_fkey"
            columns: ["solo_unlocked_for"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_ai_usage: {
        Row: {
          activity_id: string | null
          created_at: string
          id: string
          input_tokens: number | null
          kind: string
          output_tokens: number | null
          relationship_id: string
          run_number: number
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind: string
          output_tokens?: number | null
          relationship_id: string
          run_number?: number
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind?: string
          output_tokens?: number | null
          relationship_id?: string
          run_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_ai_usage_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_ai_usage_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_config: {
        Row: {
          description: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      relationship_desire_picks: {
        Row: {
          activity_id: string
          created_at: string
          grid_mode: string
          id: string
          locked_at: string | null
          picks: Json
          relationship_id: string
          run_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          grid_mode: string
          id?: string
          locked_at?: string | null
          picks?: Json
          relationship_id: string
          run_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          grid_mode?: string
          id?: string
          locked_at?: string | null
          picks?: Json
          relationship_id?: string
          run_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_desire_picks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_desire_picks_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_desire_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_desire_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_desire_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_desire_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_desire_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_desire_vocabulary: {
        Row: {
          active: boolean
          applies_to_composition: string | null
          bank: string
          category: string
          category_label: string | null
          created_at: string
          helper: string | null
          id: string
          image_path: string | null
          item_key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_composition?: string | null
          bank?: string
          category: string
          category_label?: string | null
          created_at?: string
          helper?: string | null
          id?: string
          image_path?: string | null
          item_key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_composition?: string | null
          bank?: string
          category?: string
          category_label?: string | null
          created_at?: string
          helper?: string | null
          id?: string
          image_path?: string | null
          item_key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      relationship_focus_areas: {
        Row: {
          active: boolean
          area_code: string
          c_number: number
          cluster: string
          content_ready: boolean
          core_prereq_label: string | null
          created_at: string
          description: string | null
          gate: string
          hero_image_url: string | null
          learning_outcomes: string[]
          planned_activity_count: number | null
          practitioner_gated: boolean
          self_selectable: boolean
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          area_code: string
          c_number: number
          cluster: string
          content_ready?: boolean
          core_prereq_label?: string | null
          created_at?: string
          description?: string | null
          gate?: string
          hero_image_url?: string | null
          learning_outcomes?: string[]
          planned_activity_count?: number | null
          practitioner_gated?: boolean
          self_selectable?: boolean
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          area_code?: string
          c_number?: number
          cluster?: string
          content_ready?: boolean
          core_prereq_label?: string | null
          created_at?: string
          description?: string | null
          gate?: string
          hero_image_url?: string | null
          learning_outcomes?: string[]
          planned_activity_count?: number | null
          practitioner_gated?: boolean
          self_selectable?: boolean
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationship_marker_prefs: {
        Row: {
          created_at: string
          marker_color: string
          relationship_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          marker_color: string
          relationship_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          marker_color?: string
          relationship_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_marker_prefs_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_marker_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_marker_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_marker_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_marker_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_marker_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_modules: {
        Row: {
          active: boolean
          created_at: string
          description: string
          hero_image_url: string | null
          learning_outcomes: string[]
          module_number: number
          prerequisites: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          hero_image_url?: string | null
          learning_outcomes?: string[]
          module_number: number
          prerequisites?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          hero_image_url?: string | null
          learning_outcomes?: string[]
          module_number?: number
          prerequisites?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationship_profile: {
        Row: {
          last_session_id: string | null
          profile: Json
          relationship_id: string
          run_number: number
          updated_at: string
        }
        Insert: {
          last_session_id?: string | null
          profile?: Json
          relationship_id: string
          run_number?: number
          updated_at?: string
        }
        Update: {
          last_session_id?: string | null
          profile?: Json
          relationship_id?: string
          run_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_profile_last_session_id_fkey"
            columns: ["last_session_id"]
            isOneToOne: false
            referencedRelation: "relationship_activity_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_profile_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_safety_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          categories: string[]
          created_at: string
          id: string
          recipient_role: string
          recipient_user_id: string
          relationship_id: string
          routed_at: string | null
          safeguarding: boolean
          severity: string
          status: string
          subject_user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          categories?: string[]
          created_at?: string
          id?: string
          recipient_role: string
          recipient_user_id: string
          relationship_id: string
          routed_at?: string | null
          safeguarding?: boolean
          severity?: string
          status?: string
          subject_user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          categories?: string[]
          created_at?: string
          id?: string
          recipient_role?: string
          recipient_user_id?: string
          relationship_id?: string
          routed_at?: string | null
          safeguarding?: boolean
          severity?: string
          status?: string
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_safety_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_safety_alerts_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_safety_responses: {
        Row: {
          answers: Json
          concern: boolean
          concern_categories: string[]
          disclosure_text: string | null
          evaluated_at: string
          id: string
          items_version: number
          relationship_id: string
          resolved_at: string | null
          run_number: number
          user_id: string
        }
        Insert: {
          answers: Json
          concern: boolean
          concern_categories?: string[]
          disclosure_text?: string | null
          evaluated_at?: string
          id?: string
          items_version: number
          relationship_id: string
          resolved_at?: string | null
          run_number?: number
          user_id: string
        }
        Update: {
          answers?: Json
          concern?: boolean
          concern_categories?: string[]
          disclosure_text?: string | null
          evaluated_at?: string
          id?: string
          items_version?: number
          relationship_id?: string
          resolved_at?: string | null
          run_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_safety_responses_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_safety_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_safety_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_safety_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_safety_screen_items: {
        Row: {
          category: string | null
          concern_at: Json
          created_at: string
          id: string
          is_active: boolean
          item_key: string
          item_type: string
          options: Json
          prompt: string
          sort_order: number
          version: number
        }
        Insert: {
          category?: string | null
          concern_at?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          item_key: string
          item_type: string
          options?: Json
          prompt: string
          sort_order: number
          version: number
        }
        Update: {
          category?: string | null
          concern_at?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          item_key?: string
          item_type?: string
          options?: Json
          prompt?: string
          sort_order?: number
          version?: number
        }
        Relationships: []
      }
      relationship_signals: {
        Row: {
          activity_id: string | null
          captured_at: string
          id: string
          is_baseline: boolean
          meta: Json
          rater_user_id: string | null
          relationship_id: string
          run_number: number
          signal_key: string
          subject_user_id: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          activity_id?: string | null
          captured_at?: string
          id?: string
          is_baseline?: boolean
          meta?: Json
          rater_user_id?: string | null
          relationship_id: string
          run_number?: number
          signal_key: string
          subject_user_id: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          activity_id?: string | null
          captured_at?: string
          id?: string
          is_baseline?: boolean
          meta?: Json
          rater_user_id?: string | null
          relationship_id?: string
          run_number?: number
          signal_key?: string
          subject_user_id?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_signals_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_signals_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_signals_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_signals_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_signals_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_signals_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_signals_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_signals_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_signals_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationship_signals_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_signals_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationship_signals_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_substance_keywords: {
        Row: {
          category: string
          id: string
          is_active: boolean
          keyword: string
          version: number
        }
        Insert: {
          category: string
          id?: string
          is_active?: boolean
          keyword: string
          version: number
        }
        Update: {
          category?: string
          id?: string
          is_active?: boolean
          keyword?: string
          version?: number
        }
        Relationships: []
      }
      relationship_substance_resources: {
        Row: {
          category: string
          detail: string | null
          id: string
          is_active: boolean
          label: string
          region: string
          sort_order: number
          url: string | null
          version: number
        }
        Insert: {
          category: string
          detail?: string | null
          id?: string
          is_active?: boolean
          label: string
          region?: string
          sort_order?: number
          url?: string | null
          version: number
        }
        Update: {
          category?: string
          detail?: string | null
          id?: string
          is_active?: boolean
          label?: string
          region?: string
          sort_order?: number
          url?: string | null
          version?: number
        }
        Relationships: []
      }
      relationship_substance_responses: {
        Row: {
          activity_id: string
          answers: Json
          categories: string[]
          created_at: string
          id: string
          relationship_id: string
          routed: boolean
          run_number: number
          user_id: string
          version: number
        }
        Insert: {
          activity_id: string
          answers: Json
          categories?: string[]
          created_at?: string
          id?: string
          relationship_id: string
          routed?: boolean
          run_number?: number
          user_id: string
          version: number
        }
        Update: {
          activity_id?: string
          answers?: Json
          categories?: string[]
          created_at?: string
          id?: string
          relationship_id?: string
          routed?: boolean
          run_number?: number
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "relationship_substance_responses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "relationship_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_substance_responses_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_substance_screen_items: {
        Row: {
          category: string | null
          concern_at: Json | null
          created_at: string
          id: string
          is_active: boolean
          item_key: string
          item_type: string
          options: Json | null
          prompt: string
          sort_order: number
          version: number
        }
        Insert: {
          category?: string | null
          concern_at?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          item_key: string
          item_type: string
          options?: Json | null
          prompt: string
          sort_order: number
          version: number
        }
        Update: {
          category?: string | null
          concern_at?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          item_key?: string
          item_type?: string
          options?: Json | null
          prompt?: string
          sort_order?: number
          version?: number
        }
        Relationships: []
      }
      relationships: {
        Row: {
          ai_allowance: number
          chosen_focus_areas: string[]
          couple_composition: string | null
          created_at: string
          created_by: string
          current_paired_profile_id: string | null
          ended_at: string | null
          id: string
          pacing_ceiling_module: number | null
          pacing_set_at: string | null
          pacing_set_by: string | null
          run_number: number
          session_cadence_days: number | null
          started_at: string | null
          status: string
          updated_at: string
          user_one_declined_at: string | null
          user_one_id: string
          user_one_joined_at: string | null
          user_two_declined_at: string | null
          user_two_id: string
          user_two_joined_at: string | null
        }
        Insert: {
          ai_allowance?: number
          chosen_focus_areas?: string[]
          couple_composition?: string | null
          created_at?: string
          created_by: string
          current_paired_profile_id?: string | null
          ended_at?: string | null
          id?: string
          pacing_ceiling_module?: number | null
          pacing_set_at?: string | null
          pacing_set_by?: string | null
          run_number?: number
          session_cadence_days?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_one_declined_at?: string | null
          user_one_id: string
          user_one_joined_at?: string | null
          user_two_declined_at?: string | null
          user_two_id: string
          user_two_joined_at?: string | null
        }
        Update: {
          ai_allowance?: number
          chosen_focus_areas?: string[]
          couple_composition?: string | null
          created_at?: string
          created_by?: string
          current_paired_profile_id?: string | null
          ended_at?: string | null
          id?: string
          pacing_ceiling_module?: number | null
          pacing_set_at?: string | null
          pacing_set_by?: string | null
          run_number?: number
          session_cadence_days?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_one_declined_at?: string | null
          user_one_id?: string
          user_one_joined_at?: string | null
          user_two_declined_at?: string | null
          user_two_id?: string
          user_two_joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_current_paired_profile_id_fkey"
            columns: ["current_paired_profile_id"]
            isOneToOne: false
            referencedRelation: "paired_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_pacing_set_by_fkey"
            columns: ["pacing_set_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_pacing_set_by_fkey"
            columns: ["pacing_set_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationships_pacing_set_by_fkey"
            columns: ["pacing_set_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_pacing_set_by_fkey"
            columns: ["pacing_set_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationships_pacing_set_by_fkey"
            columns: ["pacing_set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_user_one_id_fkey"
            columns: ["user_one_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_user_one_id_fkey"
            columns: ["user_one_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationships_user_one_id_fkey"
            columns: ["user_one_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_user_one_id_fkey"
            columns: ["user_one_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationships_user_one_id_fkey"
            columns: ["user_one_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_user_two_id_fkey"
            columns: ["user_two_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_user_two_id_fkey"
            columns: ["user_two_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "relationships_user_two_id_fkey"
            columns: ["user_two_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_user_two_id_fkey"
            columns: ["user_two_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "relationships_user_two_id_fkey"
            columns: ["user_two_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_access_grants: {
        Row: {
          coach_user_id: string
          granted_at: string
          granted_by: string
          granted_reason: string | null
          id: string
          report_id: string
          report_type: string
          revoked_at: string | null
          revoked_reason: string | null
        }
        Insert: {
          coach_user_id: string
          granted_at?: string
          granted_by: string
          granted_reason?: string | null
          id?: string
          report_id: string
          report_type: string
          revoked_at?: string | null
          revoked_reason?: string | null
        }
        Update: {
          coach_user_id?: string
          granted_at?: string
          granted_by?: string
          granted_reason?: string | null
          id?: string
          report_id?: string
          report_type?: string
          revoked_at?: string | null
          revoked_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_access_grants_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_access_grants_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "report_access_grants_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_access_grants_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_access_grants_coach_user_id_fkey"
            columns: ["coach_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "report_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_capacity_requests: {
        Row: {
          created_at: string
          id: string
          included_qty_at_request: number | null
          organization_id: string
          reason: string | null
          relationship_mode: string | null
          report_type: string
          requested_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject_user_ids: string[]
          team_id: string | null
          used_at_request: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          included_qty_at_request?: number | null
          organization_id: string
          reason?: string | null
          relationship_mode?: string | null
          report_type: string
          requested_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_user_ids?: string[]
          team_id?: string | null
          used_at_request?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          included_qty_at_request?: number | null
          organization_id?: string
          reason?: string | null
          relationship_mode?: string | null
          report_type?: string
          requested_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_user_ids?: string[]
          team_id?: string | null
          used_at_request?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_capacity_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_capacity_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_capacity_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "report_capacity_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_capacity_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_capacity_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_capacity_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_capacity_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "report_capacity_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_capacity_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_capacity_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_commitments: {
        Row: {
          action_text: string
          archived_at: string | null
          created_at: string
          created_by: string
          dimension_tags: string[]
          id: string
          report_id: string
          report_kind: string
        }
        Insert: {
          action_text: string
          archived_at?: string | null
          created_at?: string
          created_by: string
          dimension_tags?: string[]
          id?: string
          report_id: string
          report_kind: string
        }
        Update: {
          action_text?: string
          archived_at?: string | null
          created_at?: string
          created_by?: string
          dimension_tags?: string[]
          id?: string
          report_id?: string
          report_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_commitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_commitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "report_commitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_commitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_commitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_orders: {
        Row: {
          amount_cents: number
          billing_mode: string | null
          client_email: string | null
          client_user_id: string | null
          coach_user_id: string
          created_at: string
          created_by: string | null
          currency: string
          generated_at: string | null
          generated_profile_id: string | null
          id: string
          instrument_id: string | null
          order_type: string
          organization_id: string | null
          paid_at: string | null
          payer: string
          relationship_mode: string | null
          release_now: boolean
          report_label: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_price_id: string | null
          subject_user_ids: string[]
          team_id: string | null
        }
        Insert: {
          amount_cents: number
          billing_mode?: string | null
          client_email?: string | null
          client_user_id?: string | null
          coach_user_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          generated_at?: string | null
          generated_profile_id?: string | null
          id?: string
          instrument_id?: string | null
          order_type: string
          organization_id?: string | null
          paid_at?: string | null
          payer?: string
          relationship_mode?: string | null
          release_now?: boolean
          report_label?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          subject_user_ids: string[]
          team_id?: string | null
        }
        Update: {
          amount_cents?: number
          billing_mode?: string | null
          client_email?: string | null
          client_user_id?: string | null
          coach_user_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          generated_at?: string | null
          generated_profile_id?: string | null
          id?: string
          instrument_id?: string | null
          order_type?: string
          organization_id?: string | null
          paid_at?: string | null
          payer?: string
          relationship_mode?: string | null
          release_now?: boolean
          report_label?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          subject_user_ids?: string[]
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_orders_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_orders_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "report_orders_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_orders_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_orders_client_user_id_fkey"
            columns: ["client_user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      resource_folder_access_grants: {
        Row: {
          created_at: string
          created_by: string | null
          folder_id: string
          grant_org_id: string | null
          grant_type: string
          grant_value: string | null
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_id: string
          grant_org_id?: string | null
          grant_type: string
          grant_value?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_id?: string
          grant_org_id?: string | null
          grant_type?: string
          grant_value?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_folder_access_grants_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "resource_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_folders: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          name: string
          parent_folder_id: string | null
          slug: string
          tab_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name: string
          parent_folder_id?: string | null
          slug: string
          tab_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          name?: string
          parent_folder_id?: string | null
          slug?: string
          tab_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "resource_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_folders_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "resource_tabs"
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
          duration_seconds: number | null
          folder_id: string | null
          id: string
          is_published: boolean
          mux_asset_id: string | null
          mux_status: string | null
          published_at: string
          resource_tab_id: string | null
          subscale_tags: string[] | null
          summary: string | null
          thumbnail_asset_id: string | null
          title: string
          updated_at: string
          url_kind: string | null
          url_or_content: string | null
          video_source_id: string | null
          video_source_type: string | null
        }
        Insert: {
          archived_at?: string | null
          audiences?: string[] | null
          category?: string
          content_asset_id?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          folder_id?: string | null
          id?: string
          is_published?: boolean
          mux_asset_id?: string | null
          mux_status?: string | null
          published_at?: string
          resource_tab_id?: string | null
          subscale_tags?: string[] | null
          summary?: string | null
          thumbnail_asset_id?: string | null
          title: string
          updated_at?: string
          url_kind?: string | null
          url_or_content?: string | null
          video_source_id?: string | null
          video_source_type?: string | null
        }
        Update: {
          archived_at?: string | null
          audiences?: string[] | null
          category?: string
          content_asset_id?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          folder_id?: string | null
          id?: string
          is_published?: boolean
          mux_asset_id?: string | null
          mux_status?: string | null
          published_at?: string
          resource_tab_id?: string | null
          subscale_tags?: string[] | null
          summary?: string | null
          thumbnail_asset_id?: string | null
          title?: string
          updated_at?: string
          url_kind?: string | null
          url_or_content?: string | null
          video_source_id?: string | null
          video_source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_content_asset_id_fkey"
            columns: ["content_asset_id"]
            isOneToOne: false
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "resource_folders"
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      scorm_exports: {
        Row: {
          bucket: string | null
          completion_pct: number
          content_item_id: string | null
          created_at: string
          error_reason: string | null
          exit_link: boolean
          id: string
          path: string | null
          reporting_pair: string
          requested_by: string
          scorm_version: string
          status: string
          tracking_mode: string
          updated_at: string
        }
        Insert: {
          bucket?: string | null
          completion_pct?: number
          content_item_id?: string | null
          created_at?: string
          error_reason?: string | null
          exit_link?: boolean
          id?: string
          path?: string | null
          reporting_pair?: string
          requested_by: string
          scorm_version: string
          status?: string
          tracking_mode?: string
          updated_at?: string
        }
        Update: {
          bucket?: string | null
          completion_pct?: number
          content_item_id?: string | null
          created_at?: string
          error_reason?: string | null
          exit_link?: boolean
          id?: string
          path?: string | null
          reporting_pair?: string
          requested_by?: string
          scorm_version?: string
          status?: string
          tracking_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorm_exports_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      server_failure_sweep_state: {
        Row: {
          last_id: number
          last_seen: string
          source: string
          updated_at: string
        }
        Insert: {
          last_id?: number
          last_seen?: string
          source: string
          updated_at?: string
        }
        Update: {
          last_id?: number
          last_seen?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      server_failures: {
        Row: {
          detail: Json
          fingerprint: string
          id: number
          label: string
          message: string | null
          occurred_at: string
          recorded_at: string
          route: string | null
          source: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          detail?: Json
          fingerprint: string
          id?: number
          label: string
          message?: string | null
          occurred_at: string
          recorded_at?: string
          route?: string | null
          source: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          detail?: Json
          fingerprint?: string
          id?: number
          label?: string
          message?: string | null
          occurred_at?: string
          recorded_at?: string
          route?: string | null
          source?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_failures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_failures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "server_failures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_failures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "server_failures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_credit_grants: {
        Row: {
          amount: number
          created_at: string
          id: string
          source: string | null
          source_ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source?: string | null
          source_ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source?: string | null
          source_ref?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "shared_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "shared_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_preferences: {
        Row: {
          created_at: string
          ptp_sharing_prompt_answered_at: string | null
          share_ptp_full: boolean
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
          ptp_sharing_prompt_answered_at?: string | null
          share_ptp_full?: boolean
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
          ptp_sharing_prompt_answered_at?: string | null
          share_ptp_full?: boolean
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          audience: string
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
          audience?: string
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
          audience?: string
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      support_questions: {
        Row: {
          answered: boolean
          created_at: string
          id: string
          question: string
          refusal_reason: string | null
          roles: string[]
          route: string | null
          sources: Json
          ticket_id: string | null
          top_similarity: number | null
          user_id: string | null
        }
        Insert: {
          answered: boolean
          created_at?: string
          id?: string
          question: string
          refusal_reason?: string | null
          roles?: string[]
          route?: string | null
          sources?: Json
          ticket_id?: string | null
          top_similarity?: number | null
          user_id?: string | null
        }
        Update: {
          answered?: boolean
          created_at?: string
          id?: string
          question?: string
          refusal_reason?: string | null
          roles?: string[]
          route?: string | null
          sources?: Json
          ticket_id?: string | null
          top_similarity?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_questions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "platform_tickets"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      team_profile_sections: {
        Row: {
          content: string | null
          id: string
          narrative_status: string
          section_type: string
          team_profile_id: string
        }
        Insert: {
          content?: string | null
          id?: string
          narrative_status?: string
          section_type: string
          team_profile_id: string
        }
        Update: {
          content?: string | null
          id?: string
          narrative_status?: string
          section_type?: string
          team_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_profile_sections_team_profile_id_fkey"
            columns: ["team_profile_id"]
            isOneToOne: false
            referencedRelation: "team_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_profile_subjects: {
        Row: {
          source_assessment_id: string
          team_profile_id: string
          user_id: string
        }
        Insert: {
          source_assessment_id: string
          team_profile_id: string
          user_id: string
        }
        Update: {
          source_assessment_id?: string
          team_profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_profile_subjects_source_assessment_id_fkey"
            columns: ["source_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_profile_subjects_team_profile_id_fkey"
            columns: ["team_profile_id"]
            isOneToOne: false
            referencedRelation: "team_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_profiles: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          computed_at: string
          generated_by: string
          generated_by_role: string
          id: string
          instrument_id: string
          item_set: string
          member_count: number
          narrative_status: string
          organization_id: string | null
          released_to_subjects: boolean
          report_label: string | null
          structured: Json
          team_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          computed_at?: string
          generated_by: string
          generated_by_role: string
          id?: string
          instrument_id?: string
          item_set?: string
          member_count: number
          narrative_status?: string
          organization_id?: string | null
          released_to_subjects?: boolean
          report_label?: string | null
          structured: Json
          team_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          computed_at?: string
          generated_by?: string
          generated_by_role?: string
          id?: string
          instrument_id?: string
          item_set?: string
          member_count?: number
          narrative_status?: string
          organization_id?: string | null
          released_to_subjects?: boolean
          report_label?: string | null
          structured?: Json
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "team_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "team_profiles_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_report_highlights: {
        Row: {
          block_key: string
          block_text_sha: string
          color: string | null
          created_at: string
          end_offset: number
          id: string
          note: string | null
          quoted_text: string
          start_offset: number
          team_profile_id: string
          updated_at: string
          viewer_user_id: string
        }
        Insert: {
          block_key: string
          block_text_sha: string
          color?: string | null
          created_at?: string
          end_offset: number
          id?: string
          note?: string | null
          quoted_text: string
          start_offset: number
          team_profile_id: string
          updated_at?: string
          viewer_user_id: string
        }
        Update: {
          block_key?: string
          block_text_sha?: string
          color?: string | null
          created_at?: string
          end_offset?: number
          id?: string
          note?: string | null
          quoted_text?: string
          start_offset?: number
          team_profile_id?: string
          updated_at?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_report_highlights_team_profile_id_fkey"
            columns: ["team_profile_id"]
            isOneToOne: false
            referencedRelation: "team_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "team_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "team_report_highlights_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      three_sixty_config: {
        Row: {
          description: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      three_sixty_credit_grants: {
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
            foreignKeyName: "three_sixty_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "three_sixty_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "three_sixty_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      three_sixty_cycles: {
        Row: {
          closed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          opened_at: string | null
          publish_error: string | null
          publish_failed_at: string | null
          question_set_version: number
          run_number: number
          status: string
          subject_user_id: string
          summary_attempted_at: string | null
          summary_attempts: number
          summary_generated_at: string | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          opened_at?: string | null
          publish_error?: string | null
          publish_failed_at?: string | null
          question_set_version?: number
          run_number?: number
          status?: string
          subject_user_id: string
          summary_attempted_at?: string | null
          summary_attempts?: number
          summary_generated_at?: string | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          opened_at?: string | null
          publish_error?: string | null
          publish_failed_at?: string | null
          question_set_version?: number
          run_number?: number
          status?: string
          subject_user_id?: string
          summary_attempted_at?: string | null
          summary_attempts?: number
          summary_generated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "three_sixty_cycles_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_cycles_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "three_sixty_cycles_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_cycles_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "three_sixty_cycles_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      three_sixty_question_sets: {
        Row: {
          created_at: string
          is_active: boolean
          source: string | null
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          source?: string | null
          title: string
          version: number
        }
        Update: {
          created_at?: string
          is_active?: boolean
          source?: string | null
          title?: string
          version?: number
        }
        Relationships: []
      }
      three_sixty_questions: {
        Row: {
          ai_followup: boolean
          answer_type: string
          created_at: string
          focus: string
          id: string
          modes: string[]
          ordinal: number
          prompt: string
          prompt_self: string | null
          prompt_self_serve: string | null
          question_key: string
          scale_max: number | null
          scale_max_label: string | null
          scale_min: number | null
          scale_min_label: string | null
          section: string
          version: number
        }
        Insert: {
          ai_followup?: boolean
          answer_type?: string
          created_at?: string
          focus: string
          id?: string
          modes?: string[]
          ordinal: number
          prompt: string
          prompt_self?: string | null
          prompt_self_serve?: string | null
          question_key: string
          scale_max?: number | null
          scale_max_label?: string | null
          scale_min?: number | null
          scale_min_label?: string | null
          section: string
          version: number
        }
        Update: {
          ai_followup?: boolean
          answer_type?: string
          created_at?: string
          focus?: string
          id?: string
          modes?: string[]
          ordinal?: number
          prompt?: string
          prompt_self?: string | null
          prompt_self_serve?: string | null
          question_key?: string
          scale_max?: number | null
          scale_max_label?: string | null
          scale_min?: number | null
          scale_min_label?: string | null
          section?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "three_sixty_questions_version_fkey"
            columns: ["version"]
            isOneToOne: false
            referencedRelation: "three_sixty_question_sets"
            referencedColumns: ["version"]
          },
        ]
      }
      three_sixty_raters: {
        Row: {
          accepted_at: string | null
          created_at: string
          cycle_id: string
          email: string
          expires_at: string | null
          full_name: string
          id: string
          invited_at: string | null
          invited_user_id: string | null
          last_reminder_at: string | null
          phone: string | null
          relationship: string | null
          reminder_count: number
          revoked_at: string | null
          role: string | null
          submitted_at: string | null
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          cycle_id: string
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          invited_at?: string | null
          invited_user_id?: string | null
          last_reminder_at?: string | null
          phone?: string | null
          relationship?: string | null
          reminder_count?: number
          revoked_at?: string | null
          role?: string | null
          submitted_at?: string | null
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          cycle_id?: string
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          invited_at?: string | null
          invited_user_id?: string | null
          last_reminder_at?: string | null
          phone?: string | null
          relationship?: string | null
          reminder_count?: number
          revoked_at?: string | null
          role?: string | null
          submitted_at?: string | null
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "three_sixty_raters_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "three_sixty_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_raters_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_raters_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "three_sixty_raters_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_raters_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "three_sixty_raters_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      three_sixty_responses: {
        Row: {
          answer: Json
          created_at: string
          followup: Json | null
          id: string
          item_index: number
          question_key: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          answer?: Json
          created_at?: string
          followup?: Json | null
          id?: string
          item_index?: number
          question_key: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          followup?: Json | null
          id?: string
          item_index?: number
          question_key?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "three_sixty_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "three_sixty_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      three_sixty_submissions: {
        Row: {
          created_at: string
          cycle_id: string
          id: string
          is_self: boolean
          mode: string
          rater_id: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          id?: string
          is_self?: boolean
          mode?: string
          rater_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          id?: string
          is_self?: boolean
          mode?: string
          rater_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "three_sixty_submissions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "three_sixty_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "three_sixty_submissions_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "three_sixty_raters"
            referencedColumns: ["id"]
          },
        ]
      }
      three_sixty_summaries: {
        Row: {
          content: Json
          cycle_id: string
          generated_at: string
          id: string
          model: string | null
          question_key: string | null
          scope: string
        }
        Insert: {
          content?: Json
          cycle_id: string
          generated_at?: string
          id?: string
          model?: string | null
          question_key?: string | null
          scope: string
        }
        Update: {
          content?: Json
          cycle_id?: string
          generated_at?: string
          id?: string
          model?: string | null
          question_key?: string | null
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "three_sixty_summaries_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "three_sixty_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      three_sixty_sweep_runs: {
        Row: {
          detail: Json
          id: string
          kind: string
          ran_at: string
        }
        Insert: {
          detail?: Json
          id?: string
          kind: string
          ran_at?: string
        }
        Update: {
          detail?: Json
          id?: string
          kind?: string
          ran_at?: string
        }
        Relationships: []
      }
      trigger_failure_log: {
        Row: {
          context: Json | null
          error_context: string | null
          error_message: string | null
          function_name: string
          id: string
          occurred_at: string
          record_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          sqlstate: string | null
          table_name: string | null
          trigger_name: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          error_context?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          occurred_at?: string
          record_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sqlstate?: string | null
          table_name?: string | null
          trigger_name: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          error_context?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          occurred_at?: string
          record_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sqlstate?: string | null
          table_name?: string | null
          trigger_name?: string
          user_id?: string | null
        }
        Relationships: []
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
      trusted_device_settings: {
        Row: {
          enabled: boolean
          id: boolean
          impersonation_window_hours: number
          updated_at: string
          updated_by: string | null
          window_days: number
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          impersonation_window_hours?: number
          updated_at?: string
          updated_by?: string | null
          window_days?: number
        }
        Update: {
          enabled?: boolean
          id?: boolean
          impersonation_window_hours?: number
          updated_at?: string
          updated_by?: string | null
          window_days?: number
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          id: string
          impersonation_trusted_at: string | null
          label: string | null
          last_used_at: string | null
          login_trusted_at: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          impersonation_trusted_at?: string | null
          label?: string | null
          last_used_at?: string | null
          login_trusted_at?: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          impersonation_trusted_at?: string | null
          label?: string | null
          last_used_at?: string | null
          login_trusted_at?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
          coach_billing_exempt: boolean
          coach_free_year_ended_at: string | null
          coach_subscription_free_until: string | null
          coach_subscription_tier: string | null
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
          lifecycle_email_opt_out: boolean
          lifecycle_unsub_token: string
          notifications: Json | null
          onboarding_completed_at: string | null
          onboarding_instrument_version: string | null
          one_time_chat_credits: number
          one_time_coaching_credits: number
          org_level: string | null
          organization_id: string | null
          personal_email_pending: string | null
          privacy_accepted_at: string | null
          privacy_version_accepted: string | null
          pseudonymized_at: string | null
          reactivation_deadline: string | null
          share_results_with_coach: boolean
          shared_ai_credits: number
          stripe_coupon_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_tier: string
          supervisor_user_id: string | null
          three_sixty_credits: number
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
          coach_billing_exempt?: boolean
          coach_free_year_ended_at?: string | null
          coach_subscription_free_until?: string | null
          coach_subscription_tier?: string | null
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
          lifecycle_email_opt_out?: boolean
          lifecycle_unsub_token?: string
          notifications?: Json | null
          onboarding_completed_at?: string | null
          onboarding_instrument_version?: string | null
          one_time_chat_credits?: number
          one_time_coaching_credits?: number
          org_level?: string | null
          organization_id?: string | null
          personal_email_pending?: string | null
          privacy_accepted_at?: string | null
          privacy_version_accepted?: string | null
          pseudonymized_at?: string | null
          reactivation_deadline?: string | null
          share_results_with_coach?: boolean
          shared_ai_credits?: number
          stripe_coupon_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          supervisor_user_id?: string | null
          three_sixty_credits?: number
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
          coach_billing_exempt?: boolean
          coach_free_year_ended_at?: string | null
          coach_subscription_free_until?: string | null
          coach_subscription_tier?: string | null
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
          lifecycle_email_opt_out?: boolean
          lifecycle_unsub_token?: string
          notifications?: Json | null
          onboarding_completed_at?: string | null
          onboarding_instrument_version?: string | null
          one_time_chat_credits?: number
          one_time_coaching_credits?: number
          org_level?: string | null
          organization_id?: string | null
          personal_email_pending?: string | null
          privacy_accepted_at?: string | null
          privacy_version_accepted?: string | null
          pseudonymized_at?: string | null
          reactivation_deadline?: string | null
          share_results_with_coach?: boolean
          shared_ai_credits?: number
          stripe_coupon_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          supervisor_user_id?: string | null
          three_sixty_credits?: number
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
            referencedRelation: "bw_archived_assets_missing_file"
            referencedColumns: ["asset_id"]
          },
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      airsa_skills_public: {
        Row: {
          dimension_id: string | null
          is_new_skill: boolean | null
          item_number: number | null
          short_description: string | null
          skill_name: string | null
        }
        Insert: {
          dimension_id?: string | null
          is_new_skill?: boolean | null
          item_number?: number | null
          short_description?: string | null
          skill_name?: string | null
        }
        Update: {
          dimension_id?: string | null
          is_new_skill?: boolean | null
          item_number?: number | null
          short_description?: string | null
          skill_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airsa_skills_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "airsa_skills_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions_public"
            referencedColumns: ["dimension_id"]
          },
        ]
      }
      bw_archived_assets_missing_file: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          asset_id: string | null
          bucket: string | null
          library_name: string | null
          original_filename: string | null
          path: string | null
          size_bytes: number | null
        }
        Relationships: []
      }
      bw_walkthrough_usage: {
        Row: {
          account_type: string | null
          assessment_result_id: string | null
          completed_at: string | null
          current_step: string | null
          duration: string | null
          exchange_budget: number | null
          exchanges_remaining: number | null
          exchanges_spent: number | null
          funding: string | null
          narrative_context: string | null
          outcome_at_offer: string | null
          pct_budget_used: number | null
          run_number: number | null
          session_id: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ptp_walkthrough_sessions_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_org_users_view"
            referencedColumns: ["supervisor_joined_id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ptp_walkthrough_sessions_user_id_fkey"
            columns: ["user_id"]
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
          preferred_first_context: string | null
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
          preferred_first_context?: string | null
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
          preferred_first_context?: string | null
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      coaching_activities_public: {
        Row: {
          code: string | null
          created_at: string | null
          definition: Json | null
          desired_outcome: string | null
          id: string | null
          module_group: string | null
          sequence: number | null
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          tier: string | null
          title: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          definition?: never
          desired_outcome?: never
          id?: string | null
          module_group?: string | null
          sequence?: number | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          definition?: never
          desired_outcome?: never
          id?: string | null
          module_group?: string | null
          sequence?: number | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      dimensions_public: {
        Row: {
          dimension_id: string | null
          dimension_name: string | null
          high_score_label: string | null
          id: string | null
          instrument_id: string | null
          instrument_version: string | null
          low_score_label: string | null
          short_name: string | null
        }
        Insert: {
          dimension_id?: string | null
          dimension_name?: string | null
          high_score_label?: string | null
          id?: string | null
          instrument_id?: string | null
          instrument_version?: string | null
          low_score_label?: string | null
          short_name?: string | null
        }
        Update: {
          dimension_id?: string | null
          dimension_name?: string | null
          high_score_label?: string | null
          id?: string | null
          instrument_id?: string | null
          instrument_version?: string | null
          low_score_label?: string | null
          short_name?: string | null
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
      items_presentation: {
        Row: {
          anchor_high: string | null
          anchor_low: string | null
          context_type: string | null
          dimension_id: string | null
          facet_name: string | null
          id: string | null
          include_in_romantic: boolean | null
          instrument_id: string | null
          instrument_version: string | null
          item_id: string | null
          item_number: number | null
          item_text: string | null
          rater_type: string | null
          scale_type: string | null
        }
        Insert: {
          anchor_high?: string | null
          anchor_low?: string | null
          context_type?: string | null
          dimension_id?: string | null
          facet_name?: string | null
          id?: string | null
          include_in_romantic?: boolean | null
          instrument_id?: string | null
          instrument_version?: string | null
          item_id?: string | null
          item_number?: number | null
          item_text?: string | null
          rater_type?: string | null
          scale_type?: string | null
        }
        Update: {
          anchor_high?: string | null
          anchor_low?: string | null
          context_type?: string | null
          dimension_id?: string | null
          facet_name?: string | null
          id?: string | null
          include_in_romantic?: boolean | null
          instrument_id?: string | null
          instrument_version?: string | null
          item_id?: string | null
          item_number?: number | null
          item_text?: string | null
          rater_type?: string | null
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
            foreignKeyName: "items_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions_public"
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
            referencedRelation: "reporting_users"
            referencedColumns: ["user_id"]
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
      reporting_users: {
        Row: {
          account_status: string | null
          account_type: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          full_name: string | null
          is_staff: boolean | null
          org_level: string | null
          organization_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          user_id: string | null
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
        ]
      }
      response_scales_public: {
        Row: {
          display_label: string | null
          numeric_equivalent: number | null
          readiness_translation: string | null
          response_value: string | null
          scale_type: string | null
        }
        Insert: {
          display_label?: string | null
          numeric_equivalent?: number | null
          readiness_translation?: string | null
          response_value?: string | null
          scale_type?: string | null
        }
        Update: {
          display_label?: string | null
          numeric_equivalent?: number | null
          readiness_translation?: string | null
          response_value?: string | null
          scale_type?: string | null
        }
        Relationships: []
      }
      v_ptp_report_health: {
        Row: {
          ai_narrative_done: boolean | null
          assessment_result_id: string | null
          context_type: string | null
          contexts_expected: string[] | null
          created_at: string | null
          facets_done: boolean | null
          facets_stored: number | null
          facets_total: number | null
          narrative_status: string | null
          next_facet_batch: number | null
          onepagers_missing: number | null
          onepagers_overdue: boolean | null
          onepagers_present: number | null
          path_kind: string | null
          report_complete: boolean | null
          status_needs_settling: boolean | null
          units_done: string[] | null
          units_expected: string[] | null
          units_missing: number | null
          units_todo: string[] | null
          user_id: string | null
          wedged_contexts: string[] | null
        }
        Relationships: []
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
      _authorize_lesson_block_for_trainee: {
        Args: { p_block_id: string; p_user_id?: string }
        Returns: string
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
      _cascade_archive_asset_refs_for_quiz: {
        Args: {
          p_archive_reason: string
          p_caller_id: string
          p_quiz_answer_option_id: string
          p_quiz_question_id: string
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
      _module_entitlement_upsert: {
        Args: {
          p_effect?: string
          p_ends_at: string
          p_granted_by: string
          p_module: string
          p_org_id: string
          p_principal_type: string
          p_source: string
          p_source_ref: string
          p_user_id: string
        }
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
      accept_client_360_disclosure: {
        Args: { p_version_hash: string; p_version_id: string }
        Returns: Json
      }
      accept_client_coaching_disclosure: {
        Args: { p_version_hash: string; p_version_id: string }
        Returns: Json
      }
      accept_coach_disclosure: {
        Args: { p_version_hash: string; p_version_id: string }
        Returns: Json
      }
      admin_assign_or_invite_org_admin: {
        Args: { p_email: string; p_organization_id: string }
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
      admin_grant_report_access: {
        Args: {
          p_coach_user_id: string
          p_reason: string
          p_report_id: string
          p_report_type: string
        }
        Returns: Json
      }
      admin_grant_report_access_bulk: {
        Args: {
          p_coach_user_ids: string[]
          p_reason: string
          p_report_id: string
          p_report_type: string
        }
        Returns: Json
      }
      admin_invitation_create: {
        Args: {
          p_account_type?: string
          p_department_name?: string
          p_invitee_email: string
          p_org_level?: string
          p_organization_id: string
          p_required_instrument_id?: string
          p_session_id: string
          p_supervisor_email?: string
        }
        Returns: {
          code: string
          expires_at: string
          invitation_id: string
        }[]
      }
      admin_invitation_revoke: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      admin_list_coach_free_pool: {
        Args: { p_coach_user_id: string }
        Returns: {
          balance: number
          instrument_id: string
        }[]
      }
      admin_list_coach_free_report_pool: {
        Args: { p_coach_user_id: string }
        Returns: Json
      }
      admin_list_report_grantees: {
        Args: { p_report_id: string; p_report_type: string }
        Returns: {
          coach_user_id: string
          email: string
          full_name: string
          granted_at: string
          granted_by: string
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
      admin_reassign_attendee: {
        Args: {
          p_from_event_id: string
          p_to_event_id: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_remove_org_custom_domain: {
        Args: { p_hostname: string; p_reason?: string }
        Returns: Json
      }
      admin_reschedule_cohort_event: {
        Args: {
          p_ends_at: string
          p_event_id: string
          p_starts_at: string
          p_timezone?: string
        }
        Returns: Json
      }
      admin_reset_user_mfa: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: Json
      }
      admin_revoke_activation_link: {
        Args: { p_user_id: string }
        Returns: number
      }
      admin_revoke_company_admin: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      admin_revoke_report_access: {
        Args: {
          p_coach_user_id: string
          p_reason: string
          p_report_id: string
          p_report_type: string
        }
        Returns: Json
      }
      admin_search_coaches: {
        Args: { p_query: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      admin_set_org_branding: {
        Args: {
          p_accent_color: string
          p_logo_path: string
          p_organization_id: string
          p_primary_color: string
          p_reason: string
        }
        Returns: Json
      }
      admin_set_org_custom_domain: {
        Args: {
          p_hostname: string
          p_is_primary?: boolean
          p_is_verified?: boolean
          p_kind?: string
          p_organization_id: string
          p_reason?: string
        }
        Returns: Json
      }
      admin_upsert_cohort: {
        Args: {
          p_certification_path_id: string
          p_description: string
          p_ends_at: string
          p_enrollment_closes_at: string
          p_enrollment_opens_at: string
          p_id: string
          p_max_capacity: number
          p_name: string
          p_practitioner_competency_url?: string
          p_practitioner_email?: string
          p_practitioner_name?: string
          p_practitioner_ptp_debrief_url?: string
          p_practitioner_scheduling_url?: string
          p_starts_at: string
          p_status: string
          p_welcome_attachment_url: string
        }
        Returns: string
      }
      admin_upsert_cohort_event: {
        Args: {
          p_cohort_id: string
          p_description: string
          p_ends_at: string
          p_id: string
          p_is_published: boolean
          p_sequence_no: number
          p_starts_at: string
          p_teams_join_url: string
          p_timezone: string
          p_title: string
        }
        Returns: string
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
      archive_learning_folder: {
        Args: { p_folder_id: string; p_reason: string }
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
      archive_resource_folder: {
        Args: { p_folder_id: string; p_reason: string }
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
      assert_module_entitled: { Args: { p_module: string }; Returns: undefined }
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
      bdo_active_definition: {
        Args: never
        Returns: {
          created_at: string
          form_spec: Json
          id: string
          interview_prompt: string
          interview_seed: Json
          is_active: boolean
          notes: string | null
          plan_prompt: string
          probe_rules: Json
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "bdo_definition"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bdo_context: {
        Args: { p_day_plan_id: string; p_user_id: string }
        Returns: Json
      }
      bdo_has_ptp: { Args: { p_user_id?: string }; Returns: boolean }
      bdo_move_item: {
        Args: { p_item_id: string; p_to_date: string }
        Returns: Json
      }
      bdo_save_form: {
        Args: { p_day_plan_id: string; p_form: Json }
        Returns: undefined
      }
      bdo_set_item_status: {
        Args: { p_item_id: string; p_status: string }
        Returns: undefined
      }
      bdo_set_typed_items: {
        Args: { p_day_plan_id: string; p_titles: Json }
        Returns: Json
      }
      bdo_spend: {
        Args: { p_day_plan_id: string; p_kind: string }
        Returns: Json
      }
      bdo_start_today: { Args: { p_plan_date?: string }; Returns: Json }
      bulk_coach_invitation_create: {
        Args: {
          p_preferred_first_context?: string
          p_results_released?: boolean
          p_rows: Json
        }
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
        Args: {
          p_organization_id: string
          p_required_instrument_id?: string
          p_rows: Json
        }
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
      bw_360_add_plan_items: {
        Args: { p_cycle: string; p_items: Json }
        Returns: Json
      }
      bw_360_add_rater: {
        Args: {
          p_cycle: string
          p_email: string
          p_full_name: string
          p_phone?: string
          p_relationship?: string
          p_role?: string
        }
        Returns: Json
      }
      bw_360_admin_grant_credits: {
        Args: { p_amount: number; p_reason?: string; p_user: string }
        Returns: Json
      }
      bw_360_can_read_summary: { Args: { p_cycle: string }; Returns: boolean }
      bw_360_claim_invite: { Args: { p_token: string }; Returns: Json }
      bw_360_cycle_subject: { Args: { p_cycle: string }; Returns: string }
      bw_360_email_escape: { Args: { p_text: string }; Returns: string }
      bw_360_followup_context: {
        Args: { p_question_key: string; p_submission: string }
        Returns: Json
      }
      bw_360_followup_store: {
        Args: { p_prompt: string; p_question_key: string; p_submission: string }
        Returns: Json
      }
      bw_360_grant_entry_credits: {
        Args: { p_source: string; p_user: string }
        Returns: number
      }
      bw_360_invitation_html: {
        Args: {
          p_due?: string
          p_expires: string
          p_invitee_first: string
          p_reminder?: boolean
          p_subject_first: string
          p_subject_full: string
          p_url: string
        }
        Returns: string
      }
      bw_360_invite_public_info: { Args: { p_token: string }; Returns: Json }
      bw_360_is_coach_of: {
        Args: { p_subject: string; p_user?: string }
        Returns: boolean
      }
      bw_360_is_my_submission: {
        Args: { p_submission: string }
        Returns: boolean
      }
      bw_360_mint_rater_token: { Args: { p_rater: string }; Returns: string }
      bw_360_my_credits: { Args: never; Returns: Json }
      bw_360_my_rater_tasks: { Args: never; Returns: Json }
      bw_360_open_cycle: { Args: { p_cycle: string }; Returns: Json }
      bw_360_progress: { Args: { p_cycle: string }; Returns: Json }
      bw_360_publish_to_coaching: { Args: { p_cycle: string }; Returns: Json }
      bw_360_question_set: {
        Args: { p_submission: string }
        Returns: {
          ai_followup: boolean
          answer_type: string
          focus: string
          ordinal: number
          prompt: string
          question_key: string
          scale_max: number
          scale_max_label: string
          scale_min: number
          scale_min_label: string
          section: string
        }[]
      }
      bw_360_rater_list: {
        Args: { p_cycle: string }
        Returns: {
          email: string
          full_name: string
          invited_at: string
          phone: string
          rater_id: string
          relationship: string
          revoked_at: string
          role: string
        }[]
      }
      bw_360_revoke_rater: { Args: { p_rater: string }; Returns: Json }
      bw_360_run_due_summaries: {
        Args: { p_dry_run?: boolean; p_max_attempts?: number }
        Returns: Json
      }
      bw_360_run_reminders: { Args: { p_dry_run?: boolean }; Returns: Json }
      bw_360_save_answer: {
        Args: {
          p_answer: Json
          p_followup?: Json
          p_question_key: string
          p_submission: string
        }
        Returns: Json
      }
      bw_360_send_invitations: {
        Args: {
          p_cycle: string
          p_reminder?: boolean
          p_resend?: boolean
          p_respect_cadence?: boolean
        }
        Returns: Json
      }
      bw_360_start_cycle: { Args: never; Returns: Json }
      bw_360_submit: { Args: { p_submission: string }; Returns: Json }
      bw_360_summary_questions: {
        Args: { p_cycle: string }
        Returns: {
          answer_type: string
          focus: string
          ordinal: number
          prompt: string
          question_key: string
          section: string
        }[]
      }
      bw_add_diagnostic_evidence: {
        Args: {
          p_body?: string
          p_kind: string
          p_route?: string
          p_storage_path?: string
          p_ticket_id?: string
        }
        Returns: Json
      }
      bw_admin_apply_content_change: {
        Args: {
          p_column: string
          p_id: string
          p_json_path?: string[]
          p_new_value: Json
          p_note?: string
          p_table: string
          p_ticket_id?: string
        }
        Returns: Json
      }
      bw_admin_change_allowed_tables: { Args: never; Returns: string[] }
      bw_admin_read_function_source: {
        Args: { p_name: string; p_part?: number }
        Returns: Json
      }
      bw_admin_read_sql: {
        Args: { p_limit?: number; p_sql: string }
        Returns: Json
      }
      bw_admin_revert_execution: {
        Args: { p_execution_id: string }
        Returns: Json
      }
      bw_admin_schema_digest: { Args: { p_table_like?: string }; Returns: Json }
      bw_agent_classify_report: {
        Args: { p_kind: string; p_reason?: string; p_ticket_id: string }
        Returns: Json
      }
      bw_agent_close_invite_ticket: {
        Args: { p_coach_client_id: string; p_ticket_id: string }
        Returns: Json
      }
      bw_agent_failure_evidence: {
        Args: { p_ticket_id: string }
        Returns: Json
      }
      bw_agent_invite_followups: {
        Args: { p_dry_run?: boolean; p_limit?: number }
        Returns: Json
      }
      bw_agent_next_tickets: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          detail: Json
          id: string
          last_touched_at: string
          origin: string
          severity: string
          status: string
          subject_email: string
          subject_ref: string
          subject_user_id: string
          ticket_type: string
          title: string
        }[]
      }
      bw_agent_notify_practitioner: {
        Args: { p_coach_client_id: string; p_ticket_id?: string }
        Returns: Json
      }
      bw_agent_post_user_reply: {
        Args: {
          p_body: string
          p_note?: string
          p_resolve?: boolean
          p_ticket_id: string
        }
        Returns: Json
      }
      bw_agent_proposal_decide: {
        Args: {
          p_adjustment?: string
          p_decision: string
          p_token: string
          p_via?: string
        }
        Returns: Json
      }
      bw_agent_proposal_peek: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          id: string
          impact: string
          instructions: string
          kind: string
          rationale: string
          remedy_kind: string
          reversal: string
          risk: string
          status: string
          ticket_title: string
          title: string
        }[]
      }
      bw_agent_proposal_token: {
        Args: { p_proposal_id: string }
        Returns: string
      }
      bw_agent_propose: {
        Args: {
          p_impact: string
          p_kind: string
          p_proposed_change?: Json
          p_rationale: string
          p_reversal: string
          p_risk: string
          p_ticket_id?: string
          p_title: string
        }
        Returns: {
          proposal_id: string
          token: string
        }[]
      }
      bw_agent_resend_client_invitation: {
        Args: {
          p_coach_client_id: string
          p_dry_run?: boolean
          p_ticket_id?: string
        }
        Returns: Json
      }
      bw_agent_revoke_unclaimed_invite: {
        Args: {
          p_coach_client_id: string
          p_force?: boolean
          p_ticket_id?: string
        }
        Returns: Json
      }
      bw_agent_user_report_context: {
        Args: { p_ticket_id: string }
        Returns: Json
      }
      bw_agent_weekly_room: {
        Args: { p_action_code: string; p_per_week?: number }
        Returns: boolean
      }
      bw_all_subjects_consent: {
        Args: { p_audience: string; p_subject_ids: string[] }
        Returns: boolean
      }
      bw_am_i_super_admin: { Args: never; Returns: boolean }
      bw_api_client_create: {
        Args: {
          p_name: string
          p_organization_id?: string
          p_rate_limit_per_min?: number
          p_scopes?: string[]
        }
        Returns: {
          api_client_id: string
          api_key: string
          key_prefix: string
        }[]
      }
      bw_api_client_revoke: {
        Args: { p_api_client_id: string }
        Returns: undefined
      }
      bw_apply_agent_proposals: { Args: { p_limit?: number }; Returns: Json }
      bw_archive_report: {
        Args: { p_id: string; p_kind: string; p_reason: string }
        Returns: Json
      }
      bw_assets_due_for_archive_batch: {
        Args: { p_limit?: number }
        Returns: {
          archive_reason: string
          archived_at: string
          asset_id: string
          bucket: string
          is_library_asset: boolean
          library_name: string
          mime_type: string
          original_filename: string
          orphan_records: number
          path: string
          size_bytes: number
          total_due: number
        }[]
      }
      bw_can_generate_paired: {
        Args: { p_a: string; p_b: string; p_caller: string; p_mode: string }
        Returns: boolean
      }
      bw_can_generate_profile_for: {
        Args: { p_caller: string; p_subject: string }
        Returns: boolean
      }
      bw_can_generate_team: {
        Args: { p_caller: string; p_subjects: string[] }
        Returns: boolean
      }
      bw_can_read_paired_profile: {
        Args: { p_profile: string }
        Returns: boolean
      }
      bw_can_read_ptp_result: {
        Args: { p_result_id: string }
        Returns: boolean
      }
      bw_can_read_relationship: {
        Args: { p_relationship: string }
        Returns: boolean
      }
      bw_can_read_team_profile: {
        Args: { p_profile: string }
        Returns: boolean
      }
      bw_can_see_leadership_content: {
        Args: { p_kind: string; p_profile: string }
        Returns: boolean
      }
      bw_check_agent_liveness: { Args: never; Returns: Json }
      bw_check_watchdogs: { Args: never; Returns: number }
      bw_close_exhausted_invite_tickets: {
        Args: { p_limit?: number }
        Returns: Json
      }
      bw_coach_can_access_my_relationship: { Args: never; Returns: boolean }
      bw_coach_client_coaching: {
        Args: { p_client_user_id: string }
        Returns: {
          activity_code: string
          activity_id: string
          activity_title: string
          completed_at: string
          module_group: string
          note_body: string
          note_updated_at: string
          responses: Json
          run_number: number
          session_id: string
          session_status: string
          started_at: string
          tier: string
          visibility: string
        }[]
      }
      bw_coach_winback_unsubscribe: {
        Args: { p_token: string }
        Returns: boolean
      }
      bw_coaching_extract_coverage: {
        Args: never
        Returns: {
          extract_rows: number
          newest_extract: string
          oldest_extract: string
          rows_missing_vector: number
          sessions_extracted: number
          sessions_with_content: number
        }[]
      }
      bw_coaching_note_save: {
        Args: { p_body: string; p_session_id: string }
        Returns: {
          activity_id: string
          body: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "coaching_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bw_digest_proposal_blocks: { Args: never; Returns: string }
      bw_digest_user_report_blocks: { Args: never; Returns: string }
      bw_expire_agent_proposals: { Args: never; Returns: number }
      bw_failure_fingerprint: {
        Args: { p_label: string; p_message: string }
        Returns: string
      }
      bw_fire_paired_narrative: {
        Args: { p_profile: string; p_section: string }
        Returns: number
      }
      bw_fire_ptp_section: {
        Args: { p_context: string; p_result: string; p_section: string }
        Returns: number
      }
      bw_fire_team_narrative: {
        Args: { p_profile: string; p_section: string }
        Returns: number
      }
      bw_fire_walkthrough: { Args: { p_body: Json }; Returns: number }
      bw_get_active_price: {
        Args: { p_billing_period?: string; p_tier: string }
        Returns: {
          amount_cents: number
          price_usd: number
          stripe_price_id: string
        }[]
      }
      bw_get_ms_graph_secret: { Args: never; Returns: string }
      bw_get_my_coach_settings: {
        Args: never
        Returns: {
          walkthrough_default: boolean
        }[]
      }
      bw_get_my_plan_status: {
        Args: never
        Returns: {
          account_type: string
          ai_coaching_limit: number
          audience: string
          catalogue_tier: string
          display_name: string
          free_days_remaining: number
          free_until: string
          has_stripe_subscription: boolean
          is_billing_exempt: boolean
          one_time_chat_credits: number
          subscription_status: string
        }[]
      }
      bw_get_plan_block_feedback: {
        Args: { p_session_id: string }
        Returns: {
          block_index: number
          verdict: string
        }[]
      }
      bw_has_product: {
        Args: { p_tier: string; p_user: string }
        Returns: boolean
      }
      bw_has_shared_credit: { Args: { p_user: string }; Returns: boolean }
      bw_help_roles_for_user: {
        Args: { p_user_id?: string }
        Returns: string[]
      }
      bw_is_relationship_member: {
        Args: { p_relationship: string; p_user?: string }
        Returns: boolean
      }
      bw_is_relationship_practitioner: {
        Args: { p_relationship: string; p_user?: string }
        Returns: boolean
      }
      bw_is_team_leader_of: { Args: { p_member: string }; Returns: boolean }
      bw_learning_note_save: {
        Args: { p_body: string; p_content_item_id: string }
        Returns: {
          body: string
          content_item_id: string
          created_at: string
          id: string
          shared_at: string | null
          shared_with_user_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "learning_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bw_learning_note_set_share: {
        Args: { p_content_item_id: string; p_share: boolean }
        Returns: {
          body: string
          content_item_id: string
          is_shared: boolean
          note_id: string
          shared_at: string
          shared_with_name: string
          updated_at: string
        }[]
      }
      bw_list_my_report_orders: {
        Args: never
        Returns: {
          amount_cents: number
          client_email: string
          created_at: string
          order_id: string
          order_type: string
          payer: string
          relationship_mode: string
          release_now: boolean
          report_label: string
          status: string
          subject_count: number
          subject_names: string
        }[]
      }
      bw_list_my_reports: {
        Args: never
        Returns: {
          archive_reason: string
          archived_at: string
          can_archive: boolean
          computed_at: string
          kind: string
          member_count: number
          narrative_status: string
          relationship_mode: string
          released_to_subjects: boolean
          report_id: string
          subjects: string
        }[]
      }
      bw_list_open_cohorts: {
        Args: never
        Returns: {
          cohort_id: string
          description: string
          ends_at: string
          enrollment_closes_at: string
          enrollment_opens_at: string
          max_capacity: number
          name: string
          seats_left: number
          seats_taken: number
          sessions: Json
          starts_at: string
        }[]
      }
      bw_list_report_subjects: {
        Args: { p_search?: string }
        Returns: {
          full_name: string
          last_completed_at: string
          organization_id: string
          user_id: string
        }[]
      }
      bw_list_team_payer_candidates: {
        Args: { p_subject_user_ids: string[] }
        Returns: {
          full_name: string
          has_email: boolean
          is_subject: boolean
          user_id: string
        }[]
      }
      bw_match_case: {
        Args: { p_original: string; p_replacement: string }
        Returns: string
      }
      bw_match_help_chunks: {
        Args: {
          p_limit?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_roles?: string[]
        }
        Returns: {
          content: string
          grain: string
          guide_id: string
          guide_summary: string
          guide_title: string
          role: string
          similarity: number
          step_index: number
          step_title: string
        }[]
      }
      bw_match_ticket_learnings: {
        Args: {
          p_limit?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_ticket_type?: string
        }
        Returns: {
          resolution: string
          similarity: number
          source_kind: string
          ticket_type: string
          title: string
        }[]
      }
      bw_my_coaching_notes: {
        Args: never
        Returns: {
          activity_code: string
          activity_id: string
          activity_title: string
          body: string
          coach_visible: boolean
          created_at: string
          module_group: string
          note_id: string
          run_number: number
          session_id: string
          session_status: string
          tier: string
          updated_at: string
        }[]
      }
      bw_my_learning_notes: {
        Args: never
        Returns: {
          body: string
          certification_path_id: string
          certification_path_name: string
          content_item_id: string
          content_item_title: string
          created_at: string
          curriculum_id: string
          curriculum_name: string
          is_shared: boolean
          item_archived: boolean
          item_type: string
          module_id: string
          module_name: string
          note_id: string
          shared_at: string
          updated_at: string
        }[]
      }
      bw_my_reports: {
        Args: never
        Returns: {
          created_at: string
          id: string
          last_message_at: string
          resolved_at: string
          status: string
          title: string
          unread_from_us: boolean
        }[]
      }
      bw_normalize_house_style: { Args: { p_text: string }; Returns: string }
      bw_normalize_house_style_jsonb: { Args: { p: Json }; Returns: Json }
      bw_or_tsquery: { Args: { p_text: string }; Returns: unknown }
      bw_paired_profile_subjects: {
        Args: { p_profile: string }
        Returns: {
          full_name: string
          pair_role: string
        }[]
      }
      bw_post_report_message: {
        Args: { p_body: string; p_ticket_id: string }
        Returns: Json
      }
      bw_product_opened_at: {
        Args: { p_tier: string; p_user: string }
        Returns: string
      }
      bw_ptp_driving_facets: {
        Args: { p_context?: string; p_result: string }
        Returns: {
          context_type: string
          dimension_id: string
          facet_name: string
          item_number: number
          rank: number
          side: string
          value: number
        }[]
      }
      bw_ptp_generation_tick: {
        Args: {
          p_cutoff?: string
          p_dry_run?: boolean
          p_max_reports?: number
          p_max_units_per_report?: number
          p_min_age?: string
          p_only?: string
        }
        Returns: {
          o_action: string
          o_detail: Json
          o_dispatched: boolean
          o_result_id: string
          o_unit: string
        }[]
      }
      bw_ptp_report_state: {
        Args: { p_result_id?: string }
        Returns: {
          ai_narrative_done: boolean
          assessment_result_id: string
          context_type: string
          contexts_expected: string[]
          created_at: string
          facets_done: boolean
          facets_stored: number
          facets_total: number
          narrative_status: string
          next_facet_batch: number
          onepagers_present: number
          path_kind: string
          report_complete: boolean
          units_done: string[]
          units_expected: string[]
          units_todo: string[]
          user_id: string
          wedged_contexts: string[]
        }[]
      }
      bw_purge_api_request_log: { Args: never; Returns: number }
      bw_purge_http_request_labels: { Args: never; Returns: number }
      bw_raise_tickets_from_client_errors: {
        Args: {
          p_min_occurrences?: number
          p_min_users?: number
          p_window?: string
        }
        Returns: number
      }
      bw_raise_tickets_from_server_failures: { Args: never; Returns: number }
      bw_recent_diagnostic_evidence: {
        Args: { p_minutes?: number }
        Returns: Json
      }
      bw_recommend_next_activities: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_session_id: string
        }
        Returns: {
          activity_id: string
          allowed: boolean
          because_context: string
          because_key: string
          because_snippet: string
          because_source: string
          code: string
          description: string
          module_group: string
          reason: string
          similarity: number
          thumbnail_url: string
          tier: string
          title: string
        }[]
      }
      bw_record_function_failure: {
        Args: {
          p_detail?: Json
          p_label: string
          p_message: string
          p_route?: string
          p_user_id?: string
        }
        Returns: Json
      }
      bw_record_lovable_prompt: {
        Args: {
          p_files_cited?: string[]
          p_prompt: string
          p_ticket_id?: string
          p_title: string
        }
        Returns: Json
      }
      bw_relationship_pair_role: {
        Args: { p_relationship: string; p_user?: string }
        Returns: string
      }
      bw_relationship_partner: {
        Args: { p_relationship: string; p_user?: string }
        Returns: string
      }
      bw_report_issue: {
        Args: { p_body: string; p_context?: Json; p_route?: string }
        Returns: Json
      }
      bw_report_outcome_to_user: {
        Args: { p_outcome: string; p_ticket_id: string }
        Returns: boolean
      }
      bw_report_thread: {
        Args: { p_ticket_id: string }
        Returns: {
          author_kind: string
          body: string
          created_at: string
        }[]
      }
      bw_resolve_model: { Args: { p_role: string }; Returns: string }
      bw_resolve_price_entitlement: {
        Args: { p_stripe_price_id: string }
        Returns: {
          ai_coaching_limit: number
          audience: string
          entitlement_tier: string
          tier: string
        }[]
      }
      bw_restore_report: {
        Args: { p_id: string; p_kind: string }
        Returns: Json
      }
      bw_run_ticket_agent: {
        Args: { p_dry_run?: boolean; p_ticket_id?: string }
        Returns: number
      }
      bw_run_user_report_agent: {
        Args: { p_dry_run?: boolean; p_ticket_id?: string }
        Returns: number
      }
      bw_scan_platform_tickets: { Args: never; Returns: Json }
      bw_scheduled_actor: { Args: never; Returns: string }
      bw_send_agent_digest: { Args: never; Returns: Json }
      bw_set_client_walkthrough: {
        Args: { p_client_email: string; p_enabled: boolean }
        Returns: number
      }
      bw_set_coach_comp: {
        Args: { p_coach: string; p_comped: boolean; p_reason?: string }
        Returns: Json
      }
      bw_set_lifecycle_email_opt_out: {
        Args: { p_opt_out: boolean }
        Returns: boolean
      }
      bw_set_my_walkthrough_default: {
        Args: { p_enabled: boolean }
        Returns: boolean
      }
      bw_set_plan_block_feedback: {
        Args: { p_block_index: number; p_session_id: string; p_verdict: string }
        Returns: Json
      }
      bw_set_report_label: {
        Args: { p_label: string; p_profile: string }
        Returns: undefined
      }
      bw_set_report_release: {
        Args: { p_kind: string; p_profile: string; p_released: boolean }
        Returns: undefined
      }
      bw_sweep_server_failures: { Args: never; Returns: number }
      bw_sync_event_teams_meeting: {
        Args: { p_action?: string; p_event_id: string }
        Returns: undefined
      }
      bw_team_profile_distribution: {
        Args: { p_profile: string }
        Returns: {
          item_number: number
          scores: number[]
        }[]
      }
      bw_ticket_action_within_cap: {
        Args: {
          p_action_code: string
          p_max_total: number
          p_min_interval: string
          p_subject_ref: string
        }
        Returns: boolean
      }
      bw_ticket_agent_acknowledge: {
        Args: { p_ticket_id: string }
        Returns: boolean
      }
      bw_ticket_agent_resolve_diagnostic: {
        Args: { p_note: string; p_ticket_id: string }
        Returns: boolean
      }
      bw_ticket_learning_queue: {
        Args: { p_limit?: number }
        Returns: {
          content: string
          facts: Json
          resolution: string
          source_kind: string
          ticket_id: string
          ticket_type: string
          title: string
        }[]
      }
      bw_ticket_learning_store: {
        Args: {
          p_content: string
          p_embedding: string
          p_facts: Json
          p_resolution: string
          p_source_kind?: string
          p_ticket_id: string
          p_ticket_type: string
          p_title: string
        }
        Returns: string
      }
      bw_ticket_post_message: {
        Args: {
          p_author_kind?: string
          p_body: string
          p_is_internal?: boolean
          p_ticket_id: string
        }
        Returns: {
          author_kind: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        SetofOptions: {
          from: "*"
          to: "platform_ticket_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bw_ticket_record_action: {
        Args: {
          p_action_code: string
          p_detail?: Json
          p_outcome: string
          p_reversal_hint?: string
          p_subject_ref?: string
          p_ticket_id: string
          p_ticket_type: string
        }
        Returns: string
      }
      bw_verify_ticket_learnings: { Args: never; Returns: Json }
      bw_walkthrough_active_definition: {
        Args: never
        Returns: {
          steps: Json
          system_prompt: string
          version: number
        }[]
      }
      bw_walkthrough_allowed: { Args: { p_result: string }; Returns: boolean }
      bw_walkthrough_close: {
        Args: { p_session: string; p_status?: string }
        Returns: string
      }
      bw_walkthrough_decline: { Args: { p_result: string }; Returns: number }
      bw_walkthrough_save: {
        Args: { p_patch?: Json; p_session: string; p_step: string }
        Returns: Json
      }
      bw_walkthrough_spend: { Args: { p_session: string }; Returns: number }
      bw_walkthrough_start: {
        Args: { p_context?: string; p_result: string }
        Returns: {
          exchange_budget: number
          funding: string
          outcome_at_offer: string
          run_number: number
          session_id: string
        }[]
      }
      bw_walkthrough_step_sections: { Args: never; Returns: Json }
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
      certification_display_name: {
        Args: { p_certification_type: string }
        Returns: string
      }
      check_mfa_freshness: {
        Args: { p_max_age_seconds?: number; p_session_id: string }
        Returns: boolean
      }
      check_trusted_device: { Args: { p_token: string }; Returns: boolean }
      check_trusted_device_for_impersonation: {
        Args: { p_token: string }
        Returns: boolean
      }
      claim_content_item_ai_assist: {
        Args: { p_content_item_id: string }
        Returns: Json
      }
      claim_report_order: { Args: { p_order_id: string }; Returns: Json }
      close_chat_session: { Args: { p_session_id: string }; Returns: undefined }
      coach_bulk_link_claim: {
        Args: { p_token: string }
        Returns: {
          already_claimed: boolean
          coach_client_id: string
          coach_user_id: string
          instrument_id: string
        }[]
      }
      coach_bulk_link_create: {
        Args: {
          p_coach_note: string
          p_instrument_id: string
          p_preferred_first_context?: string
          p_results_released?: boolean
          p_seats: number
          p_walkthrough_enabled?: boolean
        }
        Returns: {
          link_id: string
          seats: number
          token: string
          total_amount: number
        }[]
      }
      coach_bulk_link_public_info: {
        Args: { p_token: string }
        Returns: {
          coach_name: string
          instrument_name: string
          reason: string
          seats_remaining: number
          valid: boolean
        }[]
      }
      coach_client_claim: {
        Args: { p_token: string }
        Returns: {
          out_already_claimed: boolean
          out_coach_client_id: string
          out_coach_user_id: string
          out_duplicate_self_purchase: boolean
          out_instrument_code: string
          out_instrument_id: string
          out_invitation_status: string
          out_linked_existing_assessment: boolean
          out_sibling_rows_claimed: number
        }[]
      }
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
      coach_list_org_members: {
        Args: never
        Returns: {
          email: string
          full_name: string
          member_user_id: string
          organization_id: string
          organization_name: string
        }[]
      }
      coach_shareable_link_coach_paid: {
        Args: {
          p_client_email: string
          p_client_first_name: string
          p_client_last_name: string
          p_coach_note: string
          p_instrument_ids: string[]
          p_preferred_first_context?: string
          p_results_released?: boolean
          p_walkthrough_enabled?: boolean
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
          p_coach_note: string
          p_instrument_ids: string[]
          p_preferred_first_context?: string
          p_walkthrough_enabled?: boolean
        }
        Returns: {
          coach_client_id: string
          expires_at: string
          instrument_id: string
        }[]
      }
      coaching_activity_access: {
        Args: { p_activity_id: string }
        Returns: {
          activity_tier: string
          allowed: boolean
          reason: string
        }[]
      }
      coaching_activity_access_batch: {
        Args: never
        Returns: {
          activity_id: string
          activity_tier: string
          allowed: boolean
          reason: string
        }[]
      }
      coaching_activity_run_state: {
        Args: { p_activity_id: string }
        Returns: {
          activity_tier: string
          allowed: boolean
          latest_completed_session_id: string
          locked: boolean
          reason: string
        }[]
      }
      coaching_current_run: { Args: never; Returns: number }
      coaching_fresh_start_rotate: {
        Args: { p_baseline: Json; p_user: string }
        Returns: number
      }
      coaching_get_run_state: { Args: never; Returns: Json }
      coaching_group_access: {
        Args: never
        Returns: {
          accessible: boolean
          has_completed: boolean
          module_group: string
        }[]
      }
      coaching_has_full_access: { Args: never; Returns: boolean }
      coaching_session_save: {
        Args: { p_current_step: number; p_patch: Json; p_session_id: string }
        Returns: undefined
      }
      coaching_usage_check_and_consume: {
        Args: { p_check_only?: boolean; p_user: string }
        Returns: {
          allowed: boolean
          limit_val: number
          reason: string
          remaining: number
          source: string
        }[]
      }
      cohort_email_queue: {
        Args: never
        Returns: {
          cohort_id: string
          cohort_name: string
          email: string
          event_id: string
          kind: string
          payload: Json
          user_id: string
          welcome_attachment_url: string
        }[]
      }
      cohort_mark_cohort_invites_sent: {
        Args: { p_cohort_id: string; p_user: string }
        Returns: undefined
      }
      cohort_mark_invite_sent: {
        Args: { p_event_id: string; p_user: string }
        Returns: undefined
      }
      cohort_record_email_send: {
        Args: {
          p_cohort_id: string
          p_event_id: string
          p_template_type: string
          p_user: string
        }
        Returns: boolean
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
      complete_report_order: {
        Args: { p_order_id: string; p_profile_id: string }
        Returns: boolean
      }
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
      consume_one_time_coaching_credit: {
        Args: { p_user: string }
        Returns: number
      }
      consume_shared_ai_credit: { Args: { p_user: string }; Returns: number }
      consume_three_sixty_credit: { Args: { p_user: string }; Returns: number }
      contract_effective_annual_value: {
        Args: { p_org: string }
        Returns: {
          basis: string
          contract_total: number
          effective_price_per_user: number
          seat_count: number
        }[]
      }
      contract_upsert: {
        Args: {
          p_ai_chat_enabled_override?: boolean
          p_contract_total_annual_override?: number
          p_dashboard_access_level_override?: string
          p_data_retention_mode: string
          p_end_date: string
          p_instruments_included_override?: Json
          p_monthly_ai_pulls_allowance_override?: number
          p_monthly_chat_allowance_per_user_override?: number
          p_monthly_coaching_query_allowance_override?: number
          p_notes: string
          p_organization_id: string
          p_paired_reports_included_qty?: number
          p_paired_reports_unlimited?: boolean
          p_price_per_user_annual_override?: number
          p_seat_count: number
          p_start_date: string
          p_team_reports_included_qty?: number
          p_team_reports_unlimited?: boolean
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
      corporate_invitation_record_reminder: {
        Args: { p_invitation_id: string; p_stage: string }
        Returns: undefined
      }
      corporate_invitation_reminder_scan: {
        Args: never
        Returns: {
          code: string
          expires_at: string
          instrument_id: string
          instrument_name: string
          invitation_id: string
          invitee_email: string
          organization_name: string
          stage: string
        }[]
      }
      create_actor_debrief_order: {
        Args: {
          p_actor_email: string
          p_actor_first_name: string
          p_certification_id: string
          p_coach_note: string
          p_email_html: string
          p_preferred_first_context?: string
          p_results_released: boolean
          p_walkthrough_enabled?: boolean
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
      create_free_client_order: {
        Args: {
          p_client_email: string
          p_client_first_name: string
          p_client_last_name: string
          p_coach_note: string
          p_instrument_ids: string[]
          p_preferred_first_context?: string
          p_results_released: boolean
          p_walkthrough_enabled?: boolean
        }
        Returns: Json
      }
      create_lesson_embed_video_content_item: {
        Args: {
          p_lesson_content_item_id: string
          p_reason: string
          p_title: string
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
      create_report_order: {
        Args: {
          p_client_user_id?: string
          p_instrument_id?: string
          p_order_type: string
          p_payer?: string
          p_relationship_mode?: string
          p_release_now?: boolean
          p_report_label?: string
          p_subject_user_ids: string[]
          p_team_id?: string
          p_use_pool?: boolean
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
      current_user_can_see_privileged_sections: {
        Args: never
        Returns: boolean
      }
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
      direct_ptp_share_visible: {
        Args: { p_owner_user_id: string; p_viewer_user_id: string }
        Returns: boolean
      }
      discard_lesson_block_draft: {
        Args: { p_content_item_id: string }
        Returns: Json
      }
      dp_add_comment: {
        Args: { p_body: string; p_item_id: string }
        Returns: string
      }
      dp_add_entry: {
        Args: {
          p_entry_date?: string
          p_item_id: string
          p_metric_label?: string
          p_metric_value?: number
          p_note?: string
          p_progress_pct?: number
        }
        Returns: string
      }
      dp_add_items_from_coaching: { Args: { p_items: Json }; Returns: Json }
      dp_add_items_from_ptp: { Args: { p_items: Json }; Returns: Json }
      dp_archive_item: {
        Args: { p_archived?: boolean; p_item_id: string }
        Returns: Json
      }
      dp_coach_can_view: {
        Args: { p_client: string; p_coach: string }
        Returns: boolean
      }
      dp_create_custom_item: {
        Args: {
          p_action_text: string
          p_dimension_tags?: string[]
          p_target_date?: string
        }
        Returns: string
      }
      dp_delete_comment: { Args: { p_comment_id: string }; Returns: Json }
      dp_delete_entry: { Args: { p_entry_id: string }; Returns: Json }
      dp_edit_comment: {
        Args: { p_body: string; p_comment_id: string }
        Returns: Json
      }
      dp_get_client_plan: { Args: { p_client_user_id: string }; Returns: Json }
      dp_is_active_coach_of: {
        Args: { p_client: string; p_coach: string }
        Returns: boolean
      }
      dp_list_my_coaches: { Args: never; Returns: Json }
      dp_list_my_coaching: { Args: never; Returns: Json }
      dp_list_my_plan: { Args: { p_include_archived?: boolean }; Returns: Json }
      dp_list_my_report_commitments: {
        Args: { p_kind: string }
        Returns: {
          action_text: string
          card_title: string
          created_at: string
          dimension_tags: string[]
          id: string
          progress_pct: number
          source_report_id: string
          status: string
          target_date: string
        }[]
      }
      dp_notify_shared_coaches: {
        Args: {
          p_client: string
          p_dedup_key?: string
          p_payload: Json
          p_type: string
        }
        Returns: undefined
      }
      dp_progress_nudge_body: { Args: { p_payload: Json }; Returns: string }
      dp_run_due_date_scan: { Args: never; Returns: Json }
      dp_run_progress_nudge: {
        Args: {
          p_dormant_days?: number
          p_dry_run?: boolean
          p_force?: boolean
          p_min_gap_days?: number
          p_stale_days?: number
        }
        Returns: Json
      }
      dp_set_coach_share: {
        Args: { p_coach_user_id: string; p_enabled: boolean }
        Returns: Json
      }
      dp_update_entry: {
        Args: { p_entry_id: string; p_payload: Json }
        Returns: Json
      }
      dp_update_item: {
        Args: { p_item_id: string; p_payload: Json }
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
      enroll_certification: {
        Args: { p_cohort_id: string; p_payment_ref?: string; p_user_id: string }
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
      get_applicable_report_coupon: {
        Args: {
          p_caller_user_id: string
          p_promo_code?: string
          p_report_type: string
        }
        Returns: {
          out_coupon_id: string
          out_internal_name: string
          out_percent_off: number
          out_stripe_coupon_id: string
          out_via: string
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
      get_client_360_disclosure_status: { Args: never; Returns: Json }
      get_client_coaching_disclosure_status: { Args: never; Returns: Json }
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
      get_learning_report_detail: {
        Args: {
          p_include_internal?: boolean
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_target_id?: string
          p_target_name?: string
          p_tier?: string
          p_user_ids?: string[]
        }
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
      get_learning_report_summary: {
        Args: {
          p_include_internal?: boolean
          p_target_id?: string
          p_target_name?: string
          p_tier?: string
          p_user_ids?: string[]
        }
        Returns: {
          completion_rate: number
          done: number
          in_progress: number
          not_started: number
          parent_path: string
          revoked: number
          target_id: string
          target_name: string
          tier: string
          total: number
        }[]
      }
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
      get_org_branding_for_current_user: { Args: never; Returns: Json }
      get_org_branding_for_hostname: {
        Args: { p_hostname: string }
        Returns: Json
      }
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
      get_peer_ptp_report: { Args: { p_owner: string }; Returns: Json }
      get_poll_results: { Args: { p_poll_id: string }; Returns: Json }
      get_ptp_leader_workforce_delta: {
        Args: {
          p_organization_id: string
          p_slice_type?: string
          p_slice_value?: string
        }
        Returns: Json
      }
      get_public_certification: {
        Args: { p_certification_id: string }
        Returns: Json
      }
      get_quiz_assets_for_trainee: {
        Args: { p_content_item_id: string; p_user_id?: string }
        Returns: {
          out_asset_id: string
          out_asset_kind: string
          out_bucket: string
          out_mime_type: string
          out_path: string
        }[]
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
      get_resource_video_playback: {
        Args: { p_resource_id: string }
        Returns: {
          out_mux_status: string
          out_playback_id: string
          out_video_source_type: string
        }[]
      }
      get_thumbnail_urls_for_entities: {
        Args: { p_entity_ids: string[]; p_entity_type: string }
        Returns: Json
      }
      get_trusted_device_settings: {
        Args: never
        Returns: {
          enabled: boolean
          impersonation_window_hours: number
          window_days: number
        }[]
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
      grant_free_client_assessments: {
        Args: {
          p_coach_user_id: string
          p_count: number
          p_instrument_id: string
          p_reason: string
        }
        Returns: Json
      }
      grant_free_reports: {
        Args: {
          p_coach_user_id: string
          p_count: number
          p_reason: string
          p_report_type: string
        }
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
      grant_one_time_coaching_credits: {
        Args: {
          p_amount: number
          p_source: string
          p_source_ref: string
          p_user: string
        }
        Returns: number
      }
      grant_shared_ai_credits: {
        Args: {
          p_amount: number
          p_source: string
          p_source_ref: string
          p_user: string
        }
        Returns: number
      }
      grant_three_sixty_credits: {
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
      increment_ai_usage: {
        Args: { p_month_year: string; p_usage_type: string; p_user_id: string }
        Returns: number
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
          p_required_instrument_id?: string
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
      is_org_coach_of_member: {
        Args: { p_coach?: string; p_member: string }
        Returns: boolean
      }
      is_org_coach_of_org: {
        Args: { p_coach?: string; p_org: string }
        Returns: boolean
      }
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
      list_mentor_trainee_client_tracking: {
        Args: never
        Returns: {
          actor_instrument_id: string
          assessment_completed: boolean
          client_email: string
          client_name: string
          client_user_id: string
          coach_client_id: string
          completed_at: string
          debrief_completed: boolean
          invitation_status: string
          invited_at: string
          is_actor: boolean
          trainee_user_id: string
        }[]
      }
      list_mentor_trainee_completions: {
        Args: never
        Returns: {
          instrument_id: string
          last_completed_at: string
          trainee_user_id: string
        }[]
      }
      list_mentor_trainee_notes: {
        Args: { p_trainee_user_id: string }
        Returns: Json
      }
      list_mentor_trainees: { Args: never; Returns: Json }
      list_my_certifications: { Args: never; Returns: Json }
      list_my_ptp_shares: { Args: never; Returns: Json }
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
      list_ptp_shared_with_me: { Args: never; Returns: Json }
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
      list_report_capacity_requests: {
        Args: { p_status?: string }
        Returns: {
          created_at: string
          id: string
          included_qty_at_request: number
          org_name: string
          organization_id: string
          relationship_mode: string
          report_type: string
          requested_by: string
          requested_by_name: string
          resolution_note: string
          resolved_at: string
          resolved_by: string
          status: string
          subject_user_ids: string[]
          used_at_request: number
        }[]
      }
      list_reports_shared_with_me: {
        Args: never
        Returns: {
          computed_at: string
          granted_at: string
          instrument_id: string
          member_count: number
          report_id: string
          report_type: string
          title: string
        }[]
      }
      list_scheduled_assignments: { Args: never; Returns: Json }
      list_trusted_devices: {
        Args: never
        Returns: {
          created_at: string
          id: string
          impersonation_trusted_at: string
          label: string
          last_used_at: string
          login_trusted_at: string
        }[]
      }
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
      log_client_error: {
        Args: {
          p_app_version?: string
          p_error_code?: string
          p_fingerprint: string
          p_message?: string
          p_operation?: string
          p_raw?: Json
          p_route?: string
          p_source: string
          p_user_agent?: string
        }
        Returns: undefined
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
      mark_report_order_paid: {
        Args: {
          p_order_id: string
          p_payment_intent?: string
          p_session_id?: string
        }
        Returns: Json
      }
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
      mint_trusted_device: { Args: { p_label?: string }; Returns: string }
      mk_about_team: {
        Args: never
        Returns: {
          bio: string
          booking_url: string
          credentials: string
          display_name: string
          headline: string
          headshot_bucket: string
          headshot_path: string
          linkedin_url: string
          role_title: string
          short_bio: string
          slug: string
          sort_order: number
          website_url: string
        }[]
      }
      mk_testimonials: {
        Args: { p_featured_only?: boolean; p_placement?: string }
        Returns: {
          attribution_name: string
          attribution_org: string
          attribution_title: string
          headshot_bucket: string
          headshot_path: string
          id: string
          is_featured: boolean
          quote: string
          sort_order: number
        }[]
      }
      module_entitlement_admin_list: {
        Args: { p_org_id: string; p_principal_type: string; p_user_id: string }
        Returns: Json
      }
      module_entitlement_deny: {
        Args: {
          p_ends_at: string
          p_module: string
          p_org_id: string
          p_principal_type: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      module_entitlement_grant: {
        Args: {
          p_ends_at: string
          p_module: string
          p_org_id: string
          p_principal_type: string
          p_reason: string
          p_source: string
          p_user_id: string
        }
        Returns: Json
      }
      module_entitlement_revoke: {
        Args: {
          p_module: string
          p_org_id: string
          p_principal_type: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      mr_cleanup_media: { Args: { p_apply?: boolean }; Returns: number }
      mr_dispatch_cutoff: { Args: never; Returns: string }
      mr_dispatch_gentle_nudge: {
        Args: {
          p_dormant_days?: number
          p_dry_run?: boolean
          p_idle_days?: number
          p_min_gap_days?: number
          p_relationship?: string
        }
        Returns: Json
      }
      mr_dispatch_left_you_something: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_dispatch_partner_started: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_dispatch_practitioner_ordered: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_dispatch_reached_milestone: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_dispatch_safety_alerts: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_dispatch_solo_unlock: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_dispatch_tally: {
        Args: {
          p_considered: number
          p_dry_run: boolean
          p_not_sent: number
          p_sent: number
          p_suppressed: number
          p_type: string
        }
        Returns: Json
      }
      mr_dispatch_turn_ready: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_dispatch_waiting_on_you: {
        Args: { p_dry_run?: boolean; p_relationship?: string }
        Returns: Json
      }
      mr_embed_activities: {
        Args: { p_force?: boolean; p_limit?: number }
        Returns: number
      }
      mr_embed_coaching_activities: {
        Args: { p_force?: boolean; p_limit?: number }
        Returns: number
      }
      mr_first_name: {
        Args: { p_relationship: string; p_user: string }
        Returns: string
      }
      mr_gentle_nudge_body: { Args: { p_payload: Json }; Returns: string }
      mr_gentle_nudge_title: { Args: { p_payload: Json }; Returns: string }
      mr_ingest_media: {
        Args: {
          p_category: string
          p_page?: number
          p_per_page?: number
          p_query: string
        }
        Returns: number
      }
      mr_notification_url: {
        Args: { p_payload: Json; p_with_activity?: boolean }
        Returns: string
      }
      mr_notify: {
        Args: {
          p_about_user?: string
          p_dedup_key?: string
          p_notification_type: string
          p_payload?: Json
          p_recipient: string
          p_relationship?: string
        }
        Returns: Json
      }
      mr_partner_label: { Args: { p_payload: Json }; Returns: string }
      mr_partner_progress_suppressed: {
        Args: {
          p_about_user: string
          p_recipient: string
          p_relationship: string
        }
        Returns: string
      }
      mr_propose_remedies: {
        Args: { p_dry_run?: boolean; p_ticket_id?: string }
        Returns: number
      }
      mr_run_dispatch: {
        Args: {
          p_dry_run?: boolean
          p_include_gentle?: boolean
          p_relationship?: string
        }
        Returns: Json
      }
      mr_safety_alert_body: { Args: { p_payload: Json }; Returns: string }
      mr_sync_help_index: { Args: { p_force?: boolean }; Returns: number }
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
      notify_user_with_channel: {
        Args: {
          p_dedup_key?: string
          p_default_channel?: string
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
      ops_admin_get_membership: { Args: { p_user_id: string }; Returns: Json }
      ops_apollo_budget_available: {
        Args: { p_org_id: string }
        Returns: {
          monthly_cap: number
          per_run_cap: number
          remaining: number
          spent: number
        }[]
      }
      ops_apollo_enrichment_candidates: {
        Args: { p_limit?: number; p_org_id: string }
        Returns: {
          apollo_person_id: string
          first_name: string
          id: string
          organization_name: string
          pool: string
          score: number
          title: string
        }[]
      }
      ops_apollo_period_start: { Args: never; Returns: string }
      ops_apollo_record_enrichment:
        | {
            Args: {
              p_apollo_org_id: string
              p_domain: string
              p_email: string
              p_error?: string
              p_id: string
              p_last_name: string
              p_linkedin: string
            }
            Returns: string
          }
        | {
            Args: {
              p_apollo_org_id: string
              p_city?: string
              p_country?: string
              p_domain: string
              p_email: string
              p_error?: string
              p_id: string
              p_last_name: string
              p_linkedin: string
              p_state?: string
            }
            Returns: string
          }
      ops_apollo_spend_credits: {
        Args: {
          p_discovered_id?: string
          p_endpoint: string
          p_note?: string
          p_org_id: string
          p_units: number
        }
        Returns: boolean
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
      ops_assign_lead_round_robin: {
        Args: { p_lead_id: string }
        Returns: string
      }
      ops_auto_attribute_lead_utm: {
        Args: { p_lead_id: string }
        Returns: string
      }
      ops_auto_enroll: {
        Args: { p_days_of_queue?: number; p_org_id: string }
        Returns: {
          allocation: number
          enrolled: number
          pool: string
        }[]
      }
      ops_bulk_convert_leads: {
        Args: { p_lead_ids: string[]; p_options?: Json }
        Returns: Json
      }
      ops_clone_invoice: { Args: { p_id: string }; Returns: string }
      ops_composition_candidates: {
        Args: { p_limit?: number; p_org_id: string }
        Returns: {
          company: string
          facts: Json
          first_name: string
          lead_id: string
          pool: string
          title: string
        }[]
      }
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
      ops_create_lead_capture_webhook: {
        Args: { p_name: string; p_options?: Json; p_recipe?: string }
        Returns: Json
      }
      ops_create_retainer: { Args: { p_header: Json }; Returns: string }
      ops_crm_email_link_inbound: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_ingestion_id: string
        }
        Returns: Json
      }
      ops_crm_email_prepare: { Args: { p_payload: Json }; Returns: Json }
      ops_crm_email_record_inbound: { Args: { p_payload: Json }; Returns: Json }
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
      ops_daily_worklist: {
        Args: { p_limit?: number; p_org_id: string; p_pool?: string }
        Returns: {
          company: string
          crm_score: number
          days_in_queue: number
          discovery_score: number
          email: string
          full_name: string
          hunter_status: string
          is_target_account: boolean
          last_touched_at: string
          lead_id: string
          linkedin_url: string
          pool: string
          reason: string
          title: string
        }[]
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
      ops_delete_lead_capture_webhook: {
        Args: { p_id: string }
        Returns: boolean
      }
      ops_delete_reminder_schedule: {
        Args: { p_id: string }
        Returns: undefined
      }
      ops_delete_tax_authority: { Args: { p_id: string }; Returns: undefined }
      ops_delete_tax_rate: { Args: { p_id: string }; Returns: undefined }
      ops_due_apollo_searches: {
        Args: { p_search_id?: string }
        Returns: {
          endpoint: string
          exclude_name_keywords: string[]
          filters: Json
          id: string
          max_new_per_run: number
          max_pages: number
          name: string
          org_id: string
          per_page: number
          pool: string
          target_tier: number
        }[]
      }
      ops_due_day_of_digest: {
        Args: never
        Returns: {
          email_body_html: string
          email_subject: string
          org_id: string
          to_email: string
          user_id: string
        }[]
      }
      ops_due_enrichments: {
        Args: { p_limit?: number }
        Returns: {
          enrichment_kind: string
          id: string
          input: Json
          lead_id: string
          org_id: string
          provider: string
        }[]
      }
      ops_due_meeting_reminders: {
        Args: never
        Returns: {
          activity_id: string
          email_body_html: string
          email_subject: string
          org_id: string
          owner_user_id: string
          to_email: string
        }[]
      }
      ops_due_outreach_sends: {
        Args: {
          p_ignore_window?: boolean
          p_limit?: number
          p_org_id: string
          p_pool?: string
        }
        Returns: {
          body: string
          company: string
          enrollment_id: string
          first_name: string
          lead_id: string
          personal: string
          step_number: number
          subject: string
          to_email: string
          tz: string
        }[]
      }
      ops_due_payment_reminders: { Args: never; Returns: Json }
      ops_enqueue_enrichment: {
        Args: { p_kind: string; p_lead: string; p_provider: string }
        Returns: string
      }
      ops_enroll_from_worklist: {
        Args: { p_limit?: number; p_org_id: string; p_sequence_id: string }
        Returns: {
          enrolled: number
          skipped_existing: number
        }[]
      }
      ops_entity_timeline: {
        Args: { p_entity_id: string; p_entity_type: string; p_limit?: number }
        Returns: Json
      }
      ops_evidence_is_grounded: {
        Args: { p_evidence: string; p_page_text: string; p_search_text: string }
        Returns: boolean
      }
      ops_extraction_candidates: {
        Args: { p_limit?: number; p_org_id: string }
        Returns: {
          company: string
          first_name: string
          lead_id: string
          page_text: string
          pool: string
          search_text: string
          title: string
        }[]
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
      ops_get_my_inbox_address: { Args: never; Returns: Json }
      ops_get_org_email_branding: { Args: { p_org: string }; Returns: Json }
      ops_get_public_document_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      ops_get_refundable_payment: { Args: { p_payment: string }; Returns: Json }
      ops_get_webhook_signing_info: { Args: { p_id: string }; Returns: Json }
      ops_grant_operations_access: {
        Args: {
          p_platform_org_id?: string
          p_role: "admin" | "sales_user" | "sales_manager" | "read_only"
          p_user_id: string
        }
        Returns: Json
      }
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
      ops_in_send_window: { Args: { p_timezone: string }; Returns: boolean }
      ops_ingest_captured_lead: {
        Args: { p_ip: string; p_payload: Json; p_webhook: string }
        Returns: Json
      }
      ops_is_boilerplate: { Args: { p_quote: string }; Returns: boolean }
      ops_lead_pool_counts: {
        Args: { p_org_id?: string }
        Returns: {
          label: string
          pool: string
          total: number
          untouched: number
        }[]
      }
      ops_lead_search_candidates: {
        Args: { p_limit?: number; p_org_id: string }
        Returns: {
          company: string
          first_name: string
          last_name: string
          lead_id: string
          pool: string
          title: string
        }[]
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
      ops_list_lead_capture_webhooks: {
        Args: never
        Returns: {
          auto_enrich: boolean
          created_at: string
          default_lead_source_id: string
          id: string
          ingest_url: string
          is_active: boolean
          last_received_at: string
          name: string
          public_token: string
          rate_limit_per_min: number
          recipe: string
          require_signature: boolean
          total_received: number
        }[]
      }
      ops_list_numbering_schemes: { Args: never; Returns: Json }
      ops_list_reminder_schedules: { Args: never; Returns: Json }
      ops_list_salespeople: { Args: never; Returns: Json }
      ops_list_tax_authorities: { Args: never; Returns: Json }
      ops_list_tax_rates: { Args: never; Returns: Json }
      ops_log_webhook_ingestion: {
        Args: {
          p_detail?: string
          p_excerpt?: Json
          p_ip: string
          p_lead?: string
          p_org: string
          p_outcome: string
          p_webhook: string
        }
        Returns: undefined
      }
      ops_looks_like_autoreply: {
        Args: { p_preview: string; p_subject: string }
        Returns: boolean
      }
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
      ops_my_membership: { Args: never; Returns: Json }
      ops_org_user_admin_list: {
        Args: { p_platform_org_id: string }
        Returns: Json
      }
      ops_org_user_list: { Args: never; Returns: Json }
      ops_outreach_attention: {
        Args: { p_org_id?: string }
        Returns: {
          attention: string
          company: string
          detail: string
          email: string
          full_name: string
          last_sent_at: string
          last_step: number
          lead_id: string
          pool: string
          replied_at: string
          title: string
        }[]
      }
      ops_outreach_pipeline_summary: {
        Args: { p_org_id: string }
        Returns: {
          credits_cap: number
          credits_remaining: number
          credits_spent: number
          discovered_rejected: number
          discovered_scored: number
          discovered_suppressed: number
          discovered_total: number
          enriched: number
          promoted_leads: number
          sendable: number
          spine_accounts: number
          worklist_ready: number
        }[]
      }
      ops_outreach_reply_watermark: {
        Args: { p_org_id: string }
        Returns: string
      }
      ops_outreach_send_allowance: {
        Args: { p_org_id: string }
        Returns: {
          effective_cap: number
          footer: string
          from_address: string
          from_display_name: string
          from_title: string
          graph_user_id: string
          is_enabled: boolean
          remaining_today: number
          sent_today: number
          signature: string
          website: string
        }[]
      }
      ops_personalization_candidates: {
        Args: { p_limit?: number; p_org_id: string }
        Returns: {
          company: string
          first_name: string
          lead_id: string
          page_text: string
          pool: string
          search_text: string
          title: string
        }[]
      }
      ops_personalization_is_safe: {
        Args: { p_first_name: string; p_text: string }
        Returns: boolean
      }
      ops_personalization_reject_reason: {
        Args: { p_first_name: string; p_text: string }
        Returns: string
      }
      ops_personalization_review_candidates: {
        Args: { p_limit?: number; p_org_id: string }
        Returns: {
          company: string
          first_name: string
          lead_id: string
          line: string
          page_text: string
          pool: string
          search_text: string
          title: string
        }[]
      }
      ops_promote_discovered_to_leads: {
        Args: {
          p_limit?: number
          p_org_id: string
          p_verify_statuses?: string[]
        }
        Returns: {
          promoted: number
          skipped_duplicate: number
          skipped_suppressed: number
        }[]
      }
      ops_provision_customer_org: {
        Args: {
          p_admin_email: string
          p_admin_full_name?: string
          p_legal_name?: string
          p_org_email?: string
          p_org_name: string
          p_platform_org_id?: string
        }
        Returns: Json
      }
      ops_recompute_lead_score: { Args: { p_lead_id: string }; Returns: number }
      ops_record_apollo_search_run: {
        Args: {
          p_error?: string
          p_new: number
          p_search_id: string
          p_seen: number
          p_status: string
        }
        Returns: boolean
      }
      ops_record_calendar_link: {
        Args: { p_activity: string; p_output_format: string }
        Returns: string
      }
      ops_record_day_of_digest_sent: {
        Args: { p_user: string }
        Returns: boolean
      }
      ops_record_enrichment_result: {
        Args: {
          p_error?: string
          p_id: string
          p_result?: Json
          p_status: string
        }
        Returns: boolean
      }
      ops_record_lead_facts: {
        Args: { p_facts: Json; p_lead_id: string; p_org_id: string }
        Returns: {
          boilerplate: number
          stored: number
          ungrounded: number
        }[]
      }
      ops_record_lead_search: {
        Args: {
          p_error?: string
          p_lead_id: string
          p_org_id: string
          p_search_text: string
        }
        Returns: string
      }
      ops_record_meeting_reminder_sent: {
        Args: {
          p_activity: string
          p_reminder_type: string
          p_status?: string
          p_user: string
        }
        Returns: boolean
      }
      ops_record_outreach_reply:
        | {
            Args: {
              p_conversation_id: string
              p_from_email: string
              p_is_optout?: boolean
              p_org_id: string
              p_received_at: string
            }
            Returns: string
          }
        | {
            Args: {
              p_conversation_id: string
              p_from_email: string
              p_is_optout?: boolean
              p_org_id: string
              p_preview?: string
              p_received_at: string
              p_subject?: string
            }
            Returns: string
          }
      ops_record_outreach_send: {
        Args: {
          p_body: string
          p_enrollment_id: string
          p_error?: string
          p_graph_conversation_id: string
          p_graph_message_id: string
          p_status: string
          p_step: number
          p_subject: string
          p_to: string
        }
        Returns: string
      }
      ops_record_payment: {
        Args: { p_invoice: string; p_payment: Json }
        Returns: string
      }
      ops_record_personalization:
        | {
            Args: { p_lead_id: string; p_source?: string; p_text: string }
            Returns: string
          }
        | {
            Args: {
              p_evidence?: string
              p_lead_id: string
              p_source?: string
              p_text: string
            }
            Returns: string
          }
      ops_record_personalization_verdict: {
        Args: { p_lead_id: string; p_reason?: string; p_verdict: string }
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
      ops_record_web_context:
        | {
            Args: {
              p_domain: string
              p_error?: string
              p_http_status: number
              p_lead_id: string
              p_org_id: string
              p_page_text: string
              p_url: string
            }
            Returns: string
          }
        | {
            Args: {
              p_domain: string
              p_error?: string
              p_http_status: number
              p_lead_id: string
              p_org_id: string
              p_page_text: string
              p_pages_tried?: string[]
              p_url: string
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
      ops_revoke_operations_access: {
        Args: { p_platform_org_id?: string; p_user_id: string }
        Returns: Json
      }
      ops_rotate_webhook_secret: { Args: { p_id: string }; Returns: Json }
      ops_run_recurring_expenses: { Args: never; Returns: number }
      ops_run_recurring_invoices: { Args: never; Returns: number }
      ops_score_decay_run: { Args: never; Returns: number }
      ops_score_pending_discoveries: {
        Args: { p_limit?: number }
        Returns: {
          processed: number
          promoted_eligible: number
          rejected: number
          suppressed: number
        }[]
      }
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
      ops_set_lead_timezone: { Args: { p_lead_id: string }; Returns: string }
      ops_set_reply_watermark: {
        Args: { p_at: string; p_org_id: string }
        Returns: boolean
      }
      ops_set_retainer_status: {
        Args: { p_action: string; p_id: string }
        Returns: string
      }
      ops_set_user_commission_rate: {
        Args: { p_rate: number; p_user_id: string }
        Returns: undefined
      }
      ops_spine_org_ids: { Args: { p_org_id: string }; Returns: string[] }
      ops_start_timer: {
        Args: {
          p_description?: string
          p_project: string
          p_project_task?: string
        }
        Returns: string
      }
      ops_stop_timer: { Args: { p_id?: string }; Returns: number }
      ops_stripe_collection_enabled: {
        Args: { p_org: string }
        Returns: boolean
      }
      ops_text_norm: { Args: { p: string }; Returns: string }
      ops_timezone_for_state: {
        Args: { p_country?: string; p_state: string }
        Returns: string
      }
      ops_update_card_fee_settings: {
        Args: { p_enabled: boolean; p_fixed: number; p_percent: number }
        Returns: undefined
      }
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
      ops_update_lead_capture_webhook: {
        Args: { p_id: string; p_patch: Json }
        Returns: boolean
      }
      ops_update_numbering_scheme: {
        Args: { p_id: string; p_patch: Json }
        Returns: string
      }
      ops_update_org_branding: { Args: { p_patch: Json }; Returns: undefined }
      ops_update_reminder_settings: {
        Args: { p_patch: Json }
        Returns: undefined
      }
      ops_upsert_apollo_discovered_person: {
        Args: {
          p_apollo_org_id: string
          p_apollo_person_id: string
          p_domain: string
          p_first_name: string
          p_has_email?: boolean
          p_last_name: string
          p_org_id: string
          p_org_name: string
          p_pool: string
          p_raw: Json
          p_search_id: string
          p_title: string
        }
        Returns: string
      }
      ops_upsert_apollo_target_account: {
        Args: {
          p_apollo_id: string
          p_domain: string
          p_exclusions: string[]
          p_name: string
          p_org_id: string
          p_website: string
        }
        Returns: string
      }
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
      ops_web_context_candidates: {
        Args: { p_limit?: number; p_org_id: string }
        Returns: {
          company: string
          domain: string
          lead_id: string
          pool: string
          title: string
        }[]
      }
      ops_webhook_resolve: { Args: { p_token: string }; Returns: Json }
      ops_workflow_engine_run: { Args: never; Returns: Json }
      opt_in_to_newsletter: { Args: never; Returns: Json }
      opt_out_of_newsletter: { Args: never; Returns: Json }
      org_assign_coach: {
        Args: {
          p_coach_user_id: string
          p_note?: string
          p_organization_id: string
        }
        Returns: {
          assigned_at: string
          assigned_by: string | null
          coach_user_id: string
          ended_at: string | null
          ended_by: string | null
          id: string
          note: string | null
          organization_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_coaches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      org_has_feature: {
        Args: { p_feature: string; p_org: string }
        Returns: boolean
      }
      org_list_coaches: {
        Args: { p_org: string }
        Returns: {
          assigned_at: string
          coach_user_id: string
          email: string
          full_name: string
          note: string
        }[]
      }
      org_member_assessment_completions: {
        Args: { p_org: string }
        Returns: {
          instrument_id: string
          last_completed_at: string
          user_id: string
        }[]
      }
      org_report_allowance_status: {
        Args: { p_org: string; p_report_type: string }
        Returns: {
          included_qty: number
          remaining: number
          report_type: string
          unlimited: boolean
          used: number
        }[]
      }
      org_set_mfa_required: {
        Args: { p_enabled: boolean; p_organization_id: string }
        Returns: Json
      }
      org_unassign_coach: {
        Args: { p_coach_user_id: string; p_organization_id: string }
        Returns: undefined
      }
      pd_admin_delete_profile: { Args: { p_user_id: string }; Returns: Json }
      pd_admin_list_profiles: {
        Args: { p_status?: string }
        Returns: {
          approved_at: string
          approved_payload: Json
          draft: Json
          email: string
          full_name: string
          listed: boolean
          missing_fields: string[]
          moderation_status: string
          slug: string
          submitted_at: string
          user_id: string
        }[]
      }
      pd_admin_review_profile: {
        Args: { p_action: string; p_note?: string; p_user_id: string }
        Returns: Json
      }
      pd_admin_update_profile: {
        Args: { p_patch: Json; p_user_id: string }
        Returns: Json
      }
      pd_bio_generations_remaining_today: {
        Args: { p_user_id: string }
        Returns: number
      }
      pd_generate_slug: { Args: { p_user_id: string }; Returns: string }
      pd_get_my_directory_state: { Args: never; Returns: Json }
      pd_normalize_url: { Args: { p_url: string }; Returns: string }
      pd_profile_missing_fields: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      pd_public_directory: {
        Args: never
        Returns: {
          bio: string
          booking_url: string
          certifications: Json
          city: string
          country: string
          display_name: string
          headline: string
          headshot_path: string
          instagram_url: string
          linkedin_url: string
          region: string
          slug: string
          website_url: string
          x_url: string
          youtube_url: string
        }[]
      }
      pd_public_profile: {
        Args: { p_slug: string }
        Returns: {
          bio: string
          booking_url: string
          certifications: Json
          city: string
          country: string
          display_name: string
          headline: string
          headshot_path: string
          instagram_url: string
          linkedin_url: string
          region: string
          slug: string
          website_url: string
          x_url: string
          youtube_url: string
        }[]
      }
      pd_set_my_listing_consent: { Args: { p_listed: boolean }; Returns: Json }
      pd_upsert_my_profile: {
        Args: {
          p_bio?: string
          p_booking_url?: string
          p_city?: string
          p_country?: string
          p_display_name?: string
          p_headline?: string
          p_headshot_path?: string
          p_instagram_url?: string
          p_linkedin_url?: string
          p_region?: string
          p_submit?: boolean
          p_website_url?: string
          p_x_url?: string
          p_youtube_url?: string
        }
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
      peer_ptp_effective_groups: {
        Args: { p_owner: string; p_viewer: string }
        Returns: {
          impact: boolean
          interpretation: boolean
          scores: boolean
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
      platform_health_overview: {
        Args: { p_include_internal?: boolean }
        Returns: Json
      }
      platform_tickets_scan_now: { Args: never; Returns: Json }
      prepare_lesson_open_response: {
        Args: { p_block_id: string }
        Returns: Json
      }
      preview_article_as_viewer_class: {
        Args: { p_article_id: string; p_viewer_class: string }
        Returns: Json
      }
      principal_has_module: {
        Args: { p_module: string; p_user: string }
        Returns: boolean
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
      ptp_dimension_scores: {
        Args: {
          p_assessment_ids?: string[]
          p_context: string
          p_user_id: string
        }
        Returns: {
          band: string
          contexts_present: string[]
          dimension_id: string
          item_count: number
          mean: number
        }[]
      }
      ptp_intro_gate_resolve: { Args: never; Returns: Json }
      ptp_intro_gate_status: { Args: never; Returns: Json }
      ptp_intro_video_progress_upsert: {
        Args: {
          p_duration?: number
          p_event?: string
          p_gate_video_id: string
          p_last_position?: number
          p_max_percent?: number
          p_watched_seconds_delta?: number
        }
        Returns: Json
      }
      ptp_profile_facet_rows: {
        Args: { p_item_set: string; p_user_ids: string[] }
        Returns: {
          context_type: string
          corrected: number
          domain: string
          facet_name: string
          floor_risk: string
          item_number: number
          resource_logic: string
          routes: boolean
          salience: string
          salience_weight: number
          source_assessment_id: string
          user_id: string
        }[]
      }
      ptp_sharing_content_upsert: {
        Args: { p_rows?: Json; p_share_ptp_full?: boolean }
        Returns: undefined
      }
      ptp_show_coach_content: {
        Args: { p_owner_user_id: string }
        Returns: boolean
      }
      ptp_try_pair_combined: { Args: { p_user_id: string }; Returns: Json }
      publish_article: {
        Args: { p_article_id: string; p_reason: string }
        Returns: Json
      }
      reanchor_trusted_device_impersonation: {
        Args: { p_token: string }
        Returns: boolean
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
      record_lesson_open_response: {
        Args: {
          p_ai_feedback: string
          p_block_id: string
          p_model?: string
          p_response_text: string
        }
        Returns: Json
      }
      record_product_purchase: {
        Args: {
          p_amount_cents: number
          p_metadata?: Json
          p_payer?: string
          p_payment_intent?: string
          p_price_id?: string
          p_purchased_by?: string
          p_session_id?: string
          p_tier: string
          p_user_id: string
        }
        Returns: Json
      }
      record_video_progress: {
        Args: {
          p_content_item_id: string
          p_last_position_seconds?: number
          p_watch_pct: number
        }
        Returns: Json
      }
      refund_free_report_credit: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      relationship_activity_access: {
        Args: { p_activity: string; p_relationship: string }
        Returns: {
          allowed: boolean
          reason: string
        }[]
      }
      relationship_activity_close_out: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          closed: boolean
          reason: string
        }[]
      }
      relationship_activity_ids: {
        Args: { p_codes: string[] }
        Returns: {
          code: string
          id: string
          partner_mode: string
          visibility_mode: string
        }[]
      }
      relationship_activity_submit: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          barrier_cleared: boolean
          close_out_available_at: string
          session_status: string
          waiting_on: string
        }[]
      }
      relationship_affection_band: {
        Args: { p_gap: number; p_name: string }
        Returns: string
      }
      relationship_ai_record: {
        Args: {
          p_activity: string
          p_in?: number
          p_kind: string
          p_out?: number
          p_relationship: string
          p_run: number
          p_user: string
        }
        Returns: string
      }
      relationship_artifact_claim: {
        Args: {
          p_activity: string
          p_relationship: string
          p_run: number
          p_user: string
        }
        Returns: {
          claimed: boolean
          html: string
          state: string
        }[]
      }
      relationship_artifact_complete: {
        Args: {
          p_activity: string
          p_error?: string
          p_html: string
          p_model: string
          p_relationship: string
          p_run: number
        }
        Returns: undefined
      }
      relationship_choose_focus_area: {
        Args: { p_area_code: string; p_relationship: string }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      relationship_coach_ack_alert: {
        Args: { p_alert: string; p_status: string }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      relationship_coach_open_area: {
        Args: { p_area_code: string; p_relationship: string }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      relationship_coach_overview: {
        Args: { p_relationship: string }
        Returns: {
          activity_id: string
          area_code: string
          barrier_cleared: boolean
          code: string
          module_number: number
          one_status: string
          sequence: number
          title: string
          two_status: string
          visibility_mode: string
        }[]
      }
      relationship_coach_roster: {
        Args: never
        Returns: {
          core_total: number
          has_safeguarding: boolean
          last_activity: string
          max_open_severity: string
          one_done: number
          open_alerts: number
          pacing_ceiling_module: number
          partner_one: string
          partner_two: string
          relationship_id: string
          run_number: number
          two_done: number
        }[]
      }
      relationship_coach_safety_inbox: {
        Args: { p_include_resolved?: boolean }
        Returns: {
          acknowledged_at: string
          alert_id: string
          categories: string[]
          created_at: string
          relationship_id: string
          safeguarding: boolean
          severity: string
          status: string
          subject_label: string
        }[]
      }
      relationship_coach_set_pacing: {
        Args: { p_module: number; p_relationship: string }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      relationship_consume_reveal: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: boolean
      }
      relationship_couple_material: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          admissible: boolean
          disclosure: string
          reason: string
          user_one_id: string
          user_one_material: Json
          user_two_id: string
          user_two_material: Json
        }[]
      }
      relationship_cross_read_own: {
        Args: {
          p_activity: string
          p_relationship: string
          p_run: number
          p_user: string
        }
        Returns: Json
      }
      relationship_desire_overlap: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          has_boundary_note: boolean
          ready: boolean
          reason: string
          shared_curiosities: string[]
          shared_likes: string[]
        }[]
      }
      relationship_disclosure_state: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          disclosable: boolean
          disclosure: string
          reason: string
        }[]
      }
      relationship_first_names: {
        Args: { p_relationship: string }
        Returns: {
          active_first_name: string
          other_first_name: string
        }[]
      }
      relationship_focus_area_activities: {
        Args: { p_area_code: string; p_relationship: string }
        Returns: {
          activity_id: string
          allowed: boolean
          barrier_blocks: string
          briefing_description: string
          briefing_prerequisites: string
          code: string
          est_minutes_high: number
          est_minutes_low: number
          hero_image_url: string
          learning_outcomes: string[]
          own_status: string
          own_step: number
          partner_mode: string
          partner_status: string
          practitioner_gated: boolean
          prerequisite_codes: string[]
          prerequisite_titles: string[]
          reason: string
          reason_code: string
          reason_detail: string[]
          repeatable: boolean
          romantic_disclaimer: boolean
          seq: number
          tags: string[]
          time_estimate: string
          title: string
          visibility_mode: string
        }[]
      }
      relationship_focus_areas_state: {
        Args: { p_relationship: string }
        Returns: {
          area_code: string
          available_activities: number
          c_number: number
          cluster: string
          content_ready: boolean
          core_prereq_label: string
          description: string
          done_activities: number
          gate: string
          hero_image_url: string
          planned_activity_count: number
          practitioner_gated: boolean
          selected: boolean
          self_selectable: boolean
          sort_order: number
          title: string
          total_activities: number
        }[]
      }
      relationship_focus_state: {
        Args: { p_area_code: string; p_relationship: string }
        Returns: {
          activity_id: string
          allowed: boolean
          barrier_blocks: string
          barrier_cleared: boolean
          code: string
          est_minutes_high: number
          est_minutes_low: number
          module_number: number
          own_status: string
          own_step: number
          partner_status: string
          reason: string
          reason_code: string
          reason_detail: string[]
          repeatable: boolean
          reveal_pending: boolean
          reveal_step_id: string
          romantic_disclaimer: boolean
          sequence: number
          title: string
          visibility_mode: string
        }[]
      }
      relationship_journey_access: {
        Args: { p_relationship: string }
        Returns: {
          allowed: boolean
          reason: string
        }[]
      }
      relationship_journey_state: {
        Args: { p_relationship: string }
        Returns: {
          activity_id: string
          allowed: boolean
          barrier_blocks: string
          barrier_cleared: boolean
          code: string
          est_minutes_high: number
          est_minutes_low: number
          module_number: number
          own_status: string
          own_step: number
          partner_status: string
          reason: string
          reason_code: string
          reason_detail: string[]
          repeatable: boolean
          reveal_pending: boolean
          reveal_step_id: string
          romantic_disclaimer: boolean
          sequence: number
          title: string
          visibility_mode: string
        }[]
      }
      relationship_marker_colors: {
        Args: { p_relationship: string }
        Returns: {
          is_self: boolean
          marker_color: string
          user_id: string
        }[]
      }
      relationship_nudge_due_days: {
        Args: { p_relationship: string }
        Returns: number[]
      }
      relationship_nudges_suppressed: {
        Args: { p_about_user: string; p_relationship: string }
        Returns: boolean
      }
      relationship_own_dimension_scores: {
        Args: { p_activity: string }
        Returns: {
          dimension_key: string
          dimension_name: string
          score: number
        }[]
      }
      relationship_own_material_admissible: {
        Args: {
          p_activity: string
          p_relationship: string
          p_run: number
          p_user: string
        }
        Returns: {
          admissible: boolean
          disclosure: string
          material: Json
          reason: string
        }[]
      }
      relationship_partner_dimension_scores: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          dimension_key: string
          dimension_name: string
          score: number
        }[]
      }
      relationship_partner_labels: {
        Args: { p_relationship: string }
        Returns: {
          ambiguous: boolean
          label: string
          user_id: string
        }[]
      }
      relationship_partner_view: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          disclosure: string
          partner_user_id: string
          reason: string
          responses: Json
          visible: boolean
        }[]
      }
      relationship_pending_reveals: {
        Args: { p_relationship: string }
        Returns: {
          activity_id: string
          area_code: string
          cleared_at: string
          code: string
          module_number: number
          title: string
        }[]
      }
      relationship_safety_disclosure: {
        Args: { p_relationship: string; p_subject: string }
        Returns: string
      }
      relationship_safety_evaluate: {
        Args: { p_answers: Json; p_disclosure?: string; p_relationship: string }
        Returns: {
          categories: string[]
          concern: boolean
          routed_to: number
        }[]
      }
      relationship_session_save: {
        Args: { p_current_step: number; p_patch: Json; p_session_id: string }
        Returns: {
          reason: string
          saved: boolean
        }[]
      }
      relationship_session_start: {
        Args: { p_activity: string; p_relationship: string; p_run?: number }
        Returns: {
          current_step: number
          responses: Json
          resumed: boolean
          session_id: string
          status: string
        }[]
      }
      relationship_set_marker_color: {
        Args: { p_color: string; p_relationship: string }
        Returns: Json
      }
      relationship_strip_private: {
        Args: { p_activity: string; p_responses: Json }
        Returns: Json
      }
      relationship_substance_evaluate: {
        Args: {
          p_activity: string
          p_answers: Json
          p_relationship: string
          p_run: number
        }
        Returns: {
          categories: string[]
          routed: boolean
        }[]
      }
      relationship_substance_flag: {
        Args: { p_relationship: string; p_subject: string }
        Returns: boolean
      }
      relationship_substance_resources_for: {
        Args: { p_categories: string[] }
        Returns: {
          category: string
          detail: string
          label: string
          region: string
          url: string
        }[]
      }
      relationship_substance_routed: {
        Args: {
          p_activity: string
          p_relationship: string
          p_run: number
          p_user: string
        }
        Returns: boolean
      }
      relationship_token_affection_gaps: {
        Args: {
          p_activity: string
          p_field: string
          p_relationship: string
          p_run: number
        }
        Returns: string
      }
      relationship_token_baseline_movement: {
        Args: {
          p_activity: string
          p_field: string
          p_relationship: string
          p_run: number
        }
        Returns: string
      }
      relationship_token_desire_overlap: {
        Args: {
          p_activity: string
          p_field: string
          p_relationship: string
          p_run: number
        }
        Returns: string
      }
      relationship_token_ptp_dimension: {
        Args: {
          p_activity: string
          p_field: string
          p_relationship: string
          p_run: number
        }
        Returns: string
      }
      relationship_token_share_sum: {
        Args: {
          p_activity: string
          p_field: string
          p_relationship: string
          p_run: number
        }
        Returns: string
      }
      relationship_token_weakest_trust_factor: {
        Args: {
          p_activity: string
          p_field: string
          p_relationship: string
          p_run: number
        }
        Returns: string
      }
      relationship_unchoose_focus_area: {
        Args: { p_area_code: string; p_relationship: string }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      release_report_order_claim: {
        Args: { p_order_id: string }
        Returns: boolean
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
      report_add_commitments: {
        Args: {
          p_items: Json
          p_kind: string
          p_report_id: string
          p_scope: string
        }
        Returns: Json
      }
      report_archive_commitment: {
        Args: { p_commitment_id: string }
        Returns: undefined
      }
      report_list_commitments: {
        Args: { p_kind: string; p_report_id: string }
        Returns: {
          action_text: string
          created_at: string
          created_by: string
          created_by_name: string
          dimension_tags: string[]
          id: string
          is_mine: boolean
        }[]
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
          p_quiz_answer_option_id?: string
          p_quiz_question_id?: string
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
      resolve_report_capacity_request: {
        Args: { p_note?: string; p_request_id: string; p_status: string }
        Returns: boolean
      }
      resource_engagement_report: {
        Args: {
          p_include_internal?: boolean
          p_limit?: number
          p_resource_id?: string
          p_source?: string
          p_user_id?: string
        }
        Returns: Json
      }
      restore_article_version: {
        Args: { p_reason: string; p_version_id: string }
        Returns: Json
      }
      revert_expired_coach_free_years: { Args: never; Returns: number }
      revoke_all_trusted_devices: {
        Args: { p_reason: string; p_user_id: string }
        Returns: number
      }
      revoke_certification: {
        Args: { p_certification_id: string; p_reason: string }
        Returns: Json
      }
      revoke_ptp_share: { Args: { p_viewer_user_id: string }; Returns: Json }
      revoke_trusted_device: { Args: { p_id: string }; Returns: boolean }
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
      scan_coach_free_year_expiry: {
        Args: never
        Returns: {
          notified: number
          run_at: string
        }[]
      }
      scan_coach_winback_after: {
        Args: never
        Returns: {
          notified: number
          run_at: string
        }[]
      }
      schedule_article: {
        Args: { p_article_id: string; p_publish_at: string; p_reason: string }
        Returns: Json
      }
      search_coaching_activities: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_query_text?: string
        }
        Returns: {
          activity_id: string
          code: string
          description: string
          lexical_rank: number
          module_group: string
          similarity: number
          thumbnail_url: string
          tier: string
          title: string
        }[]
      }
      search_impersonation_targets: {
        Args: {
          p_account_status_in?: string[]
          p_account_types?: string[]
          p_certification_statuses?: string[]
          p_created_within?: string
          p_has_active_assignments?: boolean
          p_has_supervisor?: boolean
          p_include_internal?: boolean
          p_is_coach_actor?: boolean
          p_is_coach_client?: boolean
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
          is_coach_actor: boolean
          is_coach_client: boolean
          is_internal_test: boolean
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
      search_my_coaching_extracts: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
        }
        Returns: {
          activity_code: string
          activity_id: string
          activity_title: string
          content: string
          extract_id: string
          module_group: string
          response_key: string
          session_id: string
          similarity: number
          updated_at: string
        }[]
      }
      search_relationship_activities: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_query_text?: string
        }
        Returns: {
          activity_id: string
          code: string
          description: string
          hero_image_url: string
          lexical_rank: number
          module_number: number
          similarity: number
          tags: string[]
          title: string
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
      set_certification_completion: {
        Args: {
          p_certification_type: string
          p_complete: boolean
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      set_certification_completion_bulk: {
        Args: {
          p_certification_type: string
          p_complete: boolean
          p_reason: string
          p_user_ids: string[]
        }
        Returns: Json
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
      set_learning_folder_access_grants: {
        Args: { p_folder_id: string; p_grants: Json; p_reason: string }
        Returns: Json
      }
      set_learning_folder_item: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_folder_id: string
          p_reason: string
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
      set_resource_folder: {
        Args: { p_folder_id: string; p_reason: string; p_resource_id: string }
        Returns: Json
      }
      set_resource_folder_access_grants: {
        Args: { p_folder_id: string; p_grants: Json; p_reason: string }
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
      set_trusted_device_settings: {
        Args: {
          p_enabled: boolean
          p_impersonation_window_hours: number
          p_reason: string
          p_window_days: number
        }
        Returns: Json
      }
      set_user_avatar: {
        Args: { p_asset_id: string; p_reason: string; p_user_id: string }
        Returns: Json
      }
      share_ptp_results: { Args: { p_target_email: string }; Returns: Json }
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
      super_admin_coach_client_tracking: {
        Args: { p_user_id?: string }
        Returns: {
          actor_instrument_id: string
          assessment_completed: boolean
          client_email: string
          client_name: string
          client_user_id: string
          coach_client_id: string
          coach_name: string
          coach_user_id: string
          completed_at: string
          debrief_completed: boolean
          invitation_status: string
          invited_at: string
          is_actor: boolean
        }[]
      }
      super_admin_list_orgs_with_usage: {
        Args: { p_include_internal?: boolean }
        Returns: {
          id: string
          is_internal_test: boolean
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
      upsert_learning_folder: {
        Args: {
          p_display_order: number
          p_id: string
          p_name: string
          p_parent_folder_id: string
          p_reason: string
          p_slug: string
        }
        Returns: Json
      }
      upsert_lesson_block_progress: {
        Args: { p_block_id: string; p_completion_data?: Json; p_status: string }
        Returns: Json
      }
      upsert_lesson_brand: {
        Args: {
          p_color_accent?: string
          p_color_cta?: string
          p_color_free1?: string
          p_color_free2?: string
          p_color_primary?: string
          p_color_surface?: string
          p_content_item_id: string
          p_font_body_key?: string
          p_font_display_key?: string
          p_logo_path?: string
        }
        Returns: {
          color_accent: string | null
          color_cta: string | null
          color_free1: string | null
          color_free2: string | null
          color_primary: string | null
          color_surface: string | null
          content_item_id: string
          created_at: string
          created_by: string | null
          font_body_key: string | null
          font_display_key: string | null
          logo_path: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lesson_brands"
          isOneToOne: true
          isSetofReturn: false
        }
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
          p_option_image_asset_id?: string
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
          p_question_image_asset_id?: string
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
      upsert_resource_folder: {
        Args: {
          p_display_order: number
          p_id: string
          p_name: string
          p_parent_folder_id: string
          p_reason: string
          p_slug: string
          p_tab_id: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
