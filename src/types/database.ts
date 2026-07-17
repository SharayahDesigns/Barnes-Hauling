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
      availability_rules: {
        Row: {
          booking_cutoff: string | null
          capacity: number
          created_at: string
          day_of_week: number
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean
          local_end_time: string
          local_start_time: string
          service_id: string
          service_item_id: string | null
          service_zone_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          booking_cutoff?: string | null
          capacity: number
          created_at?: string
          day_of_week: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          local_end_time: string
          local_start_time: string
          service_id: string
          service_item_id?: string | null
          service_zone_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          booking_cutoff?: string | null
          capacity?: number
          created_at?: string
          day_of_week?: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          local_end_time?: string
          local_start_time?: string
          service_id?: string
          service_item_id?: string | null
          service_zone_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_service_zone_id_fkey"
            columns: ["service_zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      blackout_dates: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          internal_reason: string
          is_active: boolean
          public_message: string | null
          service_area_id: string | null
          service_id: string | null
          service_item_id: string | null
          service_zone_id: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          internal_reason: string
          is_active?: boolean
          public_message?: string | null
          service_area_id?: string | null
          service_id?: string | null
          service_item_id?: string | null
          service_zone_id?: string | null
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          internal_reason?: string
          is_active?: boolean
          public_message?: string | null
          service_area_id?: string | null
          service_id?: string | null
          service_item_id?: string | null
          service_zone_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blackout_dates_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blackout_dates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blackout_dates_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blackout_dates_service_zone_id_fkey"
            columns: ["service_zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          booking_id: string
          created_at: string
          customer_notified_at: string | null
          event_at: string
          event_type: string
          id: string
          metadata: Json
          new_status: Database["public"]["Enums"]["booking_status"] | null
          performed_by: string | null
          previous_status: Database["public"]["Enums"]["booking_status"] | null
          reason: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_notified_at?: string | null
          event_at?: string
          event_type: string
          id?: string
          metadata?: Json
          new_status?: Database["public"]["Enums"]["booking_status"] | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["booking_status"] | null
          reason?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_notified_at?: string | null
          event_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          new_status?: Database["public"]["Enums"]["booking_status"] | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["booking_status"] | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_items: {
        Row: {
          booking_price_snapshot_id: string
          created_at: string
          description: string | null
          id: string
          label: string
          line_kind: Database["public"]["Enums"]["pricing_rule_kind"]
          line_total_cents: number
          percentage_basis_points: number | null
          pricing_rule_version_id: string | null
          quantity: number
          sort_order: number
          unit: Database["public"]["Enums"]["pricing_unit"] | null
          unit_amount_cents: number | null
        }
        Insert: {
          booking_price_snapshot_id: string
          created_at?: string
          description?: string | null
          id?: string
          label: string
          line_kind: Database["public"]["Enums"]["pricing_rule_kind"]
          line_total_cents: number
          percentage_basis_points?: number | null
          pricing_rule_version_id?: string | null
          quantity?: number
          sort_order?: number
          unit?: Database["public"]["Enums"]["pricing_unit"] | null
          unit_amount_cents?: number | null
        }
        Update: {
          booking_price_snapshot_id?: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          line_kind?: Database["public"]["Enums"]["pricing_rule_kind"]
          line_total_cents?: number
          percentage_basis_points?: number | null
          pricing_rule_version_id?: string | null
          quantity?: number
          sort_order?: number
          unit?: Database["public"]["Enums"]["pricing_unit"] | null
          unit_amount_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_price_snapshot_id_fkey"
            columns: ["booking_price_snapshot_id"]
            isOneToOne: false
            referencedRelation: "booking_price_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_pricing_rule_version_id_fkey"
            columns: ["pricing_rule_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_price_snapshots: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          discount_cents: number
          finalized_at: string | null
          id: string
          pricing_version_id: string
          range_max_cents: number | null
          range_min_cents: number | null
          revision_number: number
          snapshot_payload: Json | null
          snapshot_sha256: string | null
          snapshot_type: Database["public"]["Enums"]["price_snapshot_type"]
          source_quote_revision_id: string | null
          subtotal_cents: number | null
          tax_cents: number
          total_cents: number | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_cents?: number
          finalized_at?: string | null
          id?: string
          pricing_version_id: string
          range_max_cents?: number | null
          range_min_cents?: number | null
          revision_number: number
          snapshot_payload?: Json | null
          snapshot_sha256?: string | null
          snapshot_type: Database["public"]["Enums"]["price_snapshot_type"]
          source_quote_revision_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number
          total_cents?: number | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_cents?: number
          finalized_at?: string | null
          id?: string
          pricing_version_id?: string
          range_max_cents?: number | null
          range_min_cents?: number | null
          revision_number?: number
          snapshot_payload?: Json | null
          snapshot_sha256?: string | null
          snapshot_type?: Database["public"]["Enums"]["price_snapshot_type"]
          source_quote_revision_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number
          total_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_price_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_price_snapshots_pricing_version_id_fkey"
            columns: ["pricing_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_price_snapshots_source_quote_revision_id_fkey"
            columns: ["source_quote_revision_id"]
            isOneToOne: false
            referencedRelation: "quote_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_number: number
          created_at: string
          customer_id: string
          customer_instructions: string | null
          id: string
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          service_address_id: string
          service_id: string
          service_item_id: string | null
          source_quote_revision_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          booking_number?: number
          created_at?: string
          customer_id: string
          customer_instructions?: string | null
          id?: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          service_address_id: string
          service_id: string
          service_item_id?: string | null
          source_quote_revision_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          booking_number?: number
          created_at?: string
          customer_id?: string
          customer_instructions?: string | null
          id?: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          service_address_id?: string
          service_id?: string
          service_item_id?: string | null
          source_quote_revision_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_address_id_fkey"
            columns: ["service_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_source_quote_revision_id_fkey"
            columns: ["source_quote_revision_id"]
            isOneToOne: false
            referencedRelation: "quote_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country_code: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string | null
          latitude: number | null
          longitude: number | null
          postal_code: string
          region: string
          service_area_id: string | null
          service_zone_id: string | null
          updated_at: string
          validation_provider: string | null
          validation_reference: string | null
          validation_status: Database["public"]["Enums"]["address_validation_status"]
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country_code?: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code: string
          region: string
          service_area_id?: string | null
          service_zone_id?: string | null
          updated_at?: string
          validation_provider?: string | null
          validation_reference?: string | null
          validation_status?: Database["public"]["Enums"]["address_validation_status"]
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country_code?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string
          region?: string
          service_area_id?: string | null
          service_zone_id?: string | null
          updated_at?: string
          validation_provider?: string | null
          validation_reference?: string | null
          validation_status?: Database["public"]["Enums"]["address_validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_service_zone_id_fkey"
            columns: ["service_zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dumpster_assignments: {
        Row: {
          assigned_by: string | null
          assignment_window: unknown
          booking_id: string
          created_at: string
          dumpster_id: string
          ends_at: string
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["dumpster_assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assignment_window?: unknown
          booking_id: string
          created_at?: string
          dumpster_id: string
          ends_at: string
          id?: string
          starts_at: string
          status?: Database["public"]["Enums"]["dumpster_assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assignment_window?: unknown
          booking_id?: string
          created_at?: string
          dumpster_id?: string
          ends_at?: string
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["dumpster_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dumpster_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dumpster_assignments_dumpster_id_fkey"
            columns: ["dumpster_id"]
            isOneToOne: false
            referencedRelation: "dumpsters"
            referencedColumns: ["id"]
          },
        ]
      }
      dumpster_sizes: {
        Row: {
          capacity_cubic_yards: number
          code: string
          created_at: string
          id: string
          length_feet: number | null
          name: string
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
          wall_height_feet: number | null
          width_feet: number | null
        }
        Insert: {
          capacity_cubic_yards: number
          code: string
          created_at?: string
          id?: string
          length_feet?: number | null
          name: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
          wall_height_feet?: number | null
          width_feet?: number | null
        }
        Update: {
          capacity_cubic_yards?: number
          code?: string
          created_at?: string
          id?: string
          length_feet?: number | null
          name?: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
          wall_height_feet?: number | null
          width_feet?: number | null
        }
        Relationships: []
      }
      dumpster_status_history: {
        Row: {
          booking_id: string | null
          changed_at: string
          changed_by: string | null
          dumpster_id: string
          id: string
          location: string | null
          new_status: Database["public"]["Enums"]["dumpster_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["dumpster_status"] | null
        }
        Insert: {
          booking_id?: string | null
          changed_at?: string
          changed_by?: string | null
          dumpster_id: string
          id?: string
          location?: string | null
          new_status: Database["public"]["Enums"]["dumpster_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["dumpster_status"]
            | null
        }
        Update: {
          booking_id?: string | null
          changed_at?: string
          changed_by?: string | null
          dumpster_id?: string
          id?: string
          location?: string | null
          new_status?: Database["public"]["Enums"]["dumpster_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["dumpster_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "dumpster_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dumpster_status_history_dumpster_id_fkey"
            columns: ["dumpster_id"]
            isOneToOne: false
            referencedRelation: "dumpsters"
            referencedColumns: ["id"]
          },
        ]
      }
      dumpsters: {
        Row: {
          asset_number: string
          available_at: string | null
          condition_notes: string | null
          created_at: string
          current_location: string | null
          dumpster_size_id: string
          id: string
          last_inspected_at: string | null
          maintenance_notes: string | null
          purchase_date: string | null
          status: Database["public"]["Enums"]["dumpster_status"]
          updated_at: string
        }
        Insert: {
          asset_number: string
          available_at?: string | null
          condition_notes?: string | null
          created_at?: string
          current_location?: string | null
          dumpster_size_id: string
          id?: string
          last_inspected_at?: string | null
          maintenance_notes?: string | null
          purchase_date?: string | null
          status?: Database["public"]["Enums"]["dumpster_status"]
          updated_at?: string
        }
        Update: {
          asset_number?: string
          available_at?: string | null
          condition_notes?: string | null
          created_at?: string
          current_location?: string | null
          dumpster_size_id?: string
          id?: string
          last_inspected_at?: string | null
          maintenance_notes?: string | null
          purchase_date?: string | null
          status?: Database["public"]["Enums"]["dumpster_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dumpsters_dumpster_size_id_fkey"
            columns: ["dumpster_size_id"]
            isOneToOne: false
            referencedRelation: "dumpster_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          booking_id: string | null
          bucket_id: string
          category: Database["public"]["Enums"]["file_category"]
          created_at: string
          customer_id: string
          declared_mime_type: string
          description: string | null
          detected_mime_type: string | null
          extension: string
          id: string
          legal_hold: boolean
          object_path: string
          original_filename: string
          quote_id: string | null
          retention_date: string | null
          sha256: string | null
          signature_verified_at: string | null
          size_bytes: number
          updated_at: string
          uploaded_by: string | null
          validation_status: Database["public"]["Enums"]["file_validation_status"]
          visibility: Database["public"]["Enums"]["file_visibility"]
        }
        Insert: {
          booking_id?: string | null
          bucket_id: string
          category: Database["public"]["Enums"]["file_category"]
          created_at?: string
          customer_id: string
          declared_mime_type: string
          description?: string | null
          detected_mime_type?: string | null
          extension: string
          id?: string
          legal_hold?: boolean
          object_path: string
          original_filename: string
          quote_id?: string | null
          retention_date?: string | null
          sha256?: string | null
          signature_verified_at?: string | null
          size_bytes: number
          updated_at?: string
          uploaded_by?: string | null
          validation_status?: Database["public"]["Enums"]["file_validation_status"]
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Update: {
          booking_id?: string | null
          bucket_id?: string
          category?: Database["public"]["Enums"]["file_category"]
          created_at?: string
          customer_id?: string
          declared_mime_type?: string
          description?: string | null
          detected_mime_type?: string | null
          extension?: string
          id?: string
          legal_hold?: boolean
          object_path?: string
          original_filename?: string
          quote_id?: string | null
          retention_date?: string | null
          sha256?: string | null
          signature_verified_at?: string | null
          size_bytes?: number
          updated_at?: string
          uploaded_by?: string | null
          validation_status?: Database["public"]["Enums"]["file_validation_status"]
          visibility?: Database["public"]["Enums"]["file_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "files_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_consents: {
        Row: {
          channel: Database["public"]["Enums"]["consent_channel"]
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          customer_id: string
          destination: string
          id: string
          ip_address: unknown
          language_shown: string
          language_version: string
          occurred_at: string
          opt_out_at: string | null
          source: string
          status: Database["public"]["Enums"]["consent_status"]
        }
        Insert: {
          channel: Database["public"]["Enums"]["consent_channel"]
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          customer_id: string
          destination: string
          id?: string
          ip_address?: unknown
          language_shown: string
          language_version: string
          occurred_at?: string
          opt_out_at?: string | null
          source: string
          status: Database["public"]["Enums"]["consent_status"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["consent_channel"]
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          customer_id?: string
          destination?: string
          id?: string
          ip_address?: unknown
          language_shown?: string
          language_version?: string
          occurred_at?: string
          opt_out_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["consent_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rule_versions: {
        Row: {
          amount_cents: number | null
          created_at: string
          customer_description: string
          direction: Database["public"]["Enums"]["adjustment_direction"]
          effective_from: string | null
          effective_to: string | null
          eligibility_conditions: Json
          id: string
          included_quantity: number | null
          internal_description: string | null
          percentage_basis_points: number | null
          pricing_rule_id: string
          pricing_version_id: string
          range_max_cents: number | null
          range_min_cents: number | null
          rounding_increment: number | null
          rounding_mode: Database["public"]["Enums"]["pricing_rounding_mode"]
          unit: Database["public"]["Enums"]["pricing_unit"] | null
          value_type: Database["public"]["Enums"]["pricing_value_type"]
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          customer_description: string
          direction?: Database["public"]["Enums"]["adjustment_direction"]
          effective_from?: string | null
          effective_to?: string | null
          eligibility_conditions?: Json
          id?: string
          included_quantity?: number | null
          internal_description?: string | null
          percentage_basis_points?: number | null
          pricing_rule_id: string
          pricing_version_id: string
          range_max_cents?: number | null
          range_min_cents?: number | null
          rounding_increment?: number | null
          rounding_mode?: Database["public"]["Enums"]["pricing_rounding_mode"]
          unit?: Database["public"]["Enums"]["pricing_unit"] | null
          value_type: Database["public"]["Enums"]["pricing_value_type"]
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          customer_description?: string
          direction?: Database["public"]["Enums"]["adjustment_direction"]
          effective_from?: string | null
          effective_to?: string | null
          eligibility_conditions?: Json
          id?: string
          included_quantity?: number | null
          internal_description?: string | null
          percentage_basis_points?: number | null
          pricing_rule_id?: string
          pricing_version_id?: string
          range_max_cents?: number | null
          range_min_cents?: number | null
          rounding_increment?: number | null
          rounding_mode?: Database["public"]["Enums"]["pricing_rounding_mode"]
          unit?: Database["public"]["Enums"]["pricing_unit"] | null
          value_type?: Database["public"]["Enums"]["pricing_value_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rule_versions_pricing_rule_id_fkey"
            columns: ["pricing_rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rule_versions_pricing_version_id_fkey"
            columns: ["pricing_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          code: string
          created_at: string
          id: string
          internal_description: string | null
          is_active: boolean
          name: string
          priority: number
          rule_kind: Database["public"]["Enums"]["pricing_rule_kind"]
          service_id: string
          service_item_id: string | null
          service_zone_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          internal_description?: string | null
          is_active?: boolean
          name: string
          priority?: number
          rule_kind: Database["public"]["Enums"]["pricing_rule_kind"]
          service_id: string
          service_item_id?: string | null
          service_zone_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          internal_description?: string | null
          is_active?: boolean
          name?: string
          priority?: number
          rule_kind?: Database["public"]["Enums"]["pricing_rule_kind"]
          service_id?: string
          service_item_id?: string | null
          service_zone_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_service_zone_id_fkey"
            columns: ["service_zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_version_terms: {
        Row: {
          code: string
          created_at: string
          id: string
          legal_review_required: boolean
          pricing_version_id: string
          service_item_id: string | null
          sort_order: number
          term_text: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          legal_review_required?: boolean
          pricing_version_id: string
          service_item_id?: string | null
          sort_order?: number
          term_text: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          legal_review_required?: boolean
          pricing_version_id?: string
          service_item_id?: string | null
          sort_order?: number
          term_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_version_terms_pricing_version_id_fkey"
            columns: ["pricing_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_version_terms_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_versions: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          effective_from: string | null
          effective_to: string | null
          id: string
          legal_review_required: boolean
          publication_blockers: string[]
          published_at: string | null
          source_document_date: string | null
          source_document_path: string | null
          source_document_sha256: string | null
          status: Database["public"]["Enums"]["pricing_version_status"]
          updated_at: string
          version_number: number
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          legal_review_required?: boolean
          publication_blockers?: string[]
          published_at?: string | null
          source_document_date?: string | null
          source_document_path?: string | null
          source_document_sha256?: string | null
          status?: Database["public"]["Enums"]["pricing_version_status"]
          updated_at?: string
          version_number: number
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          legal_review_required?: boolean
          publication_blockers?: string[]
          published_at?: string | null
          source_document_date?: string | null
          source_document_path?: string | null
          source_document_sha256?: string | null
          status?: Database["public"]["Enums"]["pricing_version_status"]
          updated_at?: string
          version_number?: number
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_quote_required: boolean
          label: string
          line_kind: Database["public"]["Enums"]["pricing_rule_kind"]
          line_total_cents: number | null
          percentage_basis_points: number | null
          pricing_rule_version_id: string | null
          quantity: number
          quote_revision_id: string
          sort_order: number
          unit: Database["public"]["Enums"]["pricing_unit"] | null
          unit_amount_cents: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_quote_required?: boolean
          label: string
          line_kind: Database["public"]["Enums"]["pricing_rule_kind"]
          line_total_cents?: number | null
          percentage_basis_points?: number | null
          pricing_rule_version_id?: string | null
          quantity?: number
          quote_revision_id: string
          sort_order?: number
          unit?: Database["public"]["Enums"]["pricing_unit"] | null
          unit_amount_cents?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_quote_required?: boolean
          label?: string
          line_kind?: Database["public"]["Enums"]["pricing_rule_kind"]
          line_total_cents?: number | null
          percentage_basis_points?: number | null
          pricing_rule_version_id?: string | null
          quantity?: number
          quote_revision_id?: string
          sort_order?: number
          unit?: Database["public"]["Enums"]["pricing_unit"] | null
          unit_amount_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_pricing_rule_version_id_fkey"
            columns: ["pricing_rule_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_revision_id_fkey"
            columns: ["quote_revision_id"]
            isOneToOne: false
            referencedRelation: "quote_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_revisions: {
        Row: {
          calculation_inputs: Json
          created_at: string
          created_by: string | null
          currency_code: string
          discount_cents: number
          finalized_at: string | null
          id: string
          pricing_version_id: string
          quote_id: string
          range_max_cents: number | null
          range_min_cents: number | null
          revision_number: number
          snapshot_payload: Json | null
          snapshot_sha256: string | null
          snapshot_type: Database["public"]["Enums"]["price_snapshot_type"]
          subtotal_cents: number | null
          tax_cents: number
          total_cents: number | null
        }
        Insert: {
          calculation_inputs?: Json
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_cents?: number
          finalized_at?: string | null
          id?: string
          pricing_version_id: string
          quote_id: string
          range_max_cents?: number | null
          range_min_cents?: number | null
          revision_number: number
          snapshot_payload?: Json | null
          snapshot_sha256?: string | null
          snapshot_type: Database["public"]["Enums"]["price_snapshot_type"]
          subtotal_cents?: number | null
          tax_cents?: number
          total_cents?: number | null
        }
        Update: {
          calculation_inputs?: Json
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_cents?: number
          finalized_at?: string | null
          id?: string
          pricing_version_id?: string
          quote_id?: string
          range_max_cents?: number | null
          range_min_cents?: number | null
          revision_number?: number
          snapshot_payload?: Json | null
          snapshot_sha256?: string | null
          snapshot_type?: Database["public"]["Enums"]["price_snapshot_type"]
          subtotal_cents?: number | null
          tax_cents?: number
          total_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_revisions_pricing_version_id_fkey"
            columns: ["pricing_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["quote_status"]
          previous_status: Database["public"]["Enums"]["quote_status"] | null
          quote_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["quote_status"]
          previous_status?: Database["public"]["Enums"]["quote_status"] | null
          quote_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["quote_status"]
          previous_status?: Database["public"]["Enums"]["quote_status"] | null
          quote_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          quote_number: number
          request_details: Json
          service_address_id: string
          service_id: string
          service_item_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          quote_number?: number
          request_details?: Json
          service_address_id: string
          service_id: string
          service_item_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          quote_number?: number
          request_details?: Json
          service_address_id?: string
          service_id?: string
          service_item_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_address_id_fkey"
            columns: ["service_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          public_description: string | null
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          public_description?: string | null
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          public_description?: string | null
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Relationships: []
      }
      service_items: {
        Row: {
          code: string
          created_at: string
          default_rental_days: number | null
          description: string | null
          dumpster_size_id: string | null
          id: string
          item_kind: Database["public"]["Enums"]["service_item_kind"]
          name: string
          service_id: string
          sort_order: number
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_rental_days?: number | null
          description?: string | null
          dumpster_size_id?: string | null
          id?: string
          item_kind: Database["public"]["Enums"]["service_item_kind"]
          name: string
          service_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_rental_days?: number | null
          description?: string | null
          dumpster_size_id?: string | null
          id?: string
          item_kind?: Database["public"]["Enums"]["service_item_kind"]
          name?: string
          service_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_items_dumpster_size_id_fkey"
            columns: ["dumpster_size_id"]
            isOneToOne: false
            referencedRelation: "dumpster_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_zone_postal_codes: {
        Row: {
          country_code: string
          created_at: string
          id: string
          postal_code: string
          service_zone_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          postal_code: string
          service_zone_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          postal_code?: string
          service_zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_zone_postal_codes_service_zone_id_fkey"
            columns: ["service_zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      service_zones: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          service_area_id: string
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          service_area_id: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          service_area_id?: string
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_zones_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
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
      address_validation_status:
        | "pending"
        | "validated"
        | "outside_service_area"
        | "failed"
      adjustment_direction: "charge" | "credit"
      booking_status:
        | "draft"
        | "pending_review"
        | "pending_payment"
        | "confirmed"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      catalog_status: "draft" | "active" | "inactive"
      consent_channel: "email" | "sms"
      consent_status: "granted" | "denied" | "revoked"
      consent_type: "transactional" | "marketing"
      dumpster_assignment_status:
        | "reserved"
        | "assigned"
        | "released"
        | "cancelled"
      dumpster_status:
        | "available"
        | "reserved"
        | "scheduled_for_delivery"
        | "in_transit"
        | "at_customer"
        | "pickup_requested"
        | "scheduled_for_pickup"
        | "in_transit_to_disposal_site"
        | "at_disposal_site"
        | "returning"
        | "inspection_required"
        | "maintenance"
        | "unavailable"
        | "retired"
      file_category:
        | "quote_photo"
        | "before_service_photo"
        | "after_service_photo"
        | "dumpster_placement_photo"
        | "driveway_condition_photo"
        | "container_condition_photo"
        | "prohibited_material_evidence"
        | "damage_evidence"
        | "weight_ticket"
        | "donation_receipt"
        | "recycling_receipt"
        | "signed_agreement"
        | "commercial_document"
        | "tax_exempt_certificate"
        | "other"
      file_validation_status: "pending" | "validated" | "rejected"
      file_visibility: "customer" | "staff_only"
      price_snapshot_type: "fixed_amount" | "estimated_range" | "quote_required"
      pricing_rounding_mode:
        | "not_applicable"
        | "half_up"
        | "half_even"
        | "ceiling"
        | "floor"
        | "truncate"
      pricing_rule_kind:
        | "base_price"
        | "surcharge"
        | "discount"
        | "tax"
        | "included_allowance"
        | "conditional_fee"
      pricing_unit: "each" | "ton" | "day" | "mile" | "rental"
      pricing_value_type:
        | "fixed_amount"
        | "per_unit"
        | "percentage"
        | "estimated_range"
        | "quote_required"
      pricing_version_status: "draft" | "published" | "retired"
      quote_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "sent"
        | "awaiting_customer_approval"
        | "approved"
        | "declined"
        | "expired"
        | "cancelled"
        | "lost"
        | "spam"
      service_item_kind: "rental_package" | "specialty_item" | "hauling_item"
      service_type: "hauling" | "dumpster_rental"
      staff_role:
        | "owner"
        | "administrator"
        | "dispatcher"
        | "estimator"
        | "crew_lead"
        | "crew_member"
        | "accounting"
        | "customer_support"
        | "read_only_analyst"
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
      address_validation_status: [
        "pending",
        "validated",
        "outside_service_area",
        "failed",
      ],
      adjustment_direction: ["charge", "credit"],
      booking_status: [
        "draft",
        "pending_review",
        "pending_payment",
        "confirmed",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      catalog_status: ["draft", "active", "inactive"],
      consent_channel: ["email", "sms"],
      consent_status: ["granted", "denied", "revoked"],
      consent_type: ["transactional", "marketing"],
      dumpster_assignment_status: [
        "reserved",
        "assigned",
        "released",
        "cancelled",
      ],
      dumpster_status: [
        "available",
        "reserved",
        "scheduled_for_delivery",
        "in_transit",
        "at_customer",
        "pickup_requested",
        "scheduled_for_pickup",
        "in_transit_to_disposal_site",
        "at_disposal_site",
        "returning",
        "inspection_required",
        "maintenance",
        "unavailable",
        "retired",
      ],
      file_category: [
        "quote_photo",
        "before_service_photo",
        "after_service_photo",
        "dumpster_placement_photo",
        "driveway_condition_photo",
        "container_condition_photo",
        "prohibited_material_evidence",
        "damage_evidence",
        "weight_ticket",
        "donation_receipt",
        "recycling_receipt",
        "signed_agreement",
        "commercial_document",
        "tax_exempt_certificate",
        "other",
      ],
      file_validation_status: ["pending", "validated", "rejected"],
      file_visibility: ["customer", "staff_only"],
      price_snapshot_type: [
        "fixed_amount",
        "estimated_range",
        "quote_required",
      ],
      pricing_rounding_mode: [
        "not_applicable",
        "half_up",
        "half_even",
        "ceiling",
        "floor",
        "truncate",
      ],
      pricing_rule_kind: [
        "base_price",
        "surcharge",
        "discount",
        "tax",
        "included_allowance",
        "conditional_fee",
      ],
      pricing_unit: ["each", "ton", "day", "mile", "rental"],
      pricing_value_type: [
        "fixed_amount",
        "per_unit",
        "percentage",
        "estimated_range",
        "quote_required",
      ],
      pricing_version_status: ["draft", "published", "retired"],
      quote_status: [
        "draft",
        "submitted",
        "in_review",
        "sent",
        "awaiting_customer_approval",
        "approved",
        "declined",
        "expired",
        "cancelled",
        "lost",
        "spam",
      ],
      service_item_kind: ["rental_package", "specialty_item", "hauling_item"],
      service_type: ["hauling", "dumpster_rental"],
      staff_role: [
        "owner",
        "administrator",
        "dispatcher",
        "estimator",
        "crew_lead",
        "crew_member",
        "accounting",
        "customer_support",
        "read_only_analyst",
      ],
    },
  },
} as const
