import { supabase } from "@/supabase/client";

export type Lobby = {
  room_id: string;
  host: string;
  stake: number;
  players: number; // per team
  status?: "open" | "starting" | "in_game" | "closed";
  created_at?: string;
};

export async function createLobby(lobby: Lobby) {
  const { data, error } = await (supabase as any)
    .from("lobbies")
    .insert({
      room_id: lobby.room_id,
      host: lobby.host,
      stake: lobby.stake,
      players: lobby.players,
      status: lobby.status ?? "open",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Lobby;
}

export async function getLobbies() {
  const { data, error } = await (supabase as any)
    .from("lobbies")
    .select("room_id, host, stake, players, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lobby[];
}

export async function joinLobby(
  room_id: string,
  user_id: string,
  team: "red" | "blue"
) {
  const { error } = await (supabase as any).from("lobby_members").upsert(
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
  const { data, error } = await (supabase as any)
    .from("lobby_members")
    .select("user_id, team")
    .eq("lobby_room_id", room_id);
  if (error) throw error;
  return data as { user_id: string; team: "red" | "blue" }[];
}
