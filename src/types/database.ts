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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_audit: {
        Row: {
          args: Json
          created_at: string
          duration_ms: number
          error: string | null
          id: number
          key_id: string | null
          key_name: string
          result: string
          summary: string
          tool: string
          user_id: string
        }
        Insert: {
          args?: Json
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: never
          key_id?: string | null
          key_name: string
          result: string
          summary: string
          tool: string
          user_id: string
        }
        Update: {
          args?: Json
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: never
          key_id?: string | null
          key_name?: string
          result?: string
          summary?: string
          tool?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_audit_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          scopes: string[]
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_bdt: number
          category: string
          created_at: string
          created_by: string
          id: string
          note: string | null
          spent_on: string
          user_id: string
        }
        Insert: {
          amount_bdt: number
          category: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          spent_on: string
          user_id?: string
        }
        Update: {
          amount_bdt?: number
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          spent_on?: string
          user_id?: string
        }
        Relationships: []
      }
      iou_entries: {
        Row: {
          amount_bdt: number
          created_at: string
          created_by: string
          id: string
          kind: string
          note: string | null
          occurred_on: string
          person_id: string
          user_id: string
        }
        Insert: {
          amount_bdt: number
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          note?: string | null
          occurred_on: string
          person_id: string
          user_id?: string
        }
        Update: {
          amount_bdt?: number
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          note?: string | null
          occurred_on?: string
          person_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iou_entries_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          created_at: string
          icon: string
          id: string
          position: number
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          position: number
          title: string
          url: string
          user_id?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          position?: number
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          body_md: string
          created_at: string
          created_by: string
          doc: Json | null
          id: string
          parent_id: string | null
          pinned: boolean
          prev_at: string | null
          prev_body_md: string | null
          prev_by: string | null
          prev_doc: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_md?: string
          created_at?: string
          created_by?: string
          doc?: Json | null
          id?: string
          parent_id?: string | null
          pinned?: boolean
          prev_at?: string | null
          prev_body_md?: string | null
          prev_by?: string | null
          prev_doc?: Json | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          created_by?: string
          doc?: Json | null
          id?: string
          parent_id?: string | null
          pinned?: boolean
          prev_at?: string | null
          prev_body_md?: string | null
          prev_by?: string | null
          prev_doc?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_todos: {
        Row: {
          amount_bdt: number
          category: string
          created_at: string
          created_by: string
          due_on: string | null
          expense_id: string | null
          id: string
          next_id: string | null
          note: string | null
          paid_on: string | null
          repeat: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_bdt: number
          category?: string
          created_at?: string
          created_by?: string
          due_on?: string | null
          expense_id?: string | null
          id?: string
          next_id?: string | null
          note?: string | null
          paid_on?: string | null
          repeat?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_bdt?: number
          category?: string
          created_at?: string
          created_by?: string
          due_on?: string | null
          expense_id?: string | null
          id?: string
          next_id?: string | null
          note?: string | null
          paid_on?: string | null
          repeat?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_todos_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_todos_next_id_fkey"
            columns: ["next_id"]
            isOneToOne: false
            referencedRelation: "payment_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answered_at: string
          correct: boolean
          id: string
          kind: string
          mode: string
          user_id: string
          word_id: string
        }
        Insert: {
          answered_at?: string
          correct: boolean
          id?: string
          kind: string
          mode: string
          user_id?: string
          word_id: string
        }
        Update: {
          answered_at?: string
          correct?: boolean
          id?: string
          kind?: string
          mode?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          id: string
          renewal_id: string
          renews_on: string
          sent_at: string
          stage: string
          user_id: string
        }
        Insert: {
          id?: string
          renewal_id: string
          renews_on: string
          sent_at?: string
          stage: string
          user_id: string
        }
        Update: {
          id?: string
          renewal_id?: string
          renews_on?: string
          sent_at?: string
          stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewals"
            referencedColumns: ["id"]
          },
        ]
      }
      renewals: {
        Row: {
          amount: number | null
          auto_renew: boolean
          category: string
          created_at: string
          created_by: string
          currency: string
          cycle: string
          id: string
          manage_url: string | null
          name: string
          notes: string | null
          project: string | null
          remind_days_before: number
          renews_on: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          auto_renew?: boolean
          category: string
          created_at?: string
          created_by?: string
          currency?: string
          cycle: string
          id?: string
          manage_url?: string | null
          name: string
          notes?: string | null
          project?: string | null
          remind_days_before?: number
          renews_on?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number | null
          auto_renew?: boolean
          category?: string
          created_at?: string
          created_by?: string
          currency?: string
          cycle?: string
          id?: string
          manage_url?: string | null
          name?: string
          notes?: string | null
          project?: string | null
          remind_days_before?: number
          renews_on?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_lists: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          position: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string
          done_at: string | null
          due_on: string | null
          id: string
          list_id: string | null
          moved_count: number
          note: string | null
          position: number
          title: string
          tracker_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          done_at?: string | null
          due_on?: string | null
          id?: string
          list_id?: string | null
          moved_count?: number
          note?: string | null
          position: number
          title: string
          tracker_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          done_at?: string | null
          due_on?: string | null
          id?: string
          list_id?: string | null
          moved_count?: number
          note?: string | null
          position?: number
          title?: string
          tracker_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tracker_item_id_fkey"
            columns: ["tracker_item_id"]
            isOneToOne: true
            referencedRelation: "tracker_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_items: {
        Row: {
          created_at: string
          done_at: string | null
          group_name: string | null
          id: string
          note: string | null
          position: number
          status: string
          title: string
          tracker_id: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          group_name?: string | null
          id?: string
          note?: string | null
          position: number
          status?: string
          title: string
          tracker_id: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          group_name?: string | null
          id?: string
          note?: string | null
          position?: number
          status?: string
          title?: string
          tracker_id?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_items_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      trackers: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          monthly_budget_bdt: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          monthly_budget_bdt?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          monthly_budget_bdt?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          box: number
          card: Json
          correct_count: number
          created_at: string
          id: string
          last_looked_up_at: string
          last_reviewed_at: string | null
          lookup_count: number
          next_review_at: string
          quiz: Json
          quiz_generated_at: string | null
          review_count: number
          updated_at: string
          user_id: string
          word: string
          wrong_count: number
        }
        Insert: {
          box?: number
          card: Json
          correct_count?: number
          created_at?: string
          id?: string
          last_looked_up_at?: string
          last_reviewed_at?: string | null
          lookup_count?: number
          next_review_at?: string
          quiz?: Json
          quiz_generated_at?: string | null
          review_count?: number
          updated_at?: string
          user_id?: string
          word: string
          wrong_count?: number
        }
        Update: {
          box?: number
          card?: Json
          correct_count?: number
          created_at?: string
          id?: string
          last_looked_up_at?: string
          last_reviewed_at?: string | null
          lookup_count?: number
          next_review_at?: string
          quiz?: Json
          quiz_generated_at?: string | null
          review_count?: number
          updated_at?: string
          user_id?: string
          word?: string
          wrong_count?: number
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
