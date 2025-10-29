"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { joinLobby } from "@/lib/lobbies";
import { useRouter } from "next/navigation";

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
  const [redTeam, setRedTeam] = useState<Player[]>(
    existingPlayers?.redTeam || []
  );
  const [blueTeam, setBlueTeam] = useState<Player[]>(
    existingPlayers?.blueTeam || []
  );

  const currentUser = { name: "piyushhsainii", isCurrentUser: true };

  const totalPlayers = redTeam.length + blueTeam.length;
  const maxPlayers = maxPlayersPerTeam * 2;
  const allSlotsFilled = totalPlayers === maxPlayers;

  const handleStartMatch = () => {
    router.push(`/game/${encodeURIComponent(roomId)}`);
  };

  const handleJoin = () => {
    router.push(`/game/${encodeURIComponent(roomId)}`);
  };

  const handleTeamSelect = (team: "red" | "blue") => {
    // persist selection
    try {
      const uid = user?.wallet?.address || user?.id || "guest";
      joinLobby(roomId, uid, team).catch(() => {});
    } catch {}
    // Remove current user from both teams first
    const newRedTeam = redTeam.filter((p) => !p.isCurrentUser);
    const newBlueTeam = blueTeam.filter((p) => !p.isCurrentUser);

    // Add current user to selected team
    if (team === "red" && newRedTeam.length < maxPlayersPerTeam) {
      setRedTeam([...newRedTeam, currentUser]);
      setBlueTeam(newBlueTeam);
      setSelectedTeam("red");
    } else if (team === "blue" && newBlueTeam.length < maxPlayersPerTeam) {
      setBlueTeam([...newBlueTeam, currentUser]);
      setRedTeam(newRedTeam);
      setSelectedTeam("blue");
    }
  };

  // Create empty slots for teams
  const redSlots = Array(maxPlayersPerTeam).fill(null);
  const blueSlots = Array(maxPlayersPerTeam).fill(null);

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
            allSlotsFilled ? (
              <div className="text-[#7ACD54] font-bold text-lg animate-pulse">
                All players ready! You can start the match.
              </div>
            ) : (
              <div className="text-[#DDD9C7] text-sm">
                Waiting for players... ({totalPlayers}/{maxPlayers})
              </div>
            )
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
              className={`w-full py-3 rounded-full font-bold text-lg mb-4 transition-all shadow-lg ${
                selectedTeam === "red"
                  ? "bg-[#FF6B6B] text-white shadow-[#FF6B6B]/40 scale-105"
                  : "bg-[#FF6B6B]/80 text-white hover:bg-[#FF6B6B] shadow-[#FF6B6B]/20"
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
              className={`w-full py-3 rounded-full font-bold text-lg mb-4 transition-all shadow-lg ${
                selectedTeam === "blue"
                  ? "bg-[#4FC3F7] text-white shadow-[#4FC3F7]/40 scale-105"
                  : "bg-[#4FC3F7]/80 text-white hover:bg-[#4FC3F7] shadow-[#4FC3F7]/20"
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
          {isHost && allSlotsFilled && (
            <button
              onClick={handleStartMatch}
              className="px-8 py-4 rounded-full font-bold text-lg bg-[#7ACD54] text-white hover:bg-[#6BBD44] transition-all shadow-lg shadow-[#7ACD54]/30"
            >
              START MATCH
            </button>
          )}
          {!isHost && (
            <button
              onClick={handleJoin}
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
