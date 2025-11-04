"use client";

import { useState } from "react";
import LobbyWaitingModal from "./lobby-room";
import { slugify } from "@/lib/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface GameCardProps {
  stake: number;
  players: number;
  blueTeam: string[];
  redTeam: string[];
  actionType: "spectate" | "join";
  host: string;
  roomId?: string;
  matchMinutes?: number | null;
}

export default function GameCard({
  stake,
  players,
  blueTeam,
  redTeam,
  actionType,
  host,
  roomId,
  matchMinutes,
}: GameCardProps) {
  const [isLobbyModalOpen, setisLobbyModalOpen] = useState(false);
  const derivedRoom = roomId ?? slugify(host);
  const { user } = usePrivy();
  const myId = user?.wallet?.address || user?.id || "";
  const isHost = myId && host && myId === host;
  const durationLabel = matchMinutes ? `${matchMinutes}m` : "";
  const router = useRouter();

  return (
    <div className="border-b-4 border-[#7ACD54] rounded-lg bg-[#1a1b24] p-6 flex flex-col justify-between min-h-64 shadow-lg shadow-[#7ACD54]/10">
      {/* Header */}
      <div className="mb-6">
        {/* Players and Stake */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-white font-bold text-lg">
            {players} VS {players}
          </span>
          <div className="text-center flex-1">
            <span
              className="text-white font-bold text-2xl drop-shadow-lg"
              style={{ textShadow: "0 4px 12px rgba(122, 205, 84, 0.3)" }}
            >
              {(stake / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex justify-between items-center gap-4">
          {/* Blue Team */}
          <div className="flex-1 text-center">
            <h4 className="text-[#00BFFF] font-bold text-lg mb-2">BLUE</h4>
            <div className="text-[#DDD9C7] text-sm space-y-1">
              {blueTeam.map((player, idx) => (
                <div key={idx}>{player}</div>
              ))}
            </div>
          </div>

          {/* VS */}
          <div className="text-white font-bold text-lg">VS</div>

          {/* Red Team */}
          <div className="flex-1 text-center">
            <h4 className="text-[#FF1493] font-bold text-lg mb-2">RED</h4>
            <div className="text-[#DDD9C7] text-sm space-y-1">
              {redTeam.map((player, idx) => (
                <div key={idx}>{player}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => {
          if (actionType === "join") {
            setisLobbyModalOpen(true);
          } else {
            // Spectate goes straight to the room without selecting a team
            router.push(`/game/${encodeURIComponent(derivedRoom)}`);
          }
        }}
        className={`w-full py-3 rounded-full font-bold text-lg transition-all shadow-[4px_4px_0_0_#65ab44] ${
          actionType === "spectate"
            ? "bg-[#FFD700] text-white hover:bg-[#FFC700] shadow-[#FFD700]/30"
            : "bg-[#7ACD54] text-white hover:bg-[#6ab844] shadow-[#7ACD54]/30"
        }`}
      >
        {actionType === "spectate" ? "SPECTATE" : "JOIN"}
      </button>
      {isLobbyModalOpen && (
        <LobbyWaitingModal
          hostName={host}
          isHost={!!isHost}
          matchDuration={durationLabel}
          maxPlayersPerTeam={players}
          onClose={() => {
            setisLobbyModalOpen(false);
          }}
          prizePot={stake}
          roomId={derivedRoom}
          existingPlayers={{
            redTeam: redTeam.map((player) => ({
              name: player,
              isCurrentUser: myId === player,
            })),
            blueTeam: blueTeam.map((player) => ({
              name: player,
              isCurrentUser: myId === player,
            })),
          }}
        />
      )}
    </div>
  );
}
