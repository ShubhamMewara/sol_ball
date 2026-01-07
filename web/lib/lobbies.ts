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
  lobby_id: string,
  user_id: string,
  team: "red" | "blue"
) {
  // Note: lobby_members.lobby_room_id is a FK to lobbies.id (UUID)
  // Prefer a single upsert using the composite unique constraint (lobby_room_id, user_id)
  const { error } = await supabase.from("lobby_members").upsert(
    {
      lobby_room_id: lobby_id,
      user_id,
      team,
    },
    { onConflict: "lobby_room_id,user_id" }
  );
  if (!error) return;
  // If the table doesn't yet have the composite unique constraint, fall back to delete + insert
  if (error?.code === "42P10") {
    await supabase
      .from("lobby_members")
      .delete()
      .eq("lobby_room_id", lobby_id)
      .eq("user_id", user_id);
    const { error: insertError } = await supabase
      .from("lobby_members")
      .insert({ lobby_room_id: lobby_id, user_id, team });
    if (insertError) throw insertError;
  } else {
    throw error;
  }
}

export async function getLobbyMembers(lobby_id: string) {
  const { data, error } = await supabase
    .from("lobby_members")
    .select("user_id, team")
    .eq("lobby_room_id", lobby_id);
  if (error) throw error;
  return data as { user_id: string; team: "red" | "blue" }[];
}

export async function getLobbyMembership(lobby_id: string, user_id: string) {
  const { data, error } = await supabase
    .from("lobby_members")
    .select("*")
    .eq("lobby_room_id", lobby_id)
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) {
    console.error("getLobbyMembership error", { lobby_id, user_id, error });
  }
  return data;
}

export async function startLobby(room_id: string) {
  const { error } = await supabase
    .from("lobbies")
    .update({ status: "started", started_at: new Date().toISOString() })
    .eq("room_id", room_id);
  if (error) throw error;
}

export async function getLobbyByRoomId(room_id: string) {
  const { data, error } = await supabase
    .from("lobbies")
    .select("*")
    .eq("room_id", room_id)
    .single();
  if (error) throw error;
  return data;
}

export async function getLobbyIdByRoomId(room_id: string) {
  const { data, error } = await supabase
    .from("lobbies")
    .select("id")
    .eq("room_id", room_id)
    .single();
  if (error) throw error;
  return data?.id as string;
}
