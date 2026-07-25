export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type OrderStatus = 'nuevo' | 'diseno' | 'produccion' | 'listo' | 'entregado' | 'cancelado'
export type DeliveryType = 'envio' | 'recogida' | 'local'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sports: CatalogTable
      medallero_catalog: {
        Row: {
          id: string
          name: string
          description: string | null
          suggested_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          suggested_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          suggested_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payment_methods: CatalogTable
      expense_categories: CatalogTable
      financial_settings: {
        Row: {
          id: string
          production_expense_default: number
          reserve_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          production_expense_default?: number
          reserve_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          production_expense_default?: number
          reserve_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          request_number: string
          customer_name: string
          customer_phone: string
          sport_id: string | null
          sport_name: string
          catalog_item_id: string | null
          catalog_item_name: string | null
          total_amount: number
          status: OrderStatus
          delivery_type: DeliveryType
          destination: string | null
          notes: string | null
          production_cost: number | null
          production_expense: number
          production_notes: string | null
          due_date: string | null
          delivered_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_number: string
          customer_name: string
          customer_phone: string
          sport_id?: string | null
          sport_name: string
          catalog_item_id?: string | null
          catalog_item_name?: string | null
          total_amount: number
          status?: OrderStatus
          delivery_type?: DeliveryType
          destination?: string | null
          notes?: string | null
          production_cost?: number | null
          production_expense?: number
          production_notes?: string | null
          due_date?: string | null
          delivered_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_number?: string
          customer_name?: string
          customer_phone?: string
          sport_id?: string | null
          sport_name?: string
          catalog_item_id?: string | null
          catalog_item_name?: string | null
          total_amount?: number
          status?: OrderStatus
          delivery_type?: DeliveryType
          destination?: string | null
          notes?: string | null
          production_cost?: number | null
          production_expense?: number
          production_notes?: string | null
          due_date?: string | null
          delivered_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_payments: {
        Row: {
          id: string
          order_id: string
          amount: number
          payment_method_id: string | null
          payment_method_name: string
          notes: string | null
          paid_at: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          amount: number
          payment_method_id?: string | null
          payment_method_name: string
          notes?: string | null
          paid_at?: string
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          amount?: number
          payment_method_id?: string | null
          payment_method_name?: string
          notes?: string | null
          paid_at?: string
          created_by?: string
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          category_id: string | null
          category_name: string
          amount: number
          description: string
          expense_date: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          category_name: string
          amount: number
          description: string
          expense_date?: string
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          category_name?: string
          amount?: number
          description?: string
          expense_date?: string
          created_by?: string
          created_at?: string
        }
      }
    }
    Views: {
      order_financials: {
        Row: Database['public']['Tables']['orders']['Row'] & {
          paid_amount: number
          balance_amount: number
        }
      }
      business_metrics: {
        Row: {
          total_sold: number
          total_collected: number
          pending_balance: number
          eugenio_cost: number
          production_expenses: number
          gross_profit: number
          reserve_amount: number
          net_profit: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: {
      order_status: OrderStatus
      delivery_type: DeliveryType
    }
    CompositeTypes: Record<string, never>
  }
}

type CatalogTable = {
  Row: {
    id: string
    name: string
    is_active: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    name: string
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    name?: string
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
}
