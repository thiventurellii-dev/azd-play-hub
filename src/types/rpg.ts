// Tipos das tabelas RPG no banco externo (npinawelxdtsrcvzzvvs).
// supabaseExternal não tem types gerados, então mantemos manualmente.

export type RpgCampaignStatus = 'planning' | 'active' | 'completed' | 'abandoned';
export type RpgCampaignPlayerStatus =
  | 'invited'
  | 'accepted'
  | 'pending_request'
  | 'left'
  | 'declined';
export type RpgCharacterCampaignStatus = 'active' | 'left' | 'dead' | 'retired';
export type RpgSessionEventType =
  | 'death'
  | 'level_up'
  | 'milestone'
  | 'legendary_item'
  | 'important_npc'
  | 'betrayal'
  | 'achievement';

export interface RpgCharacter {
  id: string;
  player_id: string;
  system_id: string | null;
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  portrait_url: string | null;
  backstory: string | null;
  alignment: string | null;
  traits: string | null;
  gear: string | null;
  external_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface RpgCampaign {
  id: string;
  adventure_id: string | null;
  master_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  status: RpgCampaignStatus;
  is_public: boolean;
  open_join: boolean;
  max_players: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RpgCampaignPlayer {
  id: string;
  campaign_id: string;
  player_id: string;
  status: RpgCampaignPlayerStatus;
  joined_at: string;
}

export interface RpgCampaignCharacter {
  id: string;
  campaign_id: string;
  character_id: string;
  status: RpgCharacterCampaignStatus;
  joined_at: string;
  exited_at: string | null;
  exit_room_id: string | null;
}

export interface RpgCampaignPost {
  id: string;
  campaign_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface RpgCampaignInvite {
  id: string;
  campaign_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface RpgSessionEvent {
  id: string;
  room_id: string;
  event_type: RpgSessionEventType;
  character_id: string | null;
  description: string | null;
  created_at: string;
}

// Públicos derivados (joins)
export interface PublicProfileLite {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
}

export interface RpgCampaignSummary extends RpgCampaign {
  master?: PublicProfileLite | null;
  adventure?: { id: string; name: string; slug: string | null; image_url: string | null } | null;
  party_count?: number;
  session_count?: number;
}
