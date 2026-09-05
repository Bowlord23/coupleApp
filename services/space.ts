import { supabase } from "../lib/supabase";
import type { Space } from "../types/database";
export async function loadSpace(userId: string): Promise<Space | null> {
  const membership = await supabase
    .from("couple_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (membership.error) throw membership.error;
  if (!membership.data) return null;
  const id = membership.data.couple_id;
  const [couple, members, plant, notes, memories, water] = await Promise.all([
    supabase.from("couples").select("*").eq("id", id).single(),
    supabase.from("couple_members").select("*").eq("couple_id", id),
    supabase.from("plants").select("*").eq("couple_id", id).single(),
    supabase.from("notes").select("*").eq("couple_id", id),
    supabase
      .from("memories")
      .select("*")
      .eq("couple_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("plant_actions")
      .select("created_at")
      .eq("couple_id", id)
      .eq("user_id", userId)
      .eq("action_type", "water")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  for (const result of [couple, members, plant, notes, memories, water])
    if (result.error) throw result.error;
  if (!couple.data || !plant.data) throw new Error("FORBIDDEN");
  return {
    couple: couple.data,
    members: members.data ?? [],
    plant: plant.data,
    notes: notes.data ?? [],
    memories: memories.data ?? [],
    lastWater: water.data?.[0]?.created_at ?? null,
  };
}
