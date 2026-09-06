export type Profile = {
  id: string;
  display_name: string;
  haptics: boolean;
  created_at: string;
};
export type Couple = {
  id: string;
  invite_code: string | null;
  created_at: string;
  connected_at: string | null;
  channel_version: string;
};
export type Member = {
  user_id: string;
  couple_id: string;
  display_name: string;
  joined_at: string;
  last_seen_at: string | null;
};
export type Plant = {
  id: string;
  couple_id: string;
  name: string;
  growth_points: number;
  stage: number;
  water_level: number;
  last_watered_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Note = {
  id: string;
  couple_id: string;
  author_id: string;
  text: string;
  position_x: number;
  position_y: number;
  archived_at: string | null;
  created_at: string;
};
export type Memory = {
  id: string;
  couple_id: string;
  type: string;
  created_at: string;
  metadata: Record<string, unknown>;
};
export type Action = {
  id: string;
  couple_id: string;
  plant_id: string;
  user_id: string | null;
  action_type: "water" | "touch" | "shared";
  growth_delta: number;
  created_at: string;
};
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      couples: Table<Couple>;
      couple_members: Table<Member>;
      plants: Table<Plant>;
      notes: Table<Note>;
      memories: Table<Memory>;
      plant_actions: Table<Action>;
      push_tokens: Table<{
        user_id: string;
        token: string;
        created_at: string;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_couple: { Args: Record<string, never>; Returns: string };
      join_couple: { Args: { code: string }; Returns: string };
      perform_action: {
        Args: { target_plant: string; kind: string; request_id: string };
        Returns: { shared: boolean; duplicate: boolean };
      };
      save_note: { Args: { body: string }; Returns: undefined };
      move_note: {
        Args: { target_note: string; x: number; y: number };
        Returns: undefined;
      };
      archive_note: { Args: { target_note: string }; Returns: undefined };
      poke_partner: { Args: { request_id: string }; Returns: string };
      update_profile: {
        Args: { new_name: string; enable_haptics: boolean };
        Returns: undefined;
      };
      rename_plant: { Args: { new_name: string }; Returns: undefined };
      leave_couple: { Args: Record<string, never>; Returns: undefined };
      delete_own_account: { Args: Record<string, never>; Returns: undefined };
      mark_seen: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
export type Space = {
  couple: Couple;
  members: Member[];
  plant: Plant;
  notes: Note[];
  memories: Memory[];
  lastWater: string | null;
};
