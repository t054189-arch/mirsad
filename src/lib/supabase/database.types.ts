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
          {
            foreignKeyName: "analysis_runs_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "structure_inspection_history"
            referencedColumns: ["inspection_id"]
          },
        ]
      }
      csb_construction_column_labels: {
        Row: {
          id: number
          label: string
        }
        Insert: {
          id: number
          label: string
        }
        Update: {
          id?: number
          label?: string
        }
        Relationships: []
      }
      csb_construction_columns: {
        Row: {
          field_code: string
          label_id: number
          ordinal: number
          table_id: number
        }
        Insert: {
          field_code: string
          label_id: number
          ordinal: number
          table_id: number
        }
        Update: {
          field_code?: string
          label_id?: number
          ordinal?: number
          table_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "csb_construction_columns_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "csb_construction_column_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csb_construction_columns_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "csb_construction_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      csb_construction_labels: {
        Row: {
          id: number
          isic_code: string | null
          label_ar: string | null
          label_en: string | null
        }
        Insert: {
          id: number
          isic_code?: string | null
          label_ar?: string | null
          label_en?: string | null
        }
        Update: {
          id?: number
          isic_code?: string | null
          label_ar?: string | null
          label_en?: string | null
        }
        Relationships: []
      }
      csb_construction_observations: {
        Row: {
          id: number
          label_id: number | null
          sector: string | null
          source_row: number | null
          table_id: number
          values: Json
        }
        Insert: {
          id?: number
          label_id?: number | null
          sector?: string | null
          source_row?: number | null
          table_id: number
          values?: Json
        }
        Update: {
          id?: number
          label_id?: number | null
          sector?: string | null
          source_row?: number | null
          table_id?: number
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "csb_construction_observations_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "csb_construction_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csb_construction_observations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "csb_construction_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      csb_construction_tables: {
        Row: {
          id: number
          imported_at: string
          table_code: string | null
          title_id: number | null
          year: number
        }
        Insert: {
          id: number
          imported_at?: string
          table_code?: string | null
          title_id?: number | null
          year: number
        }
        Update: {
          id?: number
          imported_at?: string
          table_code?: string | null
          title_id?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "csb_construction_tables_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "csb_construction_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      csb_construction_titles: {
        Row: {
          id: number
          title_ar: string | null
          title_en: string | null
          units: string | null
        }
        Insert: {
          id: number
          title_ar?: string | null
          title_en?: string | null
          units?: string | null
        }
        Update: {
          id?: number
          title_ar?: string | null
          title_en?: string | null
          units?: string | null
        }
        Relationships: []
      }
      csb_publications: {
        Row: {
          catalog_id: number
          download_count: number | null
          fetched_at: string
          file_url: string | null
          id: string
          parent_category_id: number
          postback_target: string
          reference_year: number
          release_type_ar: string
          series_ar: string
          source: string
          source_url: string
          title_ar: string
        }
        Insert: {
          catalog_id: number
          download_count?: number | null
          fetched_at?: string
          file_url?: string | null
          id?: string
          parent_category_id: number
          postback_target: string
          reference_year: number
          release_type_ar: string
          series_ar: string
          source?: string
          source_url: string
          title_ar: string
        }
        Update: {
          catalog_id?: number
          download_count?: number | null
          fetched_at?: string
          file_url?: string | null
          id?: string
          parent_category_id?: number
          postback_target?: string
          reference_year?: number
          release_type_ar?: string
          series_ar?: string
          source?: string
          source_url?: string
          title_ar?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          access: Database["public"]["Enums"]["source_access"]
          access_note: string
          checked_at: string
          key: string
          kind: Database["public"]["Enums"]["source_kind"]
          licence: string | null
          name_ar: string | null
          name_en: string
          publisher: string
          url: string
        }
        Insert: {
          access: Database["public"]["Enums"]["source_access"]
          access_note: string
          checked_at?: string
          key: string
          kind: Database["public"]["Enums"]["source_kind"]
          licence?: string | null
          name_ar?: string | null
          name_en: string
          publisher: string
          url: string
        }
        Update: {
          access?: Database["public"]["Enums"]["source_access"]
          access_note?: string
          checked_at?: string
          key?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          licence?: string | null
          name_ar?: string | null
          name_en?: string
          publisher?: string
          url?: string
        }
        Relationships: []
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
            referencedRelation: "finding_comparison"
            referencedColumns: ["finding_id"]
          },
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
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "structure_inspection_history"
            referencedColumns: ["inspection_id"]
          },
          {
            foreignKeyName: "findings_previous_finding_id_fkey"
            columns: ["previous_finding_id"]
            isOneToOne: false
            referencedRelation: "finding_comparison"
            referencedColumns: ["finding_id"]
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
            foreignKeyName: "inspection_files_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "structure_inspection_history"
            referencedColumns: ["inspection_id"]
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
            foreignKeyName: "notifications_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "structure_inspection_history"
            referencedColumns: ["inspection_id"]
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
      reference_benchmark_runs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          dataset_id: string
          id: string
          model: string
          note: string | null
          split: Database["public"]["Enums"]["dataset_split"] | null
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          dataset_id: string
          id?: string
          model: string
          note?: string | null
          split?: Database["public"]["Enums"]["dataset_split"] | null
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          dataset_id?: string
          id?: string
          model?: string
          note?: string | null
          split?: Database["public"]["Enums"]["dataset_split"] | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_benchmark_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_benchmark_runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "reference_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_datasets: {
        Row: {
          archive_bytes: number | null
          archive_sha256: string | null
          attribution: string
          doi: string | null
          id: string
          image_count: number
          imported_at: string
          is_kuwaiti: boolean
          licence: string
          licence_url: string | null
          publisher: string
          purpose: string | null
          slug: string
          source_url: string
          title: string
        }
        Insert: {
          archive_bytes?: number | null
          archive_sha256?: string | null
          attribution: string
          doi?: string | null
          id?: string
          image_count?: number
          imported_at?: string
          is_kuwaiti?: boolean
          licence: string
          licence_url?: string | null
          publisher: string
          purpose?: string | null
          slug: string
          source_url: string
          title: string
        }
        Update: {
          archive_bytes?: number | null
          archive_sha256?: string | null
          attribution?: string
          doi?: string | null
          id?: string
          image_count?: number
          imported_at?: string
          is_kuwaiti?: boolean
          licence?: string
          licence_url?: string | null
          publisher?: string
          purpose?: string | null
          slug?: string
          source_url?: string
          title?: string
        }
        Relationships: []
      }
      reference_images: {
        Row: {
          bytes: number
          created_at: string
          dataset_id: string
          file_name: string
          height: number | null
          id: string
          label: Database["public"]["Enums"]["crack_label"]
          sha256: string
          source_path: string
          split: Database["public"]["Enums"]["dataset_split"]
          storage_path: string
          stored_bytes: number | null
          uploaded_at: string | null
          width: number | null
        }
        Insert: {
          bytes: number
          created_at?: string
          dataset_id: string
          file_name: string
          height?: number | null
          id?: string
          label: Database["public"]["Enums"]["crack_label"]
          sha256: string
          source_path: string
          split: Database["public"]["Enums"]["dataset_split"]
          storage_path: string
          stored_bytes?: number | null
          uploaded_at?: string | null
          width?: number | null
        }
        Update: {
          bytes?: number
          created_at?: string
          dataset_id?: string
          file_name?: string
          height?: number | null
          id?: string
          label?: Database["public"]["Enums"]["crack_label"]
          sha256?: string
          source_path?: string
          split?: Database["public"]["Enums"]["dataset_split"]
          storage_path?: string
          stored_bytes?: number | null
          uploaded_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_images_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "reference_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_predictions: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          predicted_label: Database["public"]["Enums"]["crack_label"]
          reference_image_id: string
          run_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          predicted_label: Database["public"]["Enums"]["crack_label"]
          reference_image_id: string
          run_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          predicted_label?: Database["public"]["Enums"]["crack_label"]
          reference_image_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_predictions_reference_image_id_fkey"
            columns: ["reference_image_id"]
            isOneToOne: false
            referencedRelation: "reference_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_predictions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "reference_benchmark_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_predictions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "reference_benchmark_scores"
            referencedColumns: ["run_id"]
          },
        ]
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
      finding_comparison: {
        Row: {
          comparison_note: string | null
          component: string | null
          confidence: number | null
          days_since_previous: number | null
          direction: string | null
          finding_id: string | null
          inspection_date: string | null
          inspection_id: string | null
          inspection_reference: string | null
          previous_finding_id: string | null
          previous_inspection_date: string | null
          previous_inspection_reference: string | null
          previous_severity: Database["public"]["Enums"]["severity"] | null
          severity: Database["public"]["Enums"]["severity"] | null
          structure_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "structure_inspection_history"
            referencedColumns: ["inspection_id"]
          },
          {
            foreignKeyName: "findings_previous_finding_id_fkey"
            columns: ["previous_finding_id"]
            isOneToOne: false
            referencedRelation: "finding_comparison"
            referencedColumns: ["finding_id"]
          },
          {
            foreignKeyName: "findings_previous_finding_id_fkey"
            columns: ["previous_finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
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
            referencedRelation: "finding_comparison"
            referencedColumns: ["finding_id"]
          },
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
      reference_benchmark_scores: {
        Row: {
          accuracy_pct: number | null
          correct: number | null
          dataset_id: string | null
          false_negatives: number | null
          false_positives: number | null
          model: string | null
          run_id: string | null
          scored: number | null
          split: Database["public"]["Enums"]["dataset_split"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_benchmark_runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "reference_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      structure_inspection_history: {
        Row: {
          finding_count: number | null
          high_severity_count: number | null
          inspection_date: string | null
          inspection_id: string | null
          inspection_type: Database["public"]["Enums"]["inspection_type"] | null
          recency: number | null
          reference: string | null
          status: Database["public"]["Enums"]["inspection_status"] | null
          structure_id: string | null
          structure_name: string | null
          structure_type: Database["public"]["Enums"]["structure_type"] | null
          worst_severity_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
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
      severity_rank: {
        Args: { s: Database["public"]["Enums"]["severity"] }
        Returns: number
      }
    }
    Enums: {
      analysis_status: "queued" | "running" | "succeeded" | "failed"
      crack_label: "cracked" | "uncracked"
      dataset_split: "train" | "validation" | "test"
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
      source_access: "open" | "partial" | "restricted" | "unreachable"
      source_kind: "gis" | "statistics" | "imagery" | "portal"
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
      crack_label: ["cracked", "uncracked"],
      dataset_split: ["train", "validation", "test"],
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
      source_access: ["open", "partial", "restricted", "unreachable"],
      source_kind: ["gis", "statistics", "imagery", "portal"],
      structure_type: ["bridge", "building", "road", "tunnel", "other"],
      user_role: ["admin", "inspector", "viewer"],
    },
  },
} as const
