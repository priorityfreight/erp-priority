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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          event: string
          id: string
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          event: string
          id?: string
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          event?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_invoices: {
        Row: {
          client_id: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          shipment_id: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          shipment_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          shipment_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_logistics_parties: {
        Row: {
          city: string | null
          city_unlocode: string | null
          city_unlocode_id: string | null
          client_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          full_address: string | null
          id: string
          name: string
          party_type: string
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          city_unlocode?: string | null
          city_unlocode_id?: string | null
          client_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          full_address?: string | null
          id?: string
          name: string
          party_type?: string
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          city_unlocode?: string | null
          city_unlocode_id?: string | null
          client_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          full_address?: string | null
          id?: string
          name?: string
          party_type?: string
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_logistics_parties_city_unlocode_id_fkey"
            columns: ["city_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocode_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_logistics_parties_city_unlocode_id_fkey"
            columns: ["city_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_logistics_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_logistics_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_logistics_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_logistics_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_logistics_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_logistics_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_logistics_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
        ]
      }
      clients: {
        Row: {
          account_owner_id: string | null
          branch_id: string | null
          city: string | null
          city_unlocode: string | null
          city_unlocode_id: string | null
          company_name: string
          corporate_phone: string | null
          country: string | null
          created_at: string | null
          credit_days: number | null
          credit_limit: number | null
          full_address: string | null
          id: string
          industry: string | null
          is_deleted: boolean
          postal_code: string | null
          prospect_id: string | null
          search_text: string
          status: string
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          account_owner_id?: string | null
          branch_id?: string | null
          city?: string | null
          city_unlocode?: string | null
          city_unlocode_id?: string | null
          company_name: string
          corporate_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          full_address?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean
          postal_code?: string | null
          prospect_id?: string | null
          search_text?: string
          status?: string
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          account_owner_id?: string | null
          branch_id?: string | null
          city?: string | null
          city_unlocode?: string | null
          city_unlocode_id?: string | null
          company_name?: string
          corporate_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          full_address?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean
          postal_code?: string | null
          prospect_id?: string | null
          search_text?: string
          status?: string
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_city_unlocode_id_fkey"
            columns: ["city_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocode_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_city_unlocode_id_fkey"
            columns: ["city_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          actual_profit: number | null
          commission_amount: number | null
          commission_percentage: number | null
          created_at: string
          expected_profit: number | null
          id: string
          shipment_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_profit?: number | null
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          expected_profit?: number | null
          id?: string
          shipment_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_profit?: number | null
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          expected_profit?: number | null
          id?: string
          shipment_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_salesperson_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean
          linkedin_url: string | null
          name: string
          phone: string | null
          position: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          name: string
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
        ]
      }
      external_data_sources: {
        Row: {
          code: string
          created_at: string
          id: string
          last_imported_at: string | null
          license: string | null
          name: string
          provider: string
          refresh_strategy: string | null
          source_url: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          last_imported_at?: string | null
          license?: string | null
          name: string
          provider: string
          refresh_strategy?: string | null
          source_url: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          last_imported_at?: string | null
          license?: string | null
          name?: string
          provider?: string
          refresh_strategy?: string | null
          source_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      incoterms: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          destination: string | null
          destination_unlocode: string | null
          destination_unlocode_id: string | null
          estimated_close_date: string | null
          estimated_value: number | null
          expected_profit_usd: number | null
          expiration_date: string | null
          id: string
          origin: string | null
          origin_unlocode: string | null
          origin_unlocode_id: string | null
          probability: number | null
          salesperson_id: string | null
          service_quantity: number | null
          service_type: string | null
          stage: string
          start_date: string | null
          status: string
          title: string
          trade_lane: string | null
          transport_type: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          destination?: string | null
          destination_unlocode?: string | null
          destination_unlocode_id?: string | null
          estimated_close_date?: string | null
          estimated_value?: number | null
          expected_profit_usd?: number | null
          expiration_date?: string | null
          id?: string
          origin?: string | null
          origin_unlocode?: string | null
          origin_unlocode_id?: string | null
          probability?: number | null
          salesperson_id?: string | null
          service_quantity?: number | null
          service_type?: string | null
          stage?: string
          start_date?: string | null
          status?: string
          title: string
          trade_lane?: string | null
          transport_type?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          destination?: string | null
          destination_unlocode?: string | null
          destination_unlocode_id?: string | null
          estimated_close_date?: string | null
          estimated_value?: number | null
          expected_profit_usd?: number | null
          expiration_date?: string | null
          id?: string
          origin?: string | null
          origin_unlocode?: string | null
          origin_unlocode_id?: string | null
          probability?: number | null
          salesperson_id?: string | null
          service_quantity?: number | null
          service_type?: string | null
          stage?: string
          start_date?: string | null
          status?: string
          title?: string
          trade_lane?: string | null
          transport_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_opportunities_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_opportunities_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_opportunities_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_opportunities_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_opportunities_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_opportunities_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_opportunities_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_destination_unlocode_id_fkey"
            columns: ["destination_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocode_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_destination_unlocode_id_fkey"
            columns: ["destination_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_origin_unlocode_id_fkey"
            columns: ["origin_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocode_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_origin_unlocode_id_fkey"
            columns: ["origin_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          branch_id: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          source: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          phone: string | null
          position: string | null
          provider_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          phone?: string | null
          position?: string | null
          provider_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          provider_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_invoices: {
        Row: {
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          provider_id: string
          shipment_id: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          provider_id: string
          shipment_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          provider_id?: string
          shipment_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_invoices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_invoices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_service_offerings: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          service_transport_type_id: string
          terms_and_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          service_transport_type_id: string
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          service_transport_type_id?: string
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_service_offerings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_offerings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_offerings_service_transport_type_id_fkey"
            columns: ["service_transport_type_id"]
            isOneToOne: false
            referencedRelation: "service_transport_type_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_offerings_service_transport_type_id_fkey"
            columns: ["service_transport_type_id"]
            isOneToOne: false
            referencedRelation: "service_transport_types"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          city: string | null
          city_unlocode: string | null
          city_unlocode_id: string | null
          company_email: string | null
          corporate_phone: string | null
          country: string | null
          created_at: string
          credit_active: boolean
          credit_amount: number | null
          credit_days: number | null
          full_address: string | null
          id: string
          name: string
          postal_code: string | null
          provider_type: string | null
          status: string
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          city_unlocode?: string | null
          city_unlocode_id?: string | null
          company_email?: string | null
          corporate_phone?: string | null
          country?: string | null
          created_at?: string
          credit_active?: boolean
          credit_amount?: number | null
          credit_days?: number | null
          full_address?: string | null
          id?: string
          name: string
          postal_code?: string | null
          provider_type?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          city_unlocode?: string | null
          city_unlocode_id?: string | null
          company_email?: string | null
          corporate_phone?: string | null
          country?: string | null
          created_at?: string
          credit_active?: boolean
          credit_amount?: number | null
          credit_days?: number | null
          full_address?: string | null
          id?: string
          name?: string
          postal_code?: string | null
          provider_type?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_city_unlocode_id_fkey"
            columns: ["city_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocode_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_city_unlocode_id_fkey"
            columns: ["city_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocodes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_costs: {
        Row: {
          cost: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          provider_id: string | null
          quotation_id: string
          service_name: string
        }
        Insert: {
          cost: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          provider_id?: string | null
          quotation_id: string
          service_name: string
        }
        Update: {
          cost?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          provider_id?: string | null
          quotation_id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_costs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_costs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_costs_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_costs_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          cargo_type: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          currency: string
          destination: string | null
          estimated_cost: number | null
          estimated_price: number | null
          expected_profit: number | null
          id: string
          incoterm_id: string | null
          opportunity_id: string
          origin: string | null
          reference_number: string | null
          service_type: string | null
          status: string
          updated_at: string | null
          valid_until: string | null
          volume: number | null
          weight: number | null
        }
        Insert: {
          cargo_type?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          destination?: string | null
          estimated_cost?: number | null
          estimated_price?: number | null
          expected_profit?: number | null
          id?: string
          incoterm_id?: string | null
          opportunity_id: string
          origin?: string | null
          reference_number?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string | null
          valid_until?: string | null
          volume?: number | null
          weight?: number | null
        }
        Update: {
          cargo_type?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          destination?: string | null
          estimated_cost?: number | null
          estimated_price?: number | null
          expected_profit?: number | null
          id?: string
          incoterm_id?: string | null
          opportunity_id?: string
          origin?: string | null
          reference_number?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string | null
          valid_until?: string | null
          volume?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_incoterm_id_fkey"
            columns: ["incoterm_id"]
            isOneToOne: false
            referencedRelation: "incoterms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_transport_types: {
        Row: {
          created_at: string
          id: string
          service_type: string
          transport_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          service_type: string
          transport_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          service_type?: string
          transport_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shipment_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          location: string | null
          notes: string | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string
          event_type: string
          id?: string
          location?: string | null
          notes?: string | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          arrival_date: string | null
          booking_number: string | null
          client_id: string
          created_at: string
          delivered_at: string | null
          departure_date: string | null
          destination: string | null
          id: string
          origin: string | null
          quotation_id: string
          shipment_reference: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          arrival_date?: string | null
          booking_number?: string | null
          client_id: string
          created_at?: string
          delivered_at?: string | null
          departure_date?: string | null
          destination?: string | null
          id?: string
          origin?: string | null
          quotation_id: string
          shipment_reference?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          arrival_date?: string | null
          booking_number?: string | null
          client_id?: string
          created_at?: string
          delivered_at?: string | null
          departure_date?: string | null
          destination?: string | null
          id?: string
          origin?: string | null
          quotation_id?: string
          shipment_reference?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "shipments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      unlocodes: {
        Row: {
          change_indicator: string | null
          coordinates: string | null
          country_code: string
          country_name: string
          created_at: string
          date_code: string | null
          function_classifier: string | null
          iata_code: string | null
          id: string
          location_code: string
          name: string
          name_without_diacritics: string | null
          remarks: string | null
          search_text: string
          source_id: string
          source_page_url: string
          status: string | null
          subdivision_code: string | null
          unlocode: string
          updated_at: string | null
        }
        Insert: {
          change_indicator?: string | null
          coordinates?: string | null
          country_code: string
          country_name: string
          created_at?: string
          date_code?: string | null
          function_classifier?: string | null
          iata_code?: string | null
          id?: string
          location_code: string
          name: string
          name_without_diacritics?: string | null
          remarks?: string | null
          search_text?: string
          source_id: string
          source_page_url: string
          status?: string | null
          subdivision_code?: string | null
          unlocode: string
          updated_at?: string | null
        }
        Update: {
          change_indicator?: string | null
          coordinates?: string | null
          country_code?: string
          country_name?: string
          created_at?: string
          date_code?: string | null
          function_classifier?: string | null
          iata_code?: string | null
          id?: string
          location_code?: string
          name?: string
          name_without_diacritics?: string | null
          remarks?: string | null
          search_text?: string
          source_id?: string
          source_page_url?: string
          status?: string | null
          subdivision_code?: string | null
          unlocode?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unlocodes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean
          base_salary: number | null
          branch_id: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          base_salary?: number | null
          branch_id?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          base_salary?: number | null
          branch_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_shipments_view: {
        Row: {
          arrival_date: string | null
          booking_number: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          departure_date: string | null
          destination: string | null
          id: string | null
          origin: string | null
          quotation_reference: string | null
          shipment_reference: string | null
          status: string | null
        }
        Relationships: []
      }
      client_contacts_view: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_primary: boolean | null
          linkedin_url: string | null
          name: string | null
          phone: string | null
          position: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "active_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_revenue_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "delivered_shipments_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "open_opportunities_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_contacts_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "quotation_summary_view"
            referencedColumns: ["client_id"]
          },
        ]
      }
      client_overview_view: {
        Row: {
          account_owner_id: string | null
          account_owner_name: string | null
          city: string | null
          client_name: string | null
          corporate_phone: string | null
          country: string | null
          created_at: string | null
          id: string | null
          pipeline_value: number | null
          status: string | null
          total_opportunities: number | null
          total_quotations: number | null
          total_shipments: number | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_revenue_view: {
        Row: {
          billed_amount: number | null
          client_id: string | null
          client_name: string | null
          expected_profit: number | null
          total_invoices: number | null
          total_shipments: number | null
        }
        Relationships: []
      }
      delivered_shipments_view: {
        Row: {
          arrival_date: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          delivered_at: string | null
          departure_date: string | null
          destination: string | null
          id: string | null
          origin: string | null
          quotation_reference: string | null
          shipment_reference: string | null
          status: string | null
        }
        Relationships: []
      }
      monthly_sales_view: {
        Row: {
          month: string | null
          opportunities: number | null
          total_value: number | null
        }
        Relationships: []
      }
      open_opportunities_view: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string | null
          destination: string | null
          destination_unlocode: string | null
          destination_unlocode_id: string | null
          estimated_value: number | null
          expected_profit_usd: number | null
          expiration_date: string | null
          id: string | null
          origin: string | null
          origin_unlocode: string | null
          origin_unlocode_id: string | null
          salesperson_id: string | null
          salesperson_name: string | null
          service_quantity: number | null
          service_type: string | null
          stage: string | null
          start_date: string | null
          status: string | null
          title: string | null
          transport_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_destination_unlocode_id_fkey"
            columns: ["destination_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocode_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_destination_unlocode_id_fkey"
            columns: ["destination_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_origin_unlocode_id_fkey"
            columns: ["origin_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocode_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_origin_unlocode_id_fkey"
            columns: ["origin_unlocode_id"]
            isOneToOne: false
            referencedRelation: "unlocodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_contacts_view: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          linkedin_url: string | null
          name: string | null
          phone: string | null
          position: string | null
          provider_id: string | null
          provider_name: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_overview_view: {
        Row: {
          city: string | null
          country: string | null
          credit_active: boolean | null
          credit_amount: number | null
          credit_days: number | null
          id: string | null
          provider_name: string | null
          provider_type: string | null
          status: string | null
          total_contacts: number | null
          total_service_offerings: number | null
        }
        Relationships: []
      }
      provider_service_offering_view: {
        Row: {
          created_at: string | null
          id: string | null
          provider_id: string | null
          provider_name: string | null
          service_transport_type_id: string | null
          service_type: string | null
          terms_and_conditions: string | null
          transport_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_service_offerings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_overview_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_offerings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_offerings_service_transport_type_id_fkey"
            columns: ["service_transport_type_id"]
            isOneToOne: false
            referencedRelation: "service_transport_type_lookup_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_offerings_service_transport_type_id_fkey"
            columns: ["service_transport_type_id"]
            isOneToOne: false
            referencedRelation: "service_transport_types"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_summary_view: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string | null
          currency: string | null
          destination: string | null
          estimated_cost: number | null
          estimated_price: number | null
          expected_profit: number | null
          id: string | null
          opportunity_id: string | null
          opportunity_title: string | null
          origin: string | null
          reference_number: string | null
          service_type: string | null
          status: string | null
        }
        Relationships: []
      }
      sales_pipeline_view: {
        Row: {
          opportunities: number | null
          pipeline_value: number | null
          stage: string | null
          status: string | null
        }
        Relationships: []
      }
      service_transport_type_lookup_view: {
        Row: {
          created_at: string | null
          id: string | null
          service_type: string | null
          transport_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          service_type?: string | null
          transport_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          service_type?: string | null
          transport_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipment_activity_view: {
        Row: {
          shipments: number | null
          status: string | null
        }
        Relationships: []
      }
      unlocode_country_summary_view: {
        Row: {
          country_code: string | null
          country_name: string | null
          row_count: number | null
        }
        Relationships: []
      }
      unlocode_lookup_view: {
        Row: {
          change_indicator: string | null
          coordinates: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          date_code: string | null
          display_name: string | null
          function_classifier: string | null
          iata_code: string | null
          id: string | null
          location_code: string | null
          name: string | null
          name_without_diacritics: string | null
          remarks: string | null
          search_text: string | null
          source_id: string | null
          source_page_url: string | null
          status: string | null
          subdivision_code: string | null
          unlocode: string | null
          updated_at: string | null
        }
        Insert: {
          change_indicator?: string | null
          coordinates?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          date_code?: string | null
          display_name?: never
          function_classifier?: string | null
          iata_code?: string | null
          id?: string | null
          location_code?: string | null
          name?: string | null
          name_without_diacritics?: string | null
          remarks?: string | null
          search_text?: string | null
          source_id?: string | null
          source_page_url?: string | null
          status?: string | null
          subdivision_code?: string | null
          unlocode?: string | null
          updated_at?: string | null
        }
        Update: {
          change_indicator?: string | null
          coordinates?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          date_code?: string | null
          display_name?: never
          function_classifier?: string | null
          iata_code?: string | null
          id?: string | null
          location_code?: string | null
          name?: string | null
          name_without_diacritics?: string | null
          remarks?: string | null
          search_text?: string | null
          source_id?: string | null
          source_page_url?: string | null
          status?: string | null
          subdivision_code?: string | null
          unlocode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unlocodes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_client_logistics_party: {
        Args: {
          p_city_unlocode?: string
          p_client_id: string
          p_contact_email?: string
          p_contact_name?: string
          p_contact_phone?: string
          p_full_address?: string
          p_name: string
          p_party_type: string
          p_postal_code?: string
        }
        Returns: string
      }
      add_contact_to_client: {
        Args: {
          p_client_id: string
          p_email?: string
          p_is_primary?: boolean
          p_linkedin_url?: string
          p_name: string
          p_phone?: string
          p_position?: string
          p_status?: string
        }
        Returns: string
      }
      add_contact_to_provider: {
        Args: {
          p_email?: string
          p_linkedin_url?: string
          p_name: string
          p_phone?: string
          p_position?: string
          p_provider_id: string
          p_status?: string
        }
        Returns: string
      }
      approve_quotation: {
        Args: { p_quotation_id: string }
        Returns: undefined
      }
      build_opportunity_title: {
        Args: {
          p_client_id: string
          p_destination?: string
          p_origin?: string
          p_service_type?: string
          p_transport_type?: string
        }
        Returns: string
      }
      calculate_opportunity_expiration_date: {
        Args: { p_start_date: string }
        Returns: string
      }
      convert_opportunity_to_quotation: {
        Args: { p_created_by?: string; p_opportunity_id: string }
        Returns: string
      }
      create_client_with_contacts: {
        Args: {
          p_account_owner_id?: string
          p_city?: string
          p_city_unlocode?: string
          p_company_name: string
          p_contacts?: Json
          p_corporate_phone?: string
          p_country?: string
          p_full_address?: string
          p_industry?: string
          p_postal_code?: string
          p_status?: string
          p_website?: string
        }
        Returns: string
      }
      create_opportunity: {
        Args: {
          p_client_id: string
          p_description?: string
          p_destination?: string
          p_destination_unlocode?: string
          p_estimated_value?: number
          p_expected_profit_usd?: number
          p_origin?: string
          p_origin_unlocode?: string
          p_salesperson_id?: string
          p_service_quantity?: number
          p_service_type?: string
          p_stage?: string
          p_status?: string
          p_title?: string
          p_transport_type?: string
        }
        Returns: string
      }
      create_provider: {
        Args: {
          p_city_unlocode?: string
          p_company_email?: string
          p_corporate_phone?: string
          p_credit_active?: boolean
          p_credit_amount?: number
          p_credit_days?: number
          p_full_address?: string
          p_name: string
          p_postal_code?: string
          p_provider_type?: string
          p_service_offerings?: Json
          p_status?: string
          p_tax_id?: string
          p_website?: string
        }
        Returns: string
      }
      create_service_transport_type: {
        Args: { p_service_type: string; p_transport_type: string }
        Returns: string
      }
      create_shipment: { Args: { p_quotation_id: string }; Returns: string }
      delete_client_logistics_party: {
        Args: { p_party_id: string }
        Returns: undefined
      }
      delete_service_transport_type: {
        Args: { p_id: string }
        Returns: undefined
      }
      generate_reference: { Args: { prefix: string }; Returns: string }
      get_client_full: { Args: { p_client_id: string }; Returns: Json }
      get_provider_full: { Args: { p_provider_id: string }; Returns: Json }
      mark_shipment_delivered: {
        Args: { p_shipment_id: string }
        Returns: undefined
      }
      resolve_unlocode_reference: {
        Args: { p_unlocode?: string; p_unlocode_id?: string }
        Returns: {
          resolved_city: string
          resolved_country: string
          resolved_id: string
          resolved_unlocode: string
        }[]
      }
      search_clients: {
        Args: { p_query: string }
        Returns: {
          account_owner_id: string | null
          branch_id: string | null
          city: string | null
          city_unlocode: string | null
          city_unlocode_id: string | null
          company_name: string
          corporate_phone: string | null
          country: string | null
          created_at: string | null
          credit_days: number | null
          credit_limit: number | null
          full_address: string | null
          id: string
          industry: string | null
          is_deleted: boolean
          postal_code: string | null
          prospect_id: string | null
          search_text: string
          status: string
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_providers: {
        Args: { p_query: string }
        Returns: {
          city: string | null
          city_unlocode: string | null
          city_unlocode_id: string | null
          company_email: string | null
          corporate_phone: string | null
          country: string | null
          created_at: string
          credit_active: boolean
          credit_amount: number | null
          credit_days: number | null
          full_address: string | null
          id: string
          name: string
          postal_code: string | null
          provider_type: string | null
          status: string
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "providers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_unlocodes: {
        Args: {
          p_country_code?: string
          p_function_classifier?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          change_indicator: string
          coordinates: string
          country_code: string
          country_name: string
          created_at: string
          date_code: string
          function_classifier: string
          iata_code: string
          id: string
          location_code: string
          name: string
          name_without_diacritics: string
          remarks: string
          source_id: string
          source_page_url: string
          status: string
          subdivision_code: string
          unlocode: string
          updated_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_client: { Args: { p_client_id: string }; Returns: undefined }
      sync_expired_opportunities: { Args: never; Returns: number }
      update_opportunity_status: {
        Args: { p_opportunity_id: string; p_status: string }
        Returns: undefined
      }
      update_service_transport_type: {
        Args: { p_id: string; p_service_type: string; p_transport_type: string }
        Returns: undefined
      }
      update_shipment_status: {
        Args: { p_shipment_id: string; p_status: string }
        Returns: undefined
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
