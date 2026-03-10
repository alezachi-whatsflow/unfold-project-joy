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
      asaas_connections: {
        Row: {
          api_key_hint: string | null
          created_at: string | null
          environment: Database["public"]["Enums"]["asaas_environment"]
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string | null
          webhook_token: string | null
        }
        Insert: {
          api_key_hint?: string | null
          created_at?: string | null
          environment?: Database["public"]["Enums"]["asaas_environment"]
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string | null
          webhook_token?: string | null
        }
        Update: {
          api_key_hint?: string | null
          created_at?: string | null
          environment?: Database["public"]["Enums"]["asaas_environment"]
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          webhook_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_customers: {
        Row: {
          additional_emails: string | null
          address: Json | null
          asaas_id: string
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          external_reference: string | null
          id: string
          mobile_phone: string | null
          name: string
          phone: string | null
          raw_data: Json | null
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          additional_emails?: string | null
          address?: Json | null
          asaas_id: string
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          external_reference?: string | null
          id?: string
          mobile_phone?: string | null
          name: string
          phone?: string | null
          raw_data?: Json | null
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          additional_emails?: string | null
          address?: Json | null
          asaas_id?: string
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          external_reference?: string | null
          id?: string
          mobile_phone?: string | null
          name?: string
          phone?: string | null
          raw_data?: Json | null
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_expenses: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          category: string | null
          cost_center: string | null
          created_at: string | null
          date: string
          description: string
          due_date: string | null
          id: string
          installments: string | null
          is_paid: boolean | null
          is_recurring: boolean | null
          is_scheduled: boolean | null
          notes: string | null
          payment_account: string | null
          payment_method: string | null
          recurrence_period: string | null
          reference_code: string | null
          supplier: string | null
          tenant_id: string
          value: number
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string | null
          cost_center?: string | null
          created_at?: string | null
          date: string
          description: string
          due_date?: string | null
          id?: string
          installments?: string | null
          is_paid?: boolean | null
          is_recurring?: boolean | null
          is_scheduled?: boolean | null
          notes?: string | null
          payment_account?: string | null
          payment_method?: string | null
          recurrence_period?: string | null
          reference_code?: string | null
          supplier?: string | null
          tenant_id: string
          value: number
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string | null
          cost_center?: string | null
          created_at?: string | null
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          installments?: string | null
          is_paid?: boolean | null
          is_recurring?: boolean | null
          is_scheduled?: boolean | null
          notes?: string | null
          payment_account?: string | null
          payment_method?: string | null
          recurrence_period?: string | null
          reference_code?: string | null
          supplier?: string | null
          tenant_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_payments: {
        Row: {
          asaas_customer_id: string | null
          asaas_id: string
          bank_slip_url: string | null
          billing_type: Database["public"]["Enums"]["billing_type"]
          checkout_source_id: string | null
          confirmed_date: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          due_date: string
          external_reference: string | null
          id: string
          invoice_url: string | null
          net_value: number | null
          payment_date: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          raw_data: Json | null
          salesperson_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          synced_at: string | null
          tenant_id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_id: string
          bank_slip_url?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          checkout_source_id?: string | null
          confirmed_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date: string
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          raw_data?: Json | null
          salesperson_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          synced_at?: string | null
          tenant_id: string
          updated_at?: string | null
          value: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_id?: string
          bank_slip_url?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          checkout_source_id?: string | null
          confirmed_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          raw_data?: Json | null
          salesperson_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          synced_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_checkout_source_id_fkey"
            columns: ["checkout_source_id"]
            isOneToOne: false
            referencedRelation: "checkout_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "asaas_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "sales_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_revenue: {
        Row: {
          asaas_payment_id: string | null
          billing_type: string | null
          category: string | null
          client_name: string | null
          created_at: string | null
          date: string
          description: string
          due_date: string | null
          id: string
          installment_number: number | null
          installment_total: number | null
          installments: string | null
          notes: string | null
          payment_date: string | null
          source: string | null
          status: string | null
          tenant_id: string
          value: number
        }
        Insert: {
          asaas_payment_id?: string | null
          billing_type?: string | null
          category?: string | null
          client_name?: string | null
          created_at?: string | null
          date: string
          description: string
          due_date?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          installments?: string | null
          notes?: string | null
          payment_date?: string | null
          source?: string | null
          status?: string | null
          tenant_id: string
          value: number
        }
        Update: {
          asaas_payment_id?: string | null
          billing_type?: string | null
          category?: string | null
          client_name?: string | null
          created_at?: string | null
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          installments?: string | null
          notes?: string | null
          payment_date?: string | null
          source?: string | null
          status?: string | null
          tenant_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_revenue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_splits: {
        Row: {
          created_at: string | null
          fixed_value: number | null
          id: string
          payment_id: string
          percent_value: number | null
          salesperson_id: string | null
          status: string | null
          tenant_id: string
          total_value: number | null
          wallet_id: string
        }
        Insert: {
          created_at?: string | null
          fixed_value?: number | null
          id?: string
          payment_id: string
          percent_value?: number | null
          salesperson_id?: string | null
          status?: string | null
          tenant_id: string
          total_value?: number | null
          wallet_id: string
        }
        Update: {
          created_at?: string | null
          fixed_value?: number | null
          id?: string
          payment_id?: string
          percent_value?: number | null
          salesperson_id?: string | null
          status?: string | null
          tenant_id?: string
          total_value?: number | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_splits_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "asaas_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_splits_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "sales_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_splits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_leads: {
        Row: {
          address: string | null
          category: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          place_id: string | null
          rating: number | null
          reviews_count: number | null
          scraped_at: string
          status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          scraped_at?: string
          status?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          scraped_at?: string
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      checkout_sources: {
        Row: {
          billing_type: Database["public"]["Enums"]["billing_type"]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          billing_type: Database["public"]["Enums"]["billing_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["billing_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          created_at: string
          id: string
          installment_rates: Json
          is_active: boolean
          name: string
          notes: string | null
          product_id: string | null
          product_name: string
          product_price: number
          recurring_rate_max: number | null
          recurring_rate_min: number | null
          recurring_start_installment: number | null
          rule_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          installment_rates?: Json
          is_active?: boolean
          name: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          product_price?: number
          recurring_rate_max?: number | null
          recurring_rate_min?: number | null
          recurring_start_installment?: number | null
          rule_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          installment_rates?: Json
          is_active?: boolean
          name?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          product_price?: number
          recurring_rate_max?: number | null
          recurring_rate_min?: number | null
          recurring_start_installment?: number | null
          rule_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          adicional: number
          atendentes: number
          checkout: string
          condicao: string
          cpf_cnpj: string | null
          created_at: string | null
          data_ativacao: string
          data_bloqueio: string | null
          data_cancelado: string | null
          data_desbloqueio: string | null
          data_vencimento: string | null
          dispositivos_nao_oficial: number
          dispositivos_oficial: number
          email: string
          id: string
          nome: string
          receita: string
          status: string
          tipo_pagamento: string
          updated_at: string | null
          valor_ultima_cobranca: number
          whitelabel: string
        }
        Insert: {
          adicional?: number
          atendentes?: number
          checkout?: string
          condicao?: string
          cpf_cnpj?: string | null
          created_at?: string | null
          data_ativacao?: string
          data_bloqueio?: string | null
          data_cancelado?: string | null
          data_desbloqueio?: string | null
          data_vencimento?: string | null
          dispositivos_nao_oficial?: number
          dispositivos_oficial?: number
          email?: string
          id?: string
          nome?: string
          receita?: string
          status?: string
          tipo_pagamento?: string
          updated_at?: string | null
          valor_ultima_cobranca?: number
          whitelabel?: string
        }
        Update: {
          adicional?: number
          atendentes?: number
          checkout?: string
          condicao?: string
          cpf_cnpj?: string | null
          created_at?: string | null
          data_ativacao?: string
          data_bloqueio?: string | null
          data_cancelado?: string | null
          data_desbloqueio?: string | null
          data_vencimento?: string | null
          dispositivos_nao_oficial?: number
          dispositivos_oficial?: number
          email?: string
          id?: string
          nome?: string
          receita?: string
          status?: string
          tipo_pagamento?: string
          updated_at?: string | null
          valor_ultima_cobranca?: number
          whitelabel?: string
        }
        Relationships: []
      }
      digital_analyses: {
        Row: {
          address: string | null
          avg_rating: number | null
          category: string | null
          company_name: string
          created_at: string
          details_json: Json | null
          id: string
          overall_label: string | null
          overall_score: number
          phone: string | null
          score_google_business: number | null
          score_instagram: number | null
          score_meta: number | null
          score_neuro: number | null
          score_website: number | null
          score_whatsapp: number | null
          total_reviews: number | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          category?: string | null
          company_name: string
          created_at?: string
          details_json?: Json | null
          id?: string
          overall_label?: string | null
          overall_score?: number
          phone?: string | null
          score_google_business?: number | null
          score_instagram?: number | null
          score_meta?: number | null
          score_neuro?: number | null
          score_website?: number | null
          score_whatsapp?: number | null
          total_reviews?: number | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          category?: string | null
          company_name?: string
          created_at?: string
          details_json?: Json | null
          id?: string
          overall_label?: string | null
          overall_score?: number
          phone?: string | null
          score_google_business?: number | null
          score_instagram?: number | null
          score_meta?: number | null
          score_neuro?: number | null
          score_website?: number | null
          score_whatsapp?: number | null
          total_reviews?: number | null
          website_url?: string | null
        }
        Relationships: []
      }
      dunning_executions: {
        Row: {
          action: string
          dunning_rule_id: string
          executed_at: string | null
          id: string
          payment_id: string
          result: Json | null
          step_index: number
          success: boolean | null
          tenant_id: string
        }
        Insert: {
          action: string
          dunning_rule_id: string
          executed_at?: string | null
          id?: string
          payment_id: string
          result?: Json | null
          step_index: number
          success?: boolean | null
          tenant_id: string
        }
        Update: {
          action?: string
          dunning_rule_id?: string
          executed_at?: string | null
          id?: string
          payment_id?: string
          result?: Json | null
          step_index?: number
          success?: boolean | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dunning_executions_dunning_rule_id_fkey"
            columns: ["dunning_rule_id"]
            isOneToOne: false
            referencedRelation: "dunning_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_executions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "asaas_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_rules: {
        Row: {
          checkout_source_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          rules: Json
          status: Database["public"]["Enums"]["dunning_status"] | null
          template_key: string | null
          tenant_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          checkout_source_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          rules?: Json
          status?: Database["public"]["Enums"]["dunning_status"] | null
          template_key?: string | null
          tenant_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          checkout_source_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          rules?: Json
          status?: Database["public"]["Enums"]["dunning_status"] | null
          template_key?: string | null
          tenant_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dunning_rules_checkout_source_id_fkey"
            columns: ["checkout_source_id"]
            isOneToOne: false
            referencedRelation: "checkout_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      export_logs: {
        Row: {
          analysis_id: string
          exported_at: string
          id: string
        }
        Insert: {
          analysis_id: string
          exported_at?: string
          id?: string
        }
        Update: {
          analysis_id?: string
          exported_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_logs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "digital_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          benefits: number
          cash_balance: number
          churned_customers: number
          churned_mrr: number
          contractors: number
          created_at: string | null
          expansion_mrr: number
          fixed_costs: number
          id: string
          infrastructure: number
          marketing: number
          month: string
          mrr: number
          new_customers: number
          new_mrr: number
          other_revenue: number
          payroll: number
          taxes: number
          total_customers: number
          updated_at: string | null
          variable_costs: number
        }
        Insert: {
          benefits?: number
          cash_balance?: number
          churned_customers?: number
          churned_mrr?: number
          contractors?: number
          created_at?: string | null
          expansion_mrr?: number
          fixed_costs?: number
          id?: string
          infrastructure?: number
          marketing?: number
          month: string
          mrr?: number
          new_customers?: number
          new_mrr?: number
          other_revenue?: number
          payroll?: number
          taxes?: number
          total_customers?: number
          updated_at?: string | null
          variable_costs?: number
        }
        Update: {
          benefits?: number
          cash_balance?: number
          churned_customers?: number
          churned_mrr?: number
          contractors?: number
          created_at?: string | null
          expansion_mrr?: number
          fixed_costs?: number
          id?: string
          infrastructure?: number
          marketing?: number
          month?: string
          mrr?: number
          new_customers?: number
          new_mrr?: number
          other_revenue?: number
          payroll?: number
          taxes?: number
          total_customers?: number
          updated_at?: string | null
          variable_costs?: number
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          conteudo: string
          conversa_id: string
          direcao: string
          id: string
          lead_id: string | null
          origem: string
          session_id: string
          status: string
          tenant_id: string
          timestamp: string
          tipo: string
        }
        Insert: {
          conteudo?: string
          conversa_id: string
          direcao?: string
          id?: string
          lead_id?: string | null
          origem?: string
          session_id: string
          status?: string
          tenant_id?: string
          timestamp?: string
          tipo?: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          direcao?: string
          id?: string
          lead_id?: string | null
          origem?: string
          session_id?: string
          status?: string
          tenant_id?: string
          timestamp?: string
          tipo?: string
        }
        Relationships: []
      }
      negocios: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          cobranca_id: string | null
          condicao_pagamento: string
          consultor_id: string | null
          consultor_nome: string | null
          created_at: string
          data_criacao: string
          data_fechamento: string | null
          data_previsao_fechamento: string | null
          desconto: number
          desconto_tipo: string
          forma_pagamento: string
          gerar_cobranca: boolean
          gerar_nf: boolean
          historico: Json
          id: string
          motivo_perda: string | null
          motivo_perda_detalhe: string | null
          nf_emitida_id: string | null
          notas: string | null
          origem: string
          probabilidade: number
          produtos: Json
          status: string
          tags: string[]
          tenant_id: string
          titulo: string
          updated_at: string
          valor_liquido: number
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome?: string | null
          cobranca_id?: string | null
          condicao_pagamento?: string
          consultor_id?: string | null
          consultor_nome?: string | null
          created_at?: string
          data_criacao?: string
          data_fechamento?: string | null
          data_previsao_fechamento?: string | null
          desconto?: number
          desconto_tipo?: string
          forma_pagamento?: string
          gerar_cobranca?: boolean
          gerar_nf?: boolean
          historico?: Json
          id?: string
          motivo_perda?: string | null
          motivo_perda_detalhe?: string | null
          nf_emitida_id?: string | null
          notas?: string | null
          origem?: string
          probabilidade?: number
          produtos?: Json
          status?: string
          tags?: string[]
          tenant_id?: string
          titulo: string
          updated_at?: string
          valor_liquido?: number
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string | null
          cobranca_id?: string | null
          condicao_pagamento?: string
          consultor_id?: string | null
          consultor_nome?: string | null
          created_at?: string
          data_criacao?: string
          data_fechamento?: string | null
          data_previsao_fechamento?: string | null
          desconto?: number
          desconto_tipo?: string
          forma_pagamento?: string
          gerar_cobranca?: boolean
          gerar_nf?: boolean
          historico?: Json
          id?: string
          motivo_perda?: string | null
          motivo_perda_detalhe?: string | null
          nf_emitida_id?: string | null
          notas?: string | null
          origem?: string
          probabilidade?: number
          produtos?: Json
          status?: string
          tags?: string[]
          tenant_id?: string
          titulo?: string
          updated_at?: string
          valor_liquido?: number
          valor_total?: number
        }
        Relationships: []
      }
      payment_dunnings: {
        Row: {
          asaas_payment_dunning_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          payment_id: string | null
          simulated: boolean | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          asaas_payment_dunning_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          payment_id?: string | null
          simulated?: boolean | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          asaas_payment_dunning_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          payment_id?: string | null
          simulated?: boolean | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_dunnings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "asaas_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          custom_permissions: Json | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_analysis: {
        Row: {
          analyzed_at: string
          authority_score: number | null
          avg_engagement_rate: number | null
          bio: string | null
          content_strategy_notes: string | null
          display_name: string | null
          followers: number | null
          following: number | null
          id: string
          posts_count: number | null
          profile_image_url: string | null
          profile_url: string
          source: string
          status: string
          username: string
        }
        Insert: {
          analyzed_at?: string
          authority_score?: number | null
          avg_engagement_rate?: number | null
          bio?: string | null
          content_strategy_notes?: string | null
          display_name?: string | null
          followers?: number | null
          following?: number | null
          id?: string
          posts_count?: number | null
          profile_image_url?: string | null
          profile_url: string
          source?: string
          status?: string
          username: string
        }
        Update: {
          analyzed_at?: string
          authority_score?: number | null
          avg_engagement_rate?: number | null
          bio?: string | null
          content_strategy_notes?: string | null
          display_name?: string | null
          followers?: number | null
          following?: number | null
          id?: string
          posts_count?: number | null
          profile_image_url?: string | null
          profile_url?: string
          source?: string
          status?: string
          username?: string
        }
        Relationships: []
      }
      prospect_campaigns: {
        Row: {
          city: string
          created_at: string
          hot_leads: number
          id: string
          leads_analyzed: number
          leads_found: number
          niche: string
          results: Json
          tenant_id: string
        }
        Insert: {
          city: string
          created_at?: string
          hot_leads?: number
          id?: string
          leads_analyzed?: number
          leads_found?: number
          niche: string
          results?: Json
          tenant_id?: string
        }
        Update: {
          city?: string
          created_at?: string
          hot_leads?: number
          id?: string
          leads_analyzed?: number
          leads_found?: number
          niche?: string
          results?: Json
          tenant_id?: string
        }
        Relationships: []
      }
      revenue_rules: {
        Row: {
          billing_type: Database["public"]["Enums"]["billing_type"] | null
          checkout_source_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          revenue_category: string | null
          tenant_id: string
        }
        Insert: {
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
          checkout_source_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          revenue_category?: string | null
          tenant_id: string
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
          checkout_source_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          revenue_category?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_rules_checkout_source_id_fkey"
            columns: ["checkout_source_id"]
            isOneToOne: false
            referencedRelation: "checkout_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_people: {
        Row: {
          asaas_wallet_id: string | null
          commission_percent: number | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          asaas_wallet_id?: string | null
          commission_percent?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          asaas_wallet_id?: string | null
          commission_percent?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          related_payment_id: string | null
          status: string | null
          tenant_id: string
          type: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          related_payment_id?: string | null
          status?: string | null
          tenant_id: string
          type?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          related_payment_id?: string | null
          status?: string | null
          tenant_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_related_payment_id_fkey"
            columns: ["related_payment_id"]
            isOneToOne: false
            referencedRelation: "asaas_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cpf_cnpj: string | null
          created_at: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      web_scraps: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          description: string | null
          id: string
          keywords: string[] | null
          niche: string | null
          raw_markdown: string | null
          scraped_at: string
          status: string
          technologies: string[] | null
          title: string | null
          url: string
          value_proposition: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          niche?: string | null
          raw_markdown?: string | null
          scraped_at?: string
          status?: string
          technologies?: string[] | null
          title?: string | null
          url: string
          value_proposition?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          niche?: string | null
          raw_markdown?: string | null
          scraped_at?: string
          status?: string
          technologies?: string[] | null
          title?: string | null
          url?: string
          value_proposition?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          asaas_event_id: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          received_at: string | null
          tenant_id: string | null
        }
        Insert: {
          asaas_event_id?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          asaas_event_id?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_billing_rules: {
        Row: {
          created_at: string
          id: string
          instance_id: string | null
          is_active: boolean
          name: string
          steps: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id?: string | null
          is_active?: boolean
          name: string
          steps?: Json
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string | null
          is_active?: boolean
          name?: string
          steps?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_billing_rules_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          admin_token: string | null
          client_token: string | null
          criado_em: string
          id: string
          instance_id_api: string
          label: string
          numero: string | null
          provedor: string
          server_url: string | null
          session_id: string
          status: string
          tenant_id: string
          token_api: string
          ultimo_ping: string | null
          uso_principal: string
          webhook_url: string
        }
        Insert: {
          admin_token?: string | null
          client_token?: string | null
          criado_em?: string
          id?: string
          instance_id_api?: string
          label: string
          numero?: string | null
          provedor?: string
          server_url?: string | null
          session_id: string
          status?: string
          tenant_id?: string
          token_api?: string
          ultimo_ping?: string | null
          uso_principal?: string
          webhook_url?: string
        }
        Update: {
          admin_token?: string | null
          client_token?: string | null
          criado_em?: string
          id?: string
          instance_id_api?: string
          label?: string
          numero?: string | null
          provedor?: string
          server_url?: string | null
          session_id?: string
          status?: string
          tenant_id?: string
          token_api?: string
          ultimo_ping?: string | null
          uso_principal?: string
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
    }
    Enums: {
      asaas_environment: "sandbox" | "production"
      billing_type: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED"
      dunning_status: "draft" | "active" | "paused" | "completed"
      payment_status:
        | "PENDING"
        | "RECEIVED"
        | "CONFIRMED"
        | "OVERDUE"
        | "REFUNDED"
        | "RECEIVED_IN_CASH"
        | "REFUND_REQUESTED"
        | "REFUND_IN_PROGRESS"
        | "CHARGEBACK_REQUESTED"
        | "CHARGEBACK_DISPUTE"
        | "AWAITING_CHARGEBACK_REVERSAL"
        | "DUNNING_REQUESTED"
        | "DUNNING_RECEIVED"
        | "AWAITING_RISK_ANALYSIS"
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
      asaas_environment: ["sandbox", "production"],
      billing_type: ["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"],
      dunning_status: ["draft", "active", "paused", "completed"],
      payment_status: [
        "PENDING",
        "RECEIVED",
        "CONFIRMED",
        "OVERDUE",
        "REFUNDED",
        "RECEIVED_IN_CASH",
        "REFUND_REQUESTED",
        "REFUND_IN_PROGRESS",
        "CHARGEBACK_REQUESTED",
        "CHARGEBACK_DISPUTE",
        "AWAITING_CHARGEBACK_REVERSAL",
        "DUNNING_REQUESTED",
        "DUNNING_RECEIVED",
        "AWAITING_RISK_ANALYSIS",
      ],
    },
  },
} as const
