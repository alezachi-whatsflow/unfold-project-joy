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
          category: string | null
          created_at: string | null
          date: string
          description: string
          id: string
          is_recurring: boolean | null
          recurrence_period: string | null
          tenant_id: string
          value: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          date: string
          description: string
          id?: string
          is_recurring?: boolean | null
          recurrence_period?: string | null
          tenant_id: string
          value: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          is_recurring?: boolean | null
          recurrence_period?: string | null
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
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
