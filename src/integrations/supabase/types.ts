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
      account_disable_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string
        }
        Relationships: []
      }
      achievement_definitions: {
        Row: {
          created_at: string
          criteria: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          trigger_config: Json | null
          trigger_type: string
        }
        Insert: {
          created_at?: string
          criteria?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          trigger_config?: Json | null
          trigger_type?: string
        }
        Update: {
          created_at?: string
          criteria?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      blood_characters: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          name_en: string
          role_type: Database["public"]["Enums"]["blood_role_type"]
          script_id: string
          team: Database["public"]["Enums"]["blood_team"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          name_en: string
          role_type: Database["public"]["Enums"]["blood_role_type"]
          script_id: string
          team: Database["public"]["Enums"]["blood_team"]
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          name_en?: string
          role_type?: Database["public"]["Enums"]["blood_role_type"]
          script_id?: string
          team?: Database["public"]["Enums"]["blood_team"]
        }
        Relationships: [
          {
            foreignKeyName: "blood_characters_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "blood_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_match_players: {
        Row: {
          character_id: string
          created_at: string
          id: string
          match_id: string
          player_id: string
          team: Database["public"]["Enums"]["blood_team"]
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          match_id: string
          player_id: string
          team: Database["public"]["Enums"]["blood_team"]
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string
          team?: Database["public"]["Enums"]["blood_team"]
        }
        Relationships: [
          {
            foreignKeyName: "blood_match_players_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "blood_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "blood_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_matches: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          platform: string | null
          played_at: string
          script_id: string
          season_id: string
          storyteller_player_id: string
          victory_conditions: Json | null
          winning_team: Database["public"]["Enums"]["blood_team"]
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          platform?: string | null
          played_at?: string
          script_id: string
          season_id: string
          storyteller_player_id: string
          victory_conditions?: Json | null
          winning_team: Database["public"]["Enums"]["blood_team"]
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          platform?: string | null
          played_at?: string
          script_id?: string
          season_id?: string
          storyteller_player_id?: string
          victory_conditions?: Json | null
          winning_team?: Database["public"]["Enums"]["blood_team"]
        }
        Relationships: [
          {
            foreignKeyName: "blood_matches_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "blood_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_mmr_ratings: {
        Row: {
          games_as_storyteller: number
          games_played: number
          id: string
          player_id: string
          season_id: string
          total_points: number
          updated_at: string
          wins_evil: number
          wins_good: number
        }
        Insert: {
          games_as_storyteller?: number
          games_played?: number
          id?: string
          player_id: string
          season_id: string
          total_points?: number
          updated_at?: string
          wins_evil?: number
          wins_good?: number
        }
        Update: {
          games_as_storyteller?: number
          games_played?: number
          id?: string
          player_id?: string
          season_id?: string
          total_points?: number
          updated_at?: string
          wins_evil?: number
          wins_good?: number
        }
        Relationships: [
          {
            foreignKeyName: "blood_mmr_ratings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_scripts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string | null
          victory_conditions: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug?: string | null
          victory_conditions?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string | null
          victory_conditions?: Json | null
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
      contact_links: {
        Row: {
          id: string
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          id?: string
          name: string
          updated_at?: string
          url?: string
        }
        Update: {
          id?: string
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: Database["public"]["Enums"]["friendship_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          user_id?: string
        }
        Relationships: []
      }
      game_scoring_schemas: {
        Row: {
          created_at: string
          game_id: string
          id: string
          schema: Json
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          schema?: Json
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "game_scoring_schemas_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_tag_links: {
        Row: {
          game_id: string
          id: string
          tag_id: string
        }
        Insert: {
          game_id: string
          id?: string
          tag_id: string
        }
        Update: {
          game_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_tag_links_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "game_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      game_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string
          factions: Json | null
          id: string
          image_url: string | null
          max_players: number | null
          min_players: number | null
          name: string
          rules_url: string | null
          slug: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          factions?: Json | null
          id?: string
          image_url?: string | null
          max_players?: number | null
          min_players?: number | null
          name: string
          rules_url?: string | null
          slug?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          factions?: Json | null
          id?: string
          image_url?: string | null
          max_players?: number | null
          min_players?: number | null
          name?: string
          rules_url?: string | null
          slug?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      ghost_players: {
        Row: {
          claim_code: string | null
          created_at: string
          display_name: string
          id: string
          linked_profile_id: string | null
        }
        Insert: {
          claim_code?: string | null
          created_at?: string
          display_name: string
          id?: string
          linked_profile_id?: string | null
        }
        Update: {
          claim_code?: string | null
          created_at?: string
          display_name?: string
          id?: string
          linked_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghost_players_linked_profile_id_fkey"
            columns: ["linked_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_edit_proposals: {
        Row: {
          created_at: string
          id: string
          match_id: string
          proposed_by: string
          proposed_data: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          proposed_by: string
          proposed_data: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          proposed_by?: string
          proposed_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      match_result_scores: {
        Row: {
          category_key: string
          id: string
          match_result_id: string
          value: number
        }
        Insert: {
          category_key: string
          id?: string
          match_result_id: string
          value?: number
        }
        Update: {
          category_key?: string
          id?: string
          match_result_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_result_scores_match_result_id_fkey"
            columns: ["match_result_id"]
            isOneToOne: false
            referencedRelation: "match_results"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          faction: string | null
          ghost_player_id: string | null
          id: string
          is_new_player: boolean | null
          match_id: string
          mmr_after: number | null
          mmr_before: number | null
          mmr_change: number | null
          player_id: string | null
          position: number
          score: number | null
          seat_position: number | null
        }
        Insert: {
          faction?: string | null
          ghost_player_id?: string | null
          id?: string
          is_new_player?: boolean | null
          match_id: string
          mmr_after?: number | null
          mmr_before?: number | null
          mmr_change?: number | null
          player_id?: string | null
          position: number
          score?: number | null
          seat_position?: number | null
        }
        Update: {
          faction?: string | null
          ghost_player_id?: string | null
          id?: string
          is_new_player?: boolean | null
          match_id?: string
          mmr_after?: number | null
          mmr_before?: number | null
          mmr_change?: number | null
          player_id?: string | null
          position?: number
          score?: number | null
          seat_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_ghost_player_id_fkey"
            columns: ["ghost_player_id"]
            isOneToOne: false
            referencedRelation: "ghost_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_room_comments: {
        Row: {
          created_at: string
          id: string
          room_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_room_comments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      match_room_players: {
        Row: {
          id: string
          joined_at: string
          player_id: string
          position: number
          room_id: string
          type: Database["public"]["Enums"]["match_room_player_type"]
        }
        Insert: {
          id?: string
          joined_at?: string
          player_id: string
          position?: number
          room_id: string
          type?: Database["public"]["Enums"]["match_room_player_type"]
        }
        Update: {
          id?: string
          joined_at?: string
          player_id?: string
          position?: number
          room_id?: string
          type?: Database["public"]["Enums"]["match_room_player_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      match_room_tag_links: {
        Row: {
          id: string
          room_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          room_id: string
          tag_id: string
        }
        Update: {
          id?: string
          room_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_room_tag_links_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_room_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "room_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      match_rooms: {
        Row: {
          blood_script_id: string | null
          created_at: string
          created_by: string
          description: string | null
          game_id: string
          id: string
          max_players: number
          platform: string | null
          result_id: string | null
          result_type: string | null
          room_type: Database["public"]["Enums"]["match_room_type"]
          scheduled_at: string
          season_id: string | null
          status: Database["public"]["Enums"]["match_room_status"]
          title: string
          updated_at: string
        }
        Insert: {
          blood_script_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          game_id: string
          id?: string
          max_players?: number
          platform?: string | null
          result_id?: string | null
          result_type?: string | null
          room_type?: Database["public"]["Enums"]["match_room_type"]
          scheduled_at: string
          season_id?: string | null
          status?: Database["public"]["Enums"]["match_room_status"]
          title: string
          updated_at?: string
        }
        Update: {
          blood_script_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          game_id?: string
          id?: string
          max_players?: number
          platform?: string | null
          result_id?: string | null
          result_type?: string | null
          room_type?: Database["public"]["Enums"]["match_room_type"]
          scheduled_at?: string
          season_id?: string | null
          status?: Database["public"]["Enums"]["match_room_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_rooms_blood_script_id_fkey"
            columns: ["blood_script_id"]
            isOneToOne: false
            referencedRelation: "blood_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rooms_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rooms_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          approval_status: string
          created_at: string
          duration_minutes: number | null
          first_player_id: string | null
          game_id: string
          id: string
          image_url: string | null
          platform: string | null
          played_at: string
          season_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          duration_minutes?: number | null
          first_player_id?: string | null
          game_id: string
          id?: string
          image_url?: string | null
          platform?: string | null
          played_at?: string
          season_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          duration_minutes?: number | null
          first_player_id?: string | null
          game_id?: string
          id?: string
          image_url?: string | null
          platform?: string | null
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          room_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          room_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          room_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "match_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      player_achievements: {
        Row: {
          achievement_id: string
          granted_at: string
          granted_by: string | null
          id: string
          player_id: string
        }
        Insert: {
          achievement_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          player_id: string
        }
        Update: {
          achievement_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
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
          steam_id: string | null
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
          steam_id?: string | null
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
          steam_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      room_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      rpg_adventures: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          system_id: string
          tag: Database["public"]["Enums"]["rpg_adventure_tag"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          system_id: string
          tag?: Database["public"]["Enums"]["rpg_adventure_tag"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          system_id?: string
          tag?: Database["public"]["Enums"]["rpg_adventure_tag"]
        }
        Relationships: [
          {
            foreignKeyName: "rpg_adventures_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "rpg_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      rpg_systems: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          rules_url: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          rules_url?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          rules_url?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      season_blood_scripts: {
        Row: {
          id: string
          script_id: string
          season_id: string
        }
        Insert: {
          id?: string
          script_id: string
          season_id: string
        }
        Update: {
          id?: string
          script_id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_blood_scripts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "blood_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_blood_scripts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
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
          cover_url: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          prize: string | null
          prize_1st: number | null
          prize_2nd: number | null
          prize_3rd: number | null
          prize_4th_6th: number | null
          prize_7th_10th: number | null
          regulation_url: string | null
          start_date: string
          status: string
          type: Database["public"]["Enums"]["season_type"]
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          prize?: string | null
          prize_1st?: number | null
          prize_2nd?: number | null
          prize_3rd?: number | null
          prize_4th_6th?: number | null
          prize_7th_10th?: number | null
          regulation_url?: string | null
          start_date: string
          status?: string
          type?: Database["public"]["Enums"]["season_type"]
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          prize?: string | null
          prize_1st?: number | null
          prize_2nd?: number | null
          prize_3rd?: number | null
          prize_4th_6th?: number | null
          prize_7th_10th?: number | null
          regulation_url?: string | null
          start_date?: string
          status?: string
          type?: Database["public"]["Enums"]["season_type"]
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          author_name: string | null
          complexity: string
          created_at: string
          id: string
          priority: string
          status: string
          text: string
        }
        Insert: {
          author_name?: string | null
          complexity?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          text: string
        }
        Update: {
          author_name?: string | null
          complexity?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          text?: string
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
      get_ghost_players: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          linked_profile_id: string
        }[]
      }
      get_public_profiles:
        | {
            Args: { p_ids?: string[] }
            Returns: {
              avatar_url: string
              city: string
              created_at: string
              id: string
              name: string
              nickname: string
              state: string
              status: string
              steam_id: string
            }[]
          }
        | {
            Args: { p_ids?: string[]; p_nickname?: string }
            Returns: {
              avatar_url: string
              city: string
              created_at: string
              id: string
              name: string
              nickname: string
              state: string
              status: string
              steam_id: string
            }[]
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_notifications: { Args: { p_rows: Json }; Returns: undefined }
      recalculate_blood_ratings: {
        Args: { p_season_id: string }
        Returns: undefined
      }
      recalculate_boardgame_mmr: {
        Args: { p_game_id: string; p_season_id: string }
        Returns: undefined
      }
      upsert_mmr_for_match: {
        Args: {
          p_current_mmr?: number
          p_game_id: string
          p_games_played?: number
          p_player_id: string
          p_season_id: string
          p_wins?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "player" | "super_admin"
      blood_role_type: "townsfolk" | "outsider" | "minion" | "demon"
      blood_team: "good" | "evil"
      friendship_status: "pending" | "accepted"
      match_room_player_type: "confirmed" | "waitlist"
      match_room_status:
        | "open"
        | "full"
        | "in_progress"
        | "finished"
        | "cancelled"
      match_room_type: "boardgame" | "botc" | "rpg"
      rpg_adventure_tag: "official" | "homebrew"
      season_type: "boardgame" | "blood"
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
      blood_role_type: ["townsfolk", "outsider", "minion", "demon"],
      blood_team: ["good", "evil"],
      friendship_status: ["pending", "accepted"],
      match_room_player_type: ["confirmed", "waitlist"],
      match_room_status: [
        "open",
        "full",
        "in_progress",
        "finished",
        "cancelled",
      ],
      match_room_type: ["boardgame", "botc", "rpg"],
      rpg_adventure_tag: ["official", "homebrew"],
      season_type: ["boardgame", "blood"],
    },
  },
} as const
