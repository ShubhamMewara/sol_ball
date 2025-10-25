"use client";

interface GameCardProps {
  stake: string;
  players: string;
  blueTeam: string[];
  redTeam: string[];
  actionType: "spectate" | "join";
}

export default function GameCard({
  stake,
  players,
  blueTeam,
  redTeam,
  actionType,
}: GameCardProps) {
  return (
    <div className="border-b-4 border-[#7ACD54] rounded-lg bg-[#1a1b24] p-6 flex flex-col justify-between min-h-64 shadow-lg shadow-[#7ACD54]/10">
      {/* Header */}
      <div className="mb-6">
        {/* Players and Stake */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-white font-bold text-lg">{players}</span>
          <div className="text-center flex-1">
            <span
              className="text-white font-bold text-2xl drop-shadow-lg"
              style={{ textShadow: "0 4px 12px rgba(122, 205, 84, 0.3)" }}
            >
              {stake}
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
        className={`w-full py-3 rounded-full font-bold text-lg transition-all shadow-[4px_4px_0_0_#65ab44] ${
          actionType === "spectate"
            ? "bg-[#FFD700] text-white hover:bg-[#FFC700] shadow-[#FFD700]/30"
            : "bg-[#7ACD54] text-white hover:bg-[#6ab844] shadow-[#7ACD54]/30"
        }`}
      >
        {actionType === "spectate" ? "SPECTATE" : "JOIN"}
      </button>
    </div>
  );
}
