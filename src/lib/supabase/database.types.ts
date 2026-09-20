// Generated from the Mirsad database schema.
//
// Regenerate after any migration with:
//   npx supabase gen types typescript --project-id sbeftcrvveonvgxetcxq
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
      analysis_runs: {
        Row: {
          accuracy: number | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          inspection_id: string
          progress: number
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_status"]
          steps: Json
        }
        Insert: {
          accuracy?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          inspection_id: string
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          steps?: Json
        }
        Update: {
          accuracy?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          inspection_id?: string
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_reviews: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          finding_id: string
          id: string
          note: string | null
          reviewed_by: string | null
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          finding_id: string
          id?: string
          note?: string | null
          reviewed_by?: string | null
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          finding_id?: string
          id?: string
          note?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finding_reviews_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          analysis_run_id: string | null
          comparison_note: string | null
          component: string | null
          confidence: number | null
          created_at: string
          description: string | null
          id: string
          inspection_id: string
          previous_finding_id: string | null
          primary_file_id: string | null
          recommendation: string | null
          severity: Database["public"]["Enums"]["severity"]
          title: string
          updated_at: string
        }
        Insert: {
          analysis_run_id?: string | null
          comparison_note?: string | null
          component?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          id?: string
          inspection_id: string
          previous_finding_id?: string | null
          primary_file_id?: string | null
          recommendation?: string | null
          severity: Database["public"]["Enums"]["severity"]
          title: string
          updated_at?: string
        }
        Update: {
          analysis_run_id?: string | null
          comparison_note?: string | null
          component?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          id?: string
          inspection_id?: string
          previous_finding_id?: string | null
          primary_file_id?: string | null
          recommendation?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_previous_finding_id_fkey"
            columns: ["previous_finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_primary_file_id_fkey"
            columns: ["primary_file_id"]
            isOneToOne: false
            referencedRelation: "inspection_files"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_counters: {
        Row: {
          last_value: number
          year: number
        }
        Insert: {
          last_value?: number
          year: number
        }
        Update: {
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      inspection_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          inspection_id: string
          kind: Database["public"]["Enums"]["file_kind"]
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          inspection_id: string
          kind: Database["public"]["Enums"]["file_kind"]
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          inspection_id?: string
          kind?: Database["public"]["Enums"]["file_kind"]
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_files_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inspection_date: string
          inspector_notes: string | null
          reference: string
          status: Database["public"]["Enums"]["inspection_status"]
          structure_id: string
          type: Database["public"]["Enums"]["inspection_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_date?: string
          inspector_notes?: string | null
          reference: string
          status?: Database["public"]["Enums"]["inspection_status"]
          structure_id: string
          type?: Database["public"]["Enums"]["inspection_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_date?: string
          inspector_notes?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          structure_id?: string
          type?: Database["public"]["Enums"]["inspection_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          inspection_id: string | null
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          inspection_id?: string | null
          kind?: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          inspection_id?: string | null
          kind?: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      structures: {
        Row: {
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          type: Database["public"]["Enums"]["structure_type"]
          updated_at: string
        }
        Insert: {
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          type: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
        }
        Update: {
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          type?: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "structures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      finding_current_review: {
        Row: {
          created_at: string | null
          decision: Database["public"]["Enums"]["review_decision"] | null
          finding_id: string | null
          note: string | null
          review_id: string | null
          reviewed_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finding_reviews_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_edit_inspection: {
        Args: { p_inspection_id: string }
        Returns: boolean
      }
      can_write: { Args: never; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      analysis_status: "queued" | "running" | "succeeded" | "failed"
      file_kind: "image" | "report" | "measurement"
      inspection_status:
        | "draft"
        | "files_uploaded"
        | "analyzing"
        | "analyzed"
        | "under_review"
        | "completed"
      inspection_type: "periodic" | "detailed" | "emergency" | "follow_up"
      notification_kind: "success" | "warning" | "info"
      review_decision: "approved" | "rejected" | "edited"
      severity: "high" | "medium" | "low"
      structure_type: "bridge" | "building" | "road" | "tunnel" | "other"
      user_role: "admin" | "inspector" | "viewer"
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
    Enums: {
      analysis_status: ["queued", "running", "succeeded", "failed"],
      file_kind: ["image", "report", "measurement"],
      inspection_status: [
        "draft",
        "files_uploaded",
        "analyzing",
        "analyzed",
        "under_review",
        "completed",
      ],
      inspection_type: ["periodic", "detailed", "emergency", "follow_up"],
      notification_kind: ["success", "warning", "info"],
      review_decision: ["approved", "rejected", "edited"],
      severity: ["high", "medium", "low"],
      structure_type: ["bridge", "building", "road", "tunnel", "other"],
      user_role: ["admin", "inspector", "viewer"],
    },
  },
} as const
