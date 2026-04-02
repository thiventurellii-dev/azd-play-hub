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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      about_us: {
        Row: {
          content: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      community_rules: {
        Row: {
          content: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          max_players: number | null
          min_players: number | null
          name: string
          rules_url: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          max_players?: number | null
          min_players?: number | null
          name: string
          rules_url?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          max_players?: number | null
          min_players?: number | null
          name?: string
          rules_url?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      match_results: {
        Row: {
          id: string
          match_id: string
          mmr_after: number | null
          mmr_before: number | null
          mmr_change: number | null
          player_id: string
          position: number
          score: number | null
        }
        Insert: {
          id?: string
          match_id: string
          mmr_after?: number | null
          mmr_before?: number | null
          mmr_change?: number | null
          player_id: string
          position: number
          score?: number | null
        }
        Update: {
          id?: string
          match_id?: string
          mmr_after?: number | null
          mmr_before?: number | null
          mmr_change?: number | null
          player_id?: string
          position?: number
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          duration_minutes: number | null
          first_player_id: string | null
          game_id: string
          id: string
          image_url: string | null
          played_at: string
          season_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          first_player_id?: string | null
          game_id: string
          id?: string
          image_url?: string | null
          played_at?: string
          season_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          first_player_id?: string | null
          game_id?: string
          id?: string
          image_url?: string | null
          played_at?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      mmr_ratings: {
        Row: {
          created_at: string
          current_mmr: number
          game_id: string | null
          games_played: number
          id: string
          player_id: string
          season_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          current_mmr?: number
          game_id?: string | null
          games_played?: number
          id?: string
          player_id: string
          season_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          current_mmr?: number
          game_id?: string | null
          games_played?: number
          id?: string
          player_id?: string
          season_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "mmr_ratings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          country_code: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          name: string
          nickname: string | null
          phone: string | null
          pronouns: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id: string
          name?: string
          nickname?: string | null
          phone?: string | null
          pronouns?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          nickname?: string | null
          phone?: string | null
          pronouns?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      season_games: {
        Row: {
          game_id: string
          id: string
          season_id: string
        }
        Insert: {
          game_id: string
          id?: string
          season_id: string
        }
        Update: {
          game_id?: string
          id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          prize: string | null
          prize_1st: number | null
          prize_2nd: number | null
          prize_3rd: number | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          prize?: string | null
          prize_1st?: number | null
          prize_2nd?: number | null
          prize_3rd?: number | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          prize?: string | null
          prize_1st?: number | null
          prize_2nd?: number | null
          prize_3rd?: number | null
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "player" | "super_admin"
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
      app_role: ["admin", "player", "super_admin"],
    },
  },
} as const
