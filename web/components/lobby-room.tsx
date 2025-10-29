"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { joinLobby } from "@/lib/lobbies";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/client";

interface Player {
  name: string;
  isCurrentUser: boolean;
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
  const [redTeam, setRedTeam] = useState<Player[]>(existingPlayers?.redTeam || []);
  const [blueTeam, setBlueTeam] = useState<Player[]>(existingPlayers?.blueTeam || []);

  const myId = useMemo(
    () => user?.wallet?.address || user?.id || "",
    [user]
  );
  // myId label not needed in UI; we render truncated labels from DB entries

  const totalPlayers = redTeam.length + blueTeam.length;
  const maxPlayers = maxPlayersPerTeam * 2;
  const allSlotsFilled = totalPlayers === maxPlayers;

  const handleStartMatch = () => {
    if (totalPlayers < 2) return; // require at least 2 players
    const mins = parseInt(String(matchDuration).replace(/[^0-9]/g, "")) || 3;
    const params = new URLSearchParams({ start: "1", duration: String(mins) });
    if (selectedTeam) params.set("team", selectedTeam);
    params.set("teamSize", String(maxPlayersPerTeam));
    router.push(`/game/${encodeURIComponent(roomId)}?${params.toString()}`);
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
      joinLobby(roomId, uid, team).catch(() => {});
    } catch {}
    // UI will sync from realtime subscription below
  };

  // Create empty slots for teams
  const redSlots = Array(maxPlayersPerTeam).fill(null);
  const blueSlots = Array(maxPlayersPerTeam).fill(null);

  // Load and subscribe to lobby members for this room
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data, error } = await supabase
          .from("lobby_members")
          .select("user_id, team")
          .eq("lobby_room_id", roomId);
        if (error) throw error;
        if (!active) return;
        const red: Player[] = [];
        const blue: Player[] = [];
        for (const row of data || []) {
          const label = row.user_id.length > 10
            ? `${row.user_id.slice(0, 4)}…${row.user_id.slice(-4)}`
            : row.user_id;
          const p: Player = {
            name: label,
            isCurrentUser: row.user_id === myId,
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
          filter: `lobby_room_id=eq.${roomId}`,
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
  }, [roomId, myId, maxPlayersPerTeam]);

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
            {prizePot}
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
        <div className="flex gap-8 mb-8">
          {/* Red Team */}
          <div className="flex-1">
            <button
              onClick={() => handleTeamSelect("red")}
              disabled={redTeam.length >= maxPlayersPerTeam}
              className={`w-full py-3 rounded-full font-bold text-lg mb-4 transition-all shadow-lg ${
                selectedTeam === "red"
                  ? "bg-[#FF6B6B] text-white shadow-[#FF6B6B]/40 scale-105"
                  : `bg-[#FF6B6B]/80 text-white ${redTeam.length >= maxPlayersPerTeam ? "opacity-50 cursor-not-allowed" : "hover:bg-[#FF6B6B]"} shadow-[#FF6B6B]/20`
              }`}
            >
              RED
            </button>

            {/* Red Team Players */}
            <div className="space-y-3">
              {redSlots.map((_, idx) => {
                const player = redTeam[idx];
                return (
                  <div
                    key={idx}
                    className={`bg-[#2a2b34] rounded-lg py-3 px-4 text-center font-bold transition-all ${
                      player
                        ? "text-[#DDD9C7] border-2 border-[#FF6B6B]/30"
                        : "text-[#2a2b34] border-2 border-transparent"
                    }`}
                  >
                    {player ? (
                      <span>
                        {player.name} {player.isCurrentUser && "(YOU)"}
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
          <div className="flex-1">
            <button
              onClick={() => handleTeamSelect("blue")}
              disabled={blueTeam.length >= maxPlayersPerTeam}
              className={`w-full py-3 rounded-full font-bold text-lg mb-4 transition-all shadow-lg ${
                selectedTeam === "blue"
                  ? "bg-[#4FC3F7] text-white shadow-[#4FC3F7]/40 scale-105"
                  : `bg-[#4FC3F7]/80 text-white ${blueTeam.length >= maxPlayersPerTeam ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4FC3F7]"} shadow-[#4FC3F7]/20`
              }`}
            >
              BLUE
            </button>

            {/* Blue Team Players */}
            <div className="space-y-3">
              {blueSlots.map((_, idx) => {
                const player = blueTeam[idx];
                return (
                  <div
                    key={idx}
                    className={`bg-[#2a2b34] rounded-lg py-3 px-4 text-center font-bold transition-all ${
                      player
                        ? "text-[#DDD9C7] border-2 border-[#4FC3F7]/30"
                        : "text-[#2a2b34] border-2 border-transparent"
                    }`}
                  >
                    {player ? (
                      <span>
                        {player.name} {player.isCurrentUser && "(YOU)"}
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
              disabled={totalPlayers < 2}
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
