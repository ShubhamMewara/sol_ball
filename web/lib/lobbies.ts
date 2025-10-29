import { supabase } from "@/supabase/client";
import { TablesInsert } from "@/supabase/database.types";

export async function createLobby(lobby: TablesInsert<"lobbies">) {
  const { data, error } = await supabase
    .from("lobbies")
    .insert(lobby)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLobbies() {
  const { data, error } = await supabase
    .from("lobbies")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function joinLobby(
  room_id: string,
  user_id: string,
  team: "red" | "blue"
) {
  const { error } = await supabase.from("lobby_members").upsert(
    {
      lobby_room_id: room_id,
      user_id,
      team,
    },
    { onConflict: "lobby_room_id,user_id" }
  );
  if (error) throw error;
}

export async function getLobbyMembers(room_id: string) {
  const { data, error } = await supabase
    .from("lobby_members")
    .select("user_id, team")
    .eq("lobby_room_id", room_id);
  if (error) throw error;
  return data as { user_id: string; team: "red" | "blue" }[];
}
