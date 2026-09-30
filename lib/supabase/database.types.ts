// Generated from local Supabase. Run npm run db:types; do not hand-edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      attempts: {
        Row: {
          answer: string;
          correct: boolean;
          created_at: string;
          exercise_id: string;
          feedback: string;
          id: string;
          request_id: string;
          user_id: string;
        };
        Insert: {
          answer: string;
          correct: boolean;
          created_at?: string;
          exercise_id: string;
          feedback: string;
          id?: string;
          request_id: string;
          user_id: string;
        };
        Update: {
          answer?: string;
          correct?: boolean;
          created_at?: string;
          exercise_id?: string;
          feedback?: string;
          id?: string;
          request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      content_audit: {
        Row: {
          action: string;
          actor: string | null;
          after_state: Json | null;
          before_state: Json | null;
          created_at: string;
          draft_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          draft_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          draft_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_audit_draft_id_fkey";
            columns: ["draft_id"];
            isOneToOne: false;
            referencedRelation: "content_drafts";
            referencedColumns: ["id"];
          },
        ];
      };
      content_drafts: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          published_course: string | null;
          review_note: string | null;
          reviewed_revision: number | null;
          reviewer: string | null;
          revision: number;
          source_course: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          id: string;
          published_course?: string | null;
          review_note?: string | null;
          reviewed_revision?: number | null;
          reviewer?: string | null;
          revision?: number;
          source_course: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          published_course?: string | null;
          review_note?: string | null;
          reviewed_revision?: number | null;
          reviewer?: string | null;
          revision?: number;
          source_course?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_drafts_published_course_fkey";
            columns: ["published_course"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_drafts_source_course_fkey";
            columns: ["source_course"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      content_reports: {
        Row: {
          created_at: string;
          id: string;
          lesson_id: string;
          message: string;
          request_id: string;
          revision: number;
          snapshot: Json;
          staff_note: string;
          status: string;
          tutor_request: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lesson_id: string;
          message: string;
          request_id: string;
          revision?: number;
          snapshot: Json;
          staff_note?: string;
          status?: string;
          tutor_request?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          lesson_id?: string;
          message?: string;
          request_id?: string;
          revision?: number;
          snapshot?: Json;
          staff_note?: string;
          status?: string;
          tutor_request?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_reports_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      course_versions: {
        Row: {
          id: string;
          review_record: string | null;
          review_status: string;
          summary: string;
          supersedes_id: string | null;
          title: string;
          version: number;
        };
        Insert: {
          id: string;
          review_record?: string | null;
          review_status: string;
          summary: string;
          supersedes_id?: string | null;
          title: string;
          version: number;
        };
        Update: {
          id?: string;
          review_record?: string | null;
          review_status?: string;
          summary?: string;
          supersedes_id?: string | null;
          title?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "course_versions_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      enrolments: {
        Row: {
          course_id: string;
          enrolled_at: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          enrolled_at?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          enrolled_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrolments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          kind: string;
          lesson_id: string;
          options: Json;
          prompt: string;
        };
        Insert: {
          id: string;
          kind: string;
          lesson_id: string;
          options: Json;
          prompt: string;
        };
        Update: {
          id?: string;
          kind?: string;
          lesson_id?: string;
          options?: Json;
          prompt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_outcome_events: {
        Row: {
          attempt_id: string;
          correct: boolean;
          course_id: string;
          elapsed_seconds: number | null;
          exercise_id: string;
          kind: string;
          lesson_id: string;
          occurred_at: string;
          policy_version: string;
          previous_correct: boolean | null;
          prior_lesson_attempts: number;
          prior_task_attempts: number;
          recorded_tutor_use: boolean;
          user_id: string;
        };
        Insert: {
          attempt_id: string;
          correct: boolean;
          course_id: string;
          elapsed_seconds?: number | null;
          exercise_id: string;
          kind: string;
          lesson_id: string;
          occurred_at: string;
          policy_version?: string;
          previous_correct?: boolean | null;
          prior_lesson_attempts: number;
          prior_task_attempts: number;
          recorded_tutor_use: boolean;
          user_id: string;
        };
        Update: {
          attempt_id?: string;
          correct?: boolean;
          course_id?: string;
          elapsed_seconds?: number | null;
          exercise_id?: string;
          kind?: string;
          lesson_id?: string;
          occurred_at?: string;
          policy_version?: string;
          previous_correct?: boolean | null;
          prior_lesson_attempts?: number;
          prior_task_attempts?: number;
          recorded_tutor_use?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_outcome_events_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: true;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_outcome_events_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: true;
            referencedRelation: "review_schedule";
            referencedColumns: ["attempt_id"];
          },
          {
            foreignKeyName: "learning_outcome_events_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_outcome_events_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_outcome_events_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_notes: {
        Row: {
          body: string;
          lesson_id: string;
          request_id: string;
          revision: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          lesson_id: string;
          request_id: string;
          revision: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          lesson_id?: string;
          request_id?: string;
          revision?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_reads: {
        Row: {
          lesson_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          lesson_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          lesson_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_reads_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          body: string;
          course_id: string;
          example: string;
          id: string;
          minutes: number;
          objective: string;
          position: number;
          title: string;
        };
        Insert: {
          body: string;
          course_id: string;
          example: string;
          id: string;
          minutes: number;
          objective: string;
          position: number;
          title: string;
        };
        Update: {
          body?: string;
          course_id?: string;
          example?: string;
          id?: string;
          minutes?: number;
          objective?: string;
          position?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          daily_minutes: number;
          display_name: string;
          goal: string;
          locale: string;
          onboarding_completed_at: string | null;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_minutes?: number;
          display_name?: string;
          goal?: string;
          locale?: string;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_minutes?: number;
          display_name?: string;
          goal?: string;
          locale?: string;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      project_submissions: {
        Row: {
          base_revision: number;
          created_at: string;
          feedback: Json;
          feedback_version: string;
          id: string;
          milestones: Json;
          project_id: string;
          request_id: string;
          revision: number;
          user_id: string;
        };
        Insert: {
          base_revision: number;
          created_at?: string;
          feedback: Json;
          feedback_version?: string;
          id?: string;
          milestones: Json;
          project_id: string;
          request_id: string;
          revision: number;
          user_id: string;
        };
        Update: {
          base_revision?: number;
          created_at?: string;
          feedback?: Json;
          feedback_version?: string;
          id?: string;
          milestones?: Json;
          project_id?: string;
          request_id?: string;
          revision?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_submissions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      project_versions: {
        Row: {
          brief: string;
          course_id: string;
          id: string;
          rubric: Json;
          title: string;
          version: number;
        };
        Insert: {
          brief: string;
          course_id: string;
          id: string;
          rubric: Json;
          title: string;
          version: number;
        };
        Update: {
          brief?: string;
          course_id?: string;
          id?: string;
          rubric?: Json;
          title?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_versions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      report_audit: {
        Row: {
          actor: string | null;
          created_at: string;
          id: string;
          note: string;
          report_id: string;
          status: string;
        };
        Insert: {
          actor?: string | null;
          created_at?: string;
          id?: string;
          note: string;
          report_id: string;
          status: string;
        };
        Update: {
          actor?: string | null;
          created_at?: string;
          id?: string;
          note?: string;
          report_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_audit_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "content_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_roles: {
        Row: {
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      exercise_evidence: {
        Row: {
          attempt_count: number | null;
          demonstrated: boolean | null;
          exercise_id: string | null;
          first_demonstrated_at: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_outcome_summary: {
        Row: {
          course_id: string | null;
          delayed_checks: number | null;
          delayed_passed: number | null;
          initial_checks: number | null;
          initial_passed: number | null;
          practice_checks: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "learning_outcome_events_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      review_schedule: {
        Row: {
          attempt_id: string | null;
          correct: boolean | null;
          course_id: string | null;
          created_at: string | null;
          due: boolean | null;
          due_date: string | null;
          exercise_id: string | null;
          lesson_id: string | null;
          policy_version: string | null;
          timezone: string | null;
          title: string | null;
          today: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercises_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "course_versions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      content_review_material: { Args: { draft: string }; Returns: Json };
      create_content_draft: {
        Args: { request: string; source: string };
        Returns: string;
      };
      enrol_course: { Args: { course: string }; Returns: undefined };
      is_content_staff: { Args: never; Returns: boolean };
      mark_lesson_read: { Args: { lesson: string }; Returns: undefined };
      publish_content_draft: {
        Args: { draft: string; expected: number };
        Returns: string;
      };
      report_content: {
        Args: {
          lesson: string;
          message: string;
          request: string;
          tutor_request?: string;
        };
        Returns: string;
      };
      review_content_draft: {
        Args: { draft: string; expected: number; note: string };
        Returns: undefined;
      };
      save_content_draft: {
        Args: { content: Json; draft: string; expected: number };
        Returns: undefined;
      };
      save_lesson_note: {
        Args: {
          body: string;
          expected: number;
          lesson: string;
          request: string;
        };
        Returns: Json;
      };
      search_lessons: {
        Args: { query: string };
        Returns: {
          course_id: string;
          course_title: string;
          course_version: number;
          lesson_id: string;
          objective: string;
          title: string;
        }[];
      };
      submit_attempt: {
        Args: { exercise: string; request: string; submitted: string };
        Returns: Json;
      };
      submit_project: {
        Args: { base: number; project: string; request: string; work: Json };
        Returns: Json;
      };
      triage_content_report: {
        Args: {
          expected: number;
          note: string;
          report: string;
          status: string;
        };
        Returns: undefined;
      };
      use_scripted_tutor: {
        Args: { intent: string; lesson: string; request: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
