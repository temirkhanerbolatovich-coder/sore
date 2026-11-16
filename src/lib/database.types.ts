
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_generations": {
                  Row: {
                    "created_at": string,"id": string,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"shop_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_generations_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "created_at": string,"id": string,"shop_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"shop_id": string,"type": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"shop_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address": string | null,"comment": string | null,"created_at": string,"customer_name": string,"customer_phone": string,"id": string,"items": NonNullable<Json>,"needed_date": string | null,"needed_time": string | null,"number": number,"shop_id": string,"status": string,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"comment"?: string | null,"created_at"?: string,"customer_name": string,"customer_phone": string,"id"?: string,"items": NonNullable<Json>,"needed_date"?: string | null,"needed_time"?: string | null,"number": number,"shop_id": string,"status"?: string,"total": number
                  }
                  Update: {
                    "address"?: string | null,"comment"?: string | null,"created_at"?: string,"customer_name"?: string,"customer_phone"?: string,"id"?: string,"items"?: NonNullable<Json>,"needed_date"?: string | null,"needed_time"?: string | null,"number"?: number,"shop_id"?: string,"status"?: string,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "category": string | null,"created_at": string,"description_kz": string | null,"description_ru": string | null,"id": string,"in_stock": boolean,"photo_url": string | null,"price": number,"price_mode": string,"shop_id": string,"sort": number,"title": string,"variants": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"description_kz"?: string | null,"description_ru"?: string | null,"id"?: string,"in_stock"?: boolean,"photo_url"?: string | null,"price": number,"price_mode"?: string,"shop_id": string,"sort"?: number,"title": string,"variants"?: NonNullable<Json>
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"description_kz"?: string | null,"description_ru"?: string | null,"id"?: string,"in_stock"?: boolean,"photo_url"?: string | null,"price"?: number,"price_mode"?: string,"shop_id"?: string,"sort"?: number,"title"?: string,"variants"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_telegram": {
                  Row: {
                    "chat_id": number | null,"created_at": string,"link_code": string | null,"linked_at": string | null,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chat_id"?: number | null,"created_at"?: string,"link_code"?: string | null,"linked_at"?: string | null,"shop_id": string
                  }
                  Update: {
                    "chat_id"?: number | null,"created_at"?: string,"link_code"?: string | null,"linked_at"?: string | null,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_telegram_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: true
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shops": {
                  Row: {
                    "avatar_url": string | null,"city": string | null,"created_at": string,"id": string,"lead_days": number,"name": string,"next_order_number": number,"owner_id": string,"slug": string,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"city"?: string | null,"created_at"?: string,"id"?: string,"lead_days"?: number,"name": string,"next_order_number"?: number,"owner_id": string,"slug": string,"whatsapp": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"city"?: string | null,"created_at"?: string,"id"?: string,"lead_days"?: number,"name"?: string,"next_order_number"?: number,"owner_id"?: string,"slug"?: string,"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_order":
{ Args: { "p_address": string,"p_comment": string,"p_items": Json,"p_name": string,"p_needed_date"?: string,"p_needed_time"?: string,"p_phone": string,"p_shop": string }; Returns: {
              "order_items": Json,"order_number": number,"order_total": number
            }[]
                           },
"move_product":
{ Args: { "p_direction": number,"p_product": string,"p_shop": string }; Returns: undefined
                           },
"owns_shop":
{ Args: { "shop": string }; Returns: boolean
                           },
"rate_limit_hit":
{ Args: { "p_key": string,"p_limit": number,"p_seconds": number }; Returns: boolean
                           },
"record_inquiry":
{ Args: { "p_client": string,"p_product": string,"p_shop": string }; Returns: undefined
                           },
"record_view":
{ Args: { "p_client": string,"p_shop": string }; Returns: undefined
                           },
"reserve_ai":
{ Args: { "p_global_limit"?: number,"p_limit": number,"p_shop": string }; Returns: string
                           },
"set_notify_config":
{ Args: { "p_secret": string,"p_url": string }; Returns: undefined
                           },
"valid_variants":
{ Args: { "v": Json }; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
