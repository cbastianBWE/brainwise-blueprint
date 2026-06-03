// operations-types.ts
// Generated Session 109 by introspecting the live `operations` schema.
// HAND-MAINTAINED — this file is intentionally OUTSIDE Lovable's auto-managed
// src/integrations/supabase/types.ts (which only carries the `public` schema and
// is regenerated on Lovable sync). Keep this file separate so syncs don't clobber it.
// Regenerate when the operations schema changes (see build-queue.md).
//
// Place at: src/integrations/supabase/operations-types.ts
// Usage:    import { opsSupabase } from "@/integrations/supabase/operations-types";
//           const { data } = await opsSupabase.from("customers").select("*");

import { createClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OperationsDatabase = {
  operations: {
    Tables: {
      contact_persons: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          role: string | null
          salutation: string | null
          is_primary: boolean
          portal_access_enabled: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          role?: string | null
          salutation?: string | null
          is_primary?: boolean
          portal_access_enabled?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          role?: string | null
          salutation?: string | null
          is_primary?: boolean
          portal_access_enabled?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      credit_notes: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          credit_note_number: string
          issue_date: string
          status: string
          reason: string | null
          currency_code: string
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          amount_applied: number
          amount_refunded: number
          balance: number | null
          associated_invoice_id: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          credit_note_number: string
          issue_date?: string
          status?: string
          reason?: string | null
          currency_code?: string
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          amount_applied?: number
          amount_refunded?: number
          associated_invoice_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          credit_note_number?: string
          issue_date?: string
          status?: string
          reason?: string | null
          currency_code?: string
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          amount_applied?: number
          amount_refunded?: number
          associated_invoice_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      currencies: {
        Row: {
          id: string
          org_id: string
          currency_code: string
          is_base: boolean
          manual_exchange_rate: number | null
          last_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          currency_code: string
          is_base?: boolean
          manual_exchange_rate?: number | null
          last_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          currency_code?: string
          is_base?: boolean
          manual_exchange_rate?: number | null
          last_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_field_definitions: {
        Row: {
          id: string
          org_id: string
          entity_type: string
          field_name: string
          field_label: string | null
          field_type: string
          dropdown_options: Json | null
          is_required: boolean
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          entity_type: string
          field_name: string
          field_label?: string | null
          field_type: string
          dropdown_options?: Json | null
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          entity_type?: string
          field_name?: string
          field_label?: string | null
          field_type?: string
          dropdown_options?: Json | null
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_credits: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          source_type: string
          source_id: string | null
          amount: number
          applied_amount: number
          available_balance: number | null
          created_at: string
          applied_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          source_type: string
          source_id?: string | null
          amount?: number
          applied_amount?: number
          created_at?: string
          applied_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          source_type?: string
          source_id?: string | null
          amount?: number
          applied_amount?: number
          created_at?: string
          applied_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          org_id: string
          platform_organization_id: string | null
          display_name: string
          legal_name: string | null
          type: string
          email: string | null
          phone: string | null
          website: string | null
          billing_address: Json | null
          shipping_address: Json | null
          tax_id: string | null
          default_currency_code: string
          default_payment_terms_days: number
          language_code: string
          status: string
          notes: string | null
          custom_fields: Json
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          default_tax_rate_id: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          platform_organization_id?: string | null
          display_name: string
          legal_name?: string | null
          type?: string
          email?: string | null
          phone?: string | null
          website?: string | null
          billing_address?: Json | null
          shipping_address?: Json | null
          tax_id?: string | null
          default_currency_code?: string
          default_payment_terms_days?: number
          language_code?: string
          status?: string
          notes?: string | null
          custom_fields?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          default_tax_rate_id?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          platform_organization_id?: string | null
          display_name?: string
          legal_name?: string | null
          type?: string
          email?: string | null
          phone?: string | null
          website?: string | null
          billing_address?: Json | null
          shipping_address?: Json | null
          tax_id?: string | null
          default_currency_code?: string
          default_payment_terms_days?: number
          language_code?: string
          status?: string
          notes?: string | null
          custom_fields?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          default_tax_rate_id?: string | null
        }
        Relationships: []
      }
      document_lines: {
        Row: {
          id: string
          org_id: string
          document_type: string
          document_id: string
          line_type: string
          item_id: string | null
          description: string | null
          quantity: number | null
          unit: string | null
          unit_price: number | null
          discount_amount: number | null
          discount_percentage: number | null
          tax_rate_id: string | null
          tax_amount: number | null
          line_total: number | null
          sort_order: number
          source_time_entry_ids: string[] | null
          source_expense_ids: string[] | null
          source_charge_ids: string[] | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          source_project_id: string | null
          source_task_id: string | null
          stripe_tax_code: string | null
        }
        Insert: {
          id?: string
          org_id: string
          document_type: string
          document_id: string
          line_type: string
          item_id?: string | null
          description?: string | null
          quantity?: number | null
          unit?: string | null
          unit_price?: number | null
          discount_amount?: number | null
          discount_percentage?: number | null
          tax_rate_id?: string | null
          tax_amount?: number | null
          line_total?: number | null
          sort_order?: number
          source_time_entry_ids?: string[] | null
          source_expense_ids?: string[] | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          source_project_id?: string | null
          source_task_id?: string | null
          stripe_tax_code?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          document_type?: string
          document_id?: string
          line_type?: string
          item_id?: string | null
          description?: string | null
          quantity?: number | null
          unit?: string | null
          unit_price?: number | null
          discount_amount?: number | null
          discount_percentage?: number | null
          tax_rate_id?: string | null
          tax_amount?: number | null
          line_total?: number | null
          sort_order?: number
          source_time_entry_ids?: string[] | null
          source_expense_ids?: string[] | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          source_project_id?: string | null
          source_task_id?: string | null
          stripe_tax_code?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          id: string
          org_id: string
          template_type: string
          subject: string | null
          body_html: string | null
          body_text: string | null
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          template_type: string
          subject?: string | null
          body_html?: string | null
          body_text?: string | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          template_type?: string
          subject?: string | null
          body_html?: string | null
          body_text?: string | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          estimate_number: string
          reference_number: string | null
          issue_date: string
          expiration_date: string | null
          status: string
          currency_code: string
          exchange_rate: number
          subtotal_amount: number
          discount_amount: number
          discount_percentage: number | null
          tax_amount: number
          adjustment_amount: number
          total_amount: number
          notes_to_customer: string | null
          terms_and_conditions: string | null
          salesperson_id: string | null
          contact_persons_cc: string[] | null
          sent_at: string | null
          viewed_at: string | null
          accepted_at: string | null
          declined_at: string | null
          declined_reason: string | null
          converted_invoice_id: string | null
          converted_project_id: string | null
          custom_fields: Json
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          estimate_number: string
          reference_number?: string | null
          issue_date?: string
          expiration_date?: string | null
          status?: string
          currency_code?: string
          exchange_rate?: number
          subtotal_amount?: number
          discount_amount?: number
          discount_percentage?: number | null
          tax_amount?: number
          adjustment_amount?: number
          total_amount?: number
          notes_to_customer?: string | null
          terms_and_conditions?: string | null
          salesperson_id?: string | null
          contact_persons_cc?: string[] | null
          sent_at?: string | null
          viewed_at?: string | null
          accepted_at?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          converted_invoice_id?: string | null
          converted_project_id?: string | null
          custom_fields?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          estimate_number?: string
          reference_number?: string | null
          issue_date?: string
          expiration_date?: string | null
          status?: string
          currency_code?: string
          exchange_rate?: number
          subtotal_amount?: number
          discount_amount?: number
          discount_percentage?: number | null
          tax_amount?: number
          adjustment_amount?: number
          total_amount?: number
          notes_to_customer?: string | null
          terms_and_conditions?: string | null
          salesperson_id?: string | null
          contact_persons_cc?: string[] | null
          sent_at?: string | null
          viewed_at?: string | null
          accepted_at?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          converted_invoice_id?: string | null
          converted_project_id?: string | null
          custom_fields?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          id: string
          org_id: string
          name: string
          parent_category_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          default_tax_rate_id: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          name: string
          parent_category_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          default_tax_rate_id?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          parent_category_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          default_tax_rate_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          org_id: string
          date: string
          expense_category_id: string | null
          vendor_name: string | null
          amount: number
          currency_code: string
          tax_amount: number
          tax_rate_id: string | null
          customer_id: string | null
          project_id: string | null
          is_billable: boolean
          markup_percentage: number | null
          is_invoiced: boolean
          invoice_line_id: string | null
          receipt_storage_path: string | null
          notes: string | null
          custom_fields: Json
          is_mileage: boolean
          miles_driven: number | null
          per_mile_rate: number | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          date?: string
          expense_category_id?: string | null
          vendor_name?: string | null
          amount?: number
          currency_code?: string
          tax_amount?: number
          tax_rate_id?: string | null
          customer_id?: string | null
          project_id?: string | null
          is_billable?: boolean
          markup_percentage?: number | null
          is_invoiced?: boolean
          invoice_line_id?: string | null
          receipt_storage_path?: string | null
          notes?: string | null
          custom_fields?: Json
          is_mileage?: boolean
          miles_driven?: number | null
          per_mile_rate?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          date?: string
          expense_category_id?: string | null
          vendor_name?: string | null
          amount?: number
          currency_code?: string
          tax_amount?: number
          tax_rate_id?: string | null
          customer_id?: string | null
          project_id?: string | null
          is_billable?: boolean
          markup_percentage?: number | null
          is_invoiced?: boolean
          invoice_line_id?: string | null
          receipt_storage_path?: string | null
          notes?: string | null
          custom_fields?: Json
          is_mileage?: boolean
          miles_driven?: number | null
          per_mile_rate?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          invoice_number: string
          reference_number: string | null
          issue_date: string
          due_date: string | null
          payment_terms_days: number | null
          status: string
          currency_code: string
          exchange_rate: number
          subtotal_amount: number
          discount_amount: number
          discount_percentage: number | null
          tax_amount: number
          shipping_amount: number
          adjustment_amount: number
          total_amount: number
          amount_paid: number
          balance_due: number | null
          notes_to_customer: string | null
          terms_and_conditions: string | null
          salesperson_id: string | null
          contact_persons_cc: string[] | null
          sent_at: string | null
          viewed_at: string | null
          paid_at: string | null
          stripe_invoice_id: string | null
          parent_recurring_id: string | null
          parent_estimate_id: string | null
          project_id: string | null
          applied_retainer_amount: number
          applied_credit_note_amount: number
          custom_fields: Json
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          invoice_number: string
          reference_number?: string | null
          issue_date?: string
          due_date?: string | null
          payment_terms_days?: number | null
          status?: string
          currency_code?: string
          exchange_rate?: number
          subtotal_amount?: number
          discount_amount?: number
          discount_percentage?: number | null
          tax_amount?: number
          shipping_amount?: number
          adjustment_amount?: number
          total_amount?: number
          amount_paid?: number
          notes_to_customer?: string | null
          terms_and_conditions?: string | null
          salesperson_id?: string | null
          contact_persons_cc?: string[] | null
          sent_at?: string | null
          viewed_at?: string | null
          paid_at?: string | null
          stripe_invoice_id?: string | null
          parent_recurring_id?: string | null
          parent_estimate_id?: string | null
          project_id?: string | null
          applied_retainer_amount?: number
          applied_credit_note_amount?: number
          custom_fields?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          invoice_number?: string
          reference_number?: string | null
          issue_date?: string
          due_date?: string | null
          payment_terms_days?: number | null
          status?: string
          currency_code?: string
          exchange_rate?: number
          subtotal_amount?: number
          discount_amount?: number
          discount_percentage?: number | null
          tax_amount?: number
          shipping_amount?: number
          adjustment_amount?: number
          total_amount?: number
          amount_paid?: number
          notes_to_customer?: string | null
          terms_and_conditions?: string | null
          salesperson_id?: string | null
          contact_persons_cc?: string[] | null
          sent_at?: string | null
          viewed_at?: string | null
          paid_at?: string | null
          stripe_invoice_id?: string | null
          parent_recurring_id?: string | null
          parent_estimate_id?: string | null
          project_id?: string | null
          applied_retainer_amount?: number
          applied_credit_note_amount?: number
          custom_fields?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      items: {
        Row: {
          id: string
          org_id: string
          name: string
          sku: string | null
          description: string | null
          type: string
          default_selling_price: number | null
          default_cost_price: number | null
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          default_tax_rate_id: string | null
          stripe_tax_code: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          name: string
          sku?: string | null
          description?: string | null
          type?: string
          default_selling_price?: number | null
          default_cost_price?: number | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          default_tax_rate_id?: string | null
          stripe_tax_code?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          sku?: string | null
          description?: string | null
          type?: string
          default_selling_price?: number | null
          default_cost_price?: number | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          default_tax_rate_id?: string | null
          stripe_tax_code?: string | null
        }
        Relationships: []
      }
      late_fee_rules: {
        Row: {
          id: string
          org_id: string
          name: string
          fee_type: string
          fee_amount: number
          grace_period_days: number
          max_total_fee_amount: number | null
          apply_to: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          fee_type: string
          fee_amount?: number
          grace_period_days?: number
          max_total_fee_amount?: number | null
          apply_to?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          fee_type?: string
          fee_amount?: number
          grace_period_days?: number
          max_total_fee_amount?: number | null
          apply_to?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      numbering_schemes: {
        Row: {
          id: string
          org_id: string
          document_type: string
          prefix: string
          next_number: number
          reset_frequency: string
          last_reset_at: string | null
          padding_zeros: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          document_type: string
          prefix?: string
          next_number?: number
          reset_frequency?: string
          last_reset_at?: string | null
          padding_zeros?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          document_type?: string
          prefix?: string
          next_number?: number
          reset_frequency?: string
          last_reset_at?: string | null
          padding_zeros?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          id: string
          org_id: string
          payment_id: string
          invoice_id: string
          allocated_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          payment_id: string
          invoice_id: string
          allocated_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          payment_id?: string
          invoice_id?: string
          allocated_amount?: number
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          payment_date: string
          amount: number
          currency_code: string
          exchange_rate: number
          payment_mode: string
          reference_number: string | null
          notes: string | null
          stripe_payment_intent_id: string | null
          stripe_charge_id: string | null
          excess_amount: number
          refunded_amount: number
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          payment_date?: string
          amount?: number
          currency_code?: string
          exchange_rate?: number
          payment_mode?: string
          reference_number?: string | null
          notes?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          excess_amount?: number
          refunded_amount?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          payment_date?: string
          amount?: number
          currency_code?: string
          exchange_rate?: number
          payment_mode?: string
          reference_number?: string | null
          notes?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          excess_amount?: number
          refunded_amount?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      project_attachments: {
        Row: {
          id: string
          org_id: string
          project_id: string
          filename: string
          storage_path: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_id: string
          filename: string
          storage_path: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          filename?: string
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          id: string
          org_id: string
          project_id: string
          name: string
          description: string | null
          task_hourly_rate: number | null
          budget_hours: number | null
          is_billable: boolean
          sort_order: number
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          project_id: string
          name: string
          description?: string | null
          task_hourly_rate?: number | null
          budget_hours?: number | null
          is_billable?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          name?: string
          description?: string | null
          task_hourly_rate?: number | null
          budget_hours?: number | null
          is_billable?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      project_users: {
        Row: {
          id: string
          org_id: string
          project_id: string
          user_id: string
          billing_rate: number | null
          cost_rate: number | null
          added_at: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          project_id: string
          user_id: string
          billing_rate?: number | null
          cost_rate?: number | null
          added_at?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          user_id?: string
          billing_rate?: number | null
          cost_rate?: number | null
          added_at?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          name: string
          description: string | null
          status: string
          start_date: string | null
          end_date: string | null
          billing_method: string
          fixed_cost_amount: number | null
          project_hourly_rate: number | null
          currency_code: string
          budget_hours: number | null
          budget_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          customer_id: string
          name: string
          description?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          billing_method: string
          fixed_cost_amount?: number | null
          project_hourly_rate?: number | null
          currency_code?: string
          budget_hours?: number | null
          budget_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          name?: string
          description?: string | null
          status?: string
          start_date?: string | null
          end_date?: string | null
          billing_method?: string
          fixed_cost_amount?: number | null
          project_hourly_rate?: number | null
          currency_code?: string
          budget_hours?: number | null
          budget_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      recurring_expense_templates: {
        Row: {
          id: string
          org_id: string
          expense_category_id: string | null
          vendor_name: string | null
          amount: number
          currency_code: string
          frequency: string
          interval_count: number
          next_run_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          expense_category_id?: string | null
          vendor_name?: string | null
          amount?: number
          currency_code?: string
          frequency: string
          interval_count?: number
          next_run_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          expense_category_id?: string | null
          vendor_name?: string | null
          amount?: number
          currency_code?: string
          frequency?: string
          interval_count?: number
          next_run_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      recurring_invoice_templates: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          name: string
          status: string
          frequency: string
          interval_count: number
          start_date: string | null
          end_date: string | null
          max_occurrences: number | null
          occurrences_to_date: number
          day_of_month: number | null
          time_of_day: string | null
          next_run_date: string | null
          last_run_date: string | null
          currency_code: string
          payment_terms_days: number
          auto_charge_stored_card: boolean
          auto_email: boolean
          notes: string | null
          terms: string | null
          template_lines: Json
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          name: string
          status?: string
          frequency: string
          interval_count?: number
          start_date?: string | null
          end_date?: string | null
          max_occurrences?: number | null
          occurrences_to_date?: number
          day_of_month?: number | null
          time_of_day?: string | null
          next_run_date?: string | null
          last_run_date?: string | null
          currency_code?: string
          payment_terms_days?: number
          auto_charge_stored_card?: boolean
          auto_email?: boolean
          notes?: string | null
          terms?: string | null
          template_lines?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          name?: string
          status?: string
          frequency?: string
          interval_count?: number
          start_date?: string | null
          end_date?: string | null
          max_occurrences?: number | null
          occurrences_to_date?: number
          day_of_month?: number | null
          time_of_day?: string | null
          next_run_date?: string | null
          last_run_date?: string | null
          currency_code?: string
          payment_terms_days?: number
          auto_charge_stored_card?: boolean
          auto_email?: boolean
          notes?: string | null
          terms?: string | null
          template_lines?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      reminder_schedules: {
        Row: {
          id: string
          org_id: string
          name: string
          schedule_offset_days: number
          template_id: string | null
          is_active: boolean
          applies_to_overdue_only: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          schedule_offset_days: number
          template_id?: string | null
          is_active?: boolean
          applies_to_overdue_only?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          schedule_offset_days?: number
          template_id?: string | null
          is_active?: boolean
          applies_to_overdue_only?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      retainer_invoices: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          project_id: string | null
          retainer_number: string
          issue_date: string
          status: string
          amount: number
          currency_code: string
          exchange_rate: number
          applied_amount: number
          available_balance: number | null
          notes: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          project_id?: string | null
          retainer_number: string
          issue_date?: string
          status?: string
          amount?: number
          currency_code?: string
          exchange_rate?: number
          applied_amount?: number
          notes?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          project_id?: string | null
          retainer_number?: string
          issue_date?: string
          status?: string
          amount?: number
          currency_code?: string
          exchange_rate?: number
          applied_amount?: number
          notes?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          id: string
          org_id: string
          customer_id: string
          stripe_customer_id: string
          default_payment_method_id: string | null
          synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          customer_id: string
          stripe_customer_id: string
          default_payment_method_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          customer_id?: string
          stripe_customer_id?: string
          default_payment_method_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          id: string
          org_id: string | null
          event_id: string
          event_type: string | null
          payload: Json | null
          processed_at: string | null
          processing_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          event_id: string
          event_type?: string | null
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          event_id?: string
          event_type?: string | null
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tax_authorities: {
        Row: {
          id: string
          org_id: string
          name: string
          jurisdiction: string | null
          tax_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          jurisdiction?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          jurisdiction?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          id: string
          org_id: string
          name: string
          rate_percentage: number
          tax_authority_id: string | null
          is_compound: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          rate_percentage?: number
          tax_authority_id?: string | null
          is_compound?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          rate_percentage?: number
          tax_authority_id?: string | null
          is_compound?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          id: string
          org_id: string
          user_id: string
          project_id: string
          project_task_id: string | null
          date: string
          hours: number
          description: string | null
          is_billable: boolean
          is_invoiced: boolean
          invoice_line_id: string | null
          is_approved: boolean
          approved_by: string | null
          approved_at: string | null
          timer_started_at: string | null
          timer_running: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id?: string
          user_id?: string
          project_id: string
          project_task_id?: string | null
          date: string
          hours?: number
          description?: string | null
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_line_id?: string | null
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          timer_started_at?: string | null
          timer_running?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          project_id?: string
          project_task_id?: string | null
          date?: string
          hours?: number
          description?: string | null
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_line_id?: string | null
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          timer_started_at?: string | null
          timer_running?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          org_id: string
          email: string
          full_name: string | null
          role: OperationsDatabase["operations"]["Enums"]["user_role"]
          default_billing_rate: number | null
          default_cost_rate: number | null
          status: string
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id: string
          email: string
          full_name?: string | null
          role?: OperationsDatabase["operations"]["Enums"]["user_role"]
          default_billing_rate?: number | null
          default_cost_rate?: number | null
          status?: string
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          email?: string
          full_name?: string | null
          role?: OperationsDatabase["operations"]["Enums"]["user_role"]
          default_billing_rate?: number | null
          default_cost_rate?: number | null
          status?: string
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      project_time_rollup: {
        Row: {
          org_id: string | null
          customer_id: string | null
          customer_name: string | null
          project_id: string | null
          project_name: string | null
          entry_count: number | null
          total_hours: number | null
          billable_hours: number | null
          nonbillable_hours: number | null
          invoiced_hours: number | null
          uninvoiced_hours: number | null
          unbilled_billable_hours: number | null
        }
        Relationships: []
      }
      ar_aging_detail: {
        Row: {
          org_id: string | null
          invoice_id: string | null
          invoice_number: string | null
          customer_id: string | null
          customer_name: string | null
          issue_date: string | null
          due_date: string | null
          total_amount: number | null
          amount_paid: number | null
          balance_due: number | null
          days_overdue: number | null
          aging_bucket: string | null
        }
        Relationships: []
      }
      ar_aging_summary: {
        Row: {
          org_id: string | null
          aging_bucket: string | null
          invoice_count: number | null
          total_balance: number | null
        }
        Relationships: []
      }
      customer_balance_summary: {
        Row: {
          org_id: string | null
          customer_id: string | null
          customer_name: string | null
          outstanding_balance: number | null
          open_invoice_count: number | null
        }
        Relationships: []
      }
      unbilled_expenses: {
        Row: {
          org_id: string | null
          customer_id: string | null
          customer_name: string | null
          project_id: string | null
          project_name: string | null
          unbilled_amount: number | null
          expense_count: number | null
        }
        Relationships: []
      }
      unbilled_hours: {
        Row: {
          org_id: string | null
          customer_id: string | null
          customer_name: string | null
          project_id: string | null
          project_name: string | null
          unbilled_hours: number | null
          entry_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "admin" | "sales_user" | "sales_manager" | "read_only"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

const SUPABASE_URL = "https://svprhtzawnbzmumxnhsq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cHJodHphd25iem11bXhuaHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc2MDQsImV4cCI6MjA5MTI1MzYwNH0.R9WzFR4olqp1tdWa-pj-2WSL2L0Mjcf2tSA8LhOWclA";

// Dedicated client whose default schema is `operations`. It shares the auth session with the
// primary public client via the SAME storageKey, and disables its own token refresh so only the
// primary client drives refresh (avoids two clients dueling over the token). Because it reads the
// same logged-in user's JWT, operations RLS applies exactly as it does for the main client.
// `supabase-js` will emit a "Multiple GoTrueClient instances" console warning. That is expected
// and harmless given the shared storageKey.
export const opsSupabase = createClient<OperationsDatabase>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    db: { schema: "operations" },
    auth: {
      storage: localStorage,
      storageKey: "sb-svprhtzawnbzmumxnhsq-auth-token",
      persistSession: true,
      autoRefreshToken: false,
    },
  },
);
