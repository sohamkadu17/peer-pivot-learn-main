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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_chats: {
        Row: {
          assistant_reply: string | null
          conversation_title: string | null
          created_at: string | null
          id: string
          is_resolved: boolean | null
          session_id: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          assistant_reply?: string | null
          conversation_title?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          session_id?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          assistant_reply?: string | null
          conversation_title?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          session_id?: string | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      badge_types: {
        Row: {
          condition_metric: string | null
          condition_value: number | null
          created_at: string | null
          description: string
          icon_name: string
          id: string
          title: string
        }
        Insert: {
          condition_metric?: string | null
          condition_value?: number | null
          created_at?: string | null
          description: string
          icon_name: string
          id?: string
          title: string
        }
        Update: {
          condition_metric?: string | null
          condition_value?: number | null
          created_at?: string | null
          description?: string
          icon_name?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          badge_id: string | null
          id: string
          issued_at: string | null
          pdf_url: string | null
          share_token: string | null
          title: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          id?: string
          issued_at?: string | null
          pdf_url?: string | null
          share_token?: string | null
          title: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          id?: string
          issued_at?: string | null
          pdf_url?: string | null
          share_token?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          badge_id: string | null
          created_at: string | null
          description: string
          end_date: string
          id: string
          is_active: boolean | null
          points_reward: number | null
          start_date: string
          target_metric: string
          target_value: number
          title: string
        }
        Insert: {
          badge_id?: string | null
          created_at?: string | null
          description: string
          end_date: string
          id?: string
          is_active?: boolean | null
          points_reward?: number | null
          start_date: string
          target_metric: string
          target_value: number
          title: string
        }
        Update: {
          badge_id?: string | null
          created_at?: string | null
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          points_reward?: number | null
          start_date?: string
          target_metric?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      chat_intents: {
        Row: {
          created_at: string | null
          id: string
          name: string
          patterns: string[] | null
          responses: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          patterns?: string[] | null
          responses?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          patterns?: string[] | null
          responses?: string[] | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          mentor_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentor_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mentor_id?: string
          student_id?: string
        }
        Relationships: []
      }
      doubts: {
        Row: {
          ai_answer: string | null
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          priority: string | null
          student_id: string
          subject_id: string | null
          title: string
        }
        Insert: {
          ai_answer?: string | null
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          priority?: string | null
          student_id: string
          subject_id?: string | null
          title: string
        }
        Update: {
          ai_answer?: string | null
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          priority?: string | null
          student_id?: string
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_cache: {
        Row: {
          contribution_score: number | null
          id: string
          rank: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contribution_score?: number | null
          id?: string
          rank?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contribution_score?: number | null
          id?: string
          rank?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          id: string
          poll_id: string
          selected_options: Json | null
          voted_at: string
          voter_id: string
        }
        Insert: {
          id?: string
          poll_id: string
          selected_options?: Json | null
          voted_at?: string
          voter_id: string
        }
        Update: {
          id?: string
          poll_id?: string
          selected_options?: Json | null
          voted_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          options: Json | null
          question: string
          session_id: string
        }
        Insert: {
          allow_multiple?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          options?: Json | null
          question: string
          session_id: string
        }
        Update: {
          allow_multiple?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          options?: Json | null
          question?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: Json | null
          bio: string | null
          college_email: string | null
          contribution_score: number | null
          created_at: string
          credits: number | null
          google_connected_at: string | null
          google_refresh_token: string | null
          id: string
          is_mentor: boolean | null
          rating: number | null
          subject_ids: string[] | null
          subjects: string[] | null
          total_sessions_attended: number | null
          total_sessions_taught: number | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          college_email?: string | null
          contribution_score?: number | null
          created_at?: string
          credits?: number | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          id?: string
          is_mentor?: boolean | null
          rating?: number | null
          subject_ids?: string[] | null
          subjects?: string[] | null
          total_sessions_attended?: number | null
          total_sessions_taught?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          college_email?: string | null
          contribution_score?: number | null
          created_at?: string
          credits?: number | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          id?: string
          is_mentor?: boolean | null
          rating?: number | null
          subject_ids?: string[] | null
          subjects?: string[] | null
          total_sessions_attended?: number | null
          total_sessions_taught?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          completed_at: string
          id: string
          quiz_id: string
          score: number | null
          student_id: string
          total_points: number | null
        }
        Insert: {
          completed_at?: string
          id?: string
          quiz_id: string
          score?: number | null
          student_id: string
          total_points?: number | null
        }
        Update: {
          completed_at?: string
          id?: string
          quiz_id?: string
          score?: number | null
          student_id?: string
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          session_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          session_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          rated_user_id: string
          rater_id: string
          rating: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          rated_user_id: string
          rater_id: string
          rating?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          rated_user_id?: string
          rater_id?: string
          rating?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          ai_summary: string | null
          content: string | null
          created_at: string
          id: string
          subject_id: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          ai_summary?: string | null
          content?: string | null
          created_at?: string
          id?: string
          subject_id?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          ai_summary?: string | null
          content?: string | null
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      session_resources: {
        Row: {
          added_at: string
          added_by: string
          id: string
          resource_id: string
          session_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          id?: string
          resource_id: string
          session_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          id?: string
          resource_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_resources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          credits_cost: number | null
          description: string | null
          duration: number | null
          end_ts: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          is_interactive: boolean | null
          meeting_link: string | null
          notes: string | null
          scheduled_time: string | null
          session_recording_url: string | null
          start_ts: string | null
          status: string | null
          student_id: string
          subject: string | null
          subject_id: string | null
          teacher_id: string
          title: string
          whiteboard_data: Json | null
        }
        Insert: {
          created_at?: string
          credits_cost?: number | null
          description?: string | null
          duration?: number | null
          end_ts?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_interactive?: boolean | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_time?: string | null
          session_recording_url?: string | null
          start_ts?: string | null
          status?: string | null
          student_id: string
          subject?: string | null
          subject_id?: string | null
          teacher_id: string
          title: string
          whiteboard_data?: Json | null
        }
        Update: {
          created_at?: string
          credits_cost?: number | null
          description?: string | null
          duration?: number | null
          end_ts?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_interactive?: boolean | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_time?: string | null
          session_recording_url?: string | null
          start_ts?: string | null
          status?: string | null
          student_id?: string
          subject?: string | null
          subject_id?: string | null
          teacher_id?: string
          title?: string
          whiteboard_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          id: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_subjects_learn: {
        Row: {
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_learn_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subjects_teach: {
        Row: {
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_teach_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string
          id: string
          session_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by: string
          id?: string
          session_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          session_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_contribution_score: {
        Args: { user_profile: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: number
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
