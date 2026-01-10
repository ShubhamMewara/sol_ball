"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { joinLobby, startLobby, getLobbyIdByRoomId } from "@/lib/lobbies";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "sonner";

interface Player {
  name: string;
  isCurrentUser: boolean;
  username?: string;
}

interface LobbyWaitingModalProps {
  onClose: () => void;
  prizePot: number;
  maxPlayersPerTeam: number;
  matchDuration: string; // Added match duration prop
  isHost?: boolean; // Added isHost prop to determine if current user is lobby host
  existingPlayers?: {
    redTeam: Player[];
    blueTeam: Player[];
  };
  hostName: string;
  roomId: string;
}

export default function LobbyWaitingModal({
  onClose,
  prizePot,
  maxPlayersPerTeam,
  matchDuration, // Destructure matchDuration
  isHost = false, // Default to false if not provided
  existingPlayers,
  hostName,
  roomId,
}: LobbyWaitingModalProps) {
  const { user } = usePrivy();
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<"red" | "blue" | null>(null);
  const [redTeam, setRedTeam] = useState<Player[]>(
    existingPlayers?.redTeam || []
  );
  const [blueTeam, setBlueTeam] = useState<Player[]>(
    existingPlayers?.blueTeam || []
  );
  const navigatedRef = useRef(false);
  const [lobbyUuid, setLobbyUuid] = useState<string | null>(null);

  const myId = useMemo(() => user?.wallet?.address || user?.id || "", [user]);
  // myId label not needed in UI; we render truncated labels from DB entries

  const totalPlayers = redTeam.length + blueTeam.length;
  const maxPlayers = maxPlayersPerTeam * 2;
  const allSlotsFilled = totalPlayers === maxPlayers;

  const goToGame = async () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const mins = parseInt(String(matchDuration).replace(/[^0-9]/g, "")) || 3;
    // Add Api call
    // const pubkey = [new PublicKey("1221"), new PublicKey("12123132")];

    // const isValid = await join_match(pubkey, 0.0002);
    router.push(`/game/${encodeURIComponent(roomId)}`);
  };

  const handleStartMatch = async () => {
    if (totalPlayers < 2) return; // require at least 2 players
    console.log("Starting lobby:", roomId);
    try {
      await startLobby(roomId);
      console.log("Lobby started successfully");
    } catch (e) {
      // ignore; subscription below will still navigate if update succeeded server-side
      console.error(e);
    }
    goToGame();
    console.log("Navigating to game...");
  };

  const handleJoin = () => {
    if (!selectedTeam) return; // force team selection
    const params = new URLSearchParams();
    params.set("team", selectedTeam);
    params.set("teamSize", String(maxPlayersPerTeam));
    router.push(`/game/${encodeURIComponent(roomId)}?${params.toString()}`);
  };

  const handleTeamSelect = (team: "red" | "blue") => {
    // persist selection
    try {
      const uid = myId || "guest";
      // Check capacity client-side
      if (team === "red" && redTeam.length >= maxPlayersPerTeam) return;
      if (team === "blue" && blueTeam.length >= maxPlayersPerTeam) return;
      if (lobbyUuid) {
        joinLobby(lobbyUuid, uid, team).catch(() => {});
      }
    } catch {}
    // UI will sync from realtime subscription below
  };

  // Create empty slots for teams
  const redSlots = Array(maxPlayersPerTeam).fill(null);
  const blueSlots = Array(maxPlayersPerTeam).fill(null);

  // Resolve lobby UUID from room slug
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getLobbyIdByRoomId(roomId);
        if (!cancelled) setLobbyUuid(id);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLobbyUuid(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Load and subscribe to lobby members for this room (by lobby UUID)
  useEffect(() => {
    let active = true;
    if (!lobbyUuid) return;
    const refresh = async () => {
      try {
        const { data, error } = await supabase
          .from("lobby_members")
          .select("*, profile(*)")
          .eq("lobby_room_id", lobbyUuid);
        if (error) throw error;
        if (!active) return;
        if (!data) return;
        const red: Player[] = [];
        const blue: Player[] = [];
        for (const row of data || []) {
          const label = row.profile?.wallet_key;
          const p: Player = {
            name: label,
            isCurrentUser: row.user_id === myId,
            username: row.profile?.username ?? `Guest`,
          };
          (row.team === "red" ? red : blue).push(p);
        }
        setRedTeam(red.slice(0, maxPlayersPerTeam));
        setBlueTeam(blue.slice(0, maxPlayersPerTeam));
        // Reflect selectedTeam from membership
        if (data?.some((r) => r.user_id === myId && r.team === "red"))
          setSelectedTeam("red");
        else if (data?.some((r) => r.user_id === myId && r.team === "blue"))
          setSelectedTeam("blue");
        else setSelectedTeam(null);
      } catch (e) {
        console.error(e);
      }
    };

    refresh();

    const channel = supabase
      .channel(`lobby-members-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_members",
          filter: `lobby_room_id=eq.${lobbyUuid}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      active = false;
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [roomId, lobbyUuid, myId, maxPlayersPerTeam]);

  // Subscribe to lobby status changes to auto-start for all users when host starts
  useEffect(() => {
    const channel = supabase
      .channel(`lobby-status-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lobbies",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          try {
            // @ts-ignore - payload.new typing
            const newRow = (payload as any).new as
              | { status?: string }
              | undefined;
            if (newRow?.status === "started") {
              goToGame();
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [roomId, matchDuration, maxPlayersPerTeam, selectedTeam]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-[#1a1b24] rounded-2xl p-8 w-full max-w-3xl border-2 border-[#2a2b34] shadow-2xl animate-scaleIn">
        {/* Prize Pot */}
        <div className="text-center mb-6">
          <h3 className="text-[#DDD9C7] font-bold text-lg mb-2">Prize Pot</h3>
          <div
            className="text-[#7ACD54] font-bold text-5xl mb-4"
            style={{ textShadow: "0 4px 16px rgba(122, 205, 84, 0.4)" }}
          >
            {(prizePot / LAMPORTS_PER_SOL).toFixed(4)}
          </div>
          <div className="text-[#DDD9C7] text-sm">
            Match Duration:{" "}
            <span className="font-bold text-[#7ACD54]">{matchDuration}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          {isHost ? (
            <div className="text-[#DDD9C7] text-sm">
              Players joined: {totalPlayers}/{maxPlayers}
            </div>
          ) : (
            <div className="text-[#DDD9C7] text-sm animate-pulse">
              Waiting for host {`(${hostName})`} to start the match...
            </div>
          )}
        </div>

        {/* Teams Section */}
        <div className="flex gap-8 justify-evenly mb-8 ">
          {/* Red Team */}
          <div className="flex-1 max-w-[40%] w-full">
            <button
              onClick={() => handleTeamSelect("red")}
              disabled={redTeam.length >= maxPlayersPerTeam}
              className={`w-full py-3 rounded-full font-bold text-lg mb-4 transition-all shadow-lg ${
                selectedTeam === "red"
                  ? "bg-[#FF6B6B] text-white shadow-[#FF6B6B]/40 scale-105"
                  : `bg-[#FF6B6B]/80 text-white ${
                      redTeam.length >= maxPlayersPerTeam
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-[#FF6B6B]"
                    } shadow-[#FF6B6B]/20`
              }`}
            >
              RED
            </button>

            {/* Red Team Players */}
            <div className="space-y-3 ">
              {redSlots.map((_, idx) => {
                const player = redTeam[idx];
                return (
                  <div
                    key={idx}
                    className={`bg-[#2a2b34] rounded-lg py-3 px-4 font-sans text-center font-bold transition-all truncate  ${
                      player
                        ? "text-[#DDD9C7] border-2 border-[#FF6B6B]/30"
                        : "text-[#2a2b34] border-2 border-transparent"
                    }`}
                  >
                    {player ? (
                      <span className="">
                        {/* {player.name.length > 6
                          ? player.name.slice(0, 6) + "....."
                          : player.name} */}
                        {player.name}
                        {player.isCurrentUser && "(YOU)"}
                      </span>
                    ) : (
                      "Empty"
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <div className="text-white font-bold text-4xl px-4">VS</div>
          </div>

          {/* Blue Team */}
          <div className="flex-1 max-w-[40%] w-full">
            <button
              onClick={() => handleTeamSelect("blue")}
              disabled={blueTeam.length >= maxPlayersPerTeam}
              className={`w-full py-3 rounded-full font-bold text-lg mb-4 transition-all shadow-lg ${
                selectedTeam === "blue"
                  ? "bg-[#4FC3F7] text-white shadow-[#4FC3F7]/40 scale-105"
                  : `bg-[#4FC3F7]/80 text-white ${
                      blueTeam.length >= maxPlayersPerTeam
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-[#4FC3F7]"
                    } shadow-[#4FC3F7]/20`
              }`}
            >
              BLUE
            </button>

            {/* Blue Team Players */}
            <div className="space-y-3 w-full">
              {blueSlots.map((_, idx) => {
                const player = blueTeam[idx];
                return (
                  <div
                    key={idx}
                    className={`bg-[#2a2b34] rounded-lg py-3 px-4 text-center font-bold transition-all   truncate ${
                      player
                        ? "text-[#DDD9C7] border-2 border-[#4FC3F7]/30"
                        : "text-[#2a2b34] border-2 border-transparent"
                    }`}
                  >
                    {player ? (
                      <span>
                        {player.username} {player.isCurrentUser && "(YOU)"}
                      </span>
                    ) : (
                      "Empty"
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {isHost && (
            <button
              onClick={handleStartMatch}
              disabled={redTeam.length < 1 || blueTeam.length < 1}
              className="px-8 py-4 rounded-full font-bold text-lg bg-[#7ACD54] text-white hover:bg-[#6BBD44] transition-all shadow-lg shadow-[#7ACD54]/30"
            >
              START MATCH
            </button>
          )}
          {!isHost && (
            <button
              onClick={handleJoin}
              disabled={!selectedTeam}
              className="px-8 py-4 rounded-full font-bold text-lg bg-[#7ACD54] text-white hover:bg-[#6BBD44] transition-all shadow-lg shadow-[#7ACD54]/30"
            >
              ENTER MATCH
            </button>
          )}
          <button
            onClick={() => onClose()}
            className="px-8 py-4 rounded-full font-bold text-lg bg-[#FF6B6B] text-white hover:bg-[#FF5252] transition-all shadow-lg shadow-[#FF6B6B]/30"
          >
            LEAVE
          </button>
        </div>
      </div>
    </div>
  );
}
