"use client";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { createLobby } from "@/lib/lobbies";

interface CreateLobbyModalProps {
  onClose: () => Dispatch<SetStateAction<boolean>>;
}

export default function CreateLobbyModal({ onClose }: any) {
  const router = useRouter();
  const { authenticated, user, login } = usePrivy();
  const [prizePot, setPrizePot] = useState(0.001);
  const [players, setPlayers] = useState(3);
  const [minutes, setMinutes] = useState(3);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePrizePotChange = (amount: number) => {
    setPrizePot(Math.max(0, prizePot + amount));
  };

  const handlePlayersChange = (amount: number) => {
    setPlayers(Math.max(2, players + amount));
  };

  const handleMinutesChange = (amount: number) => {
    setMinutes(Math.max(1, minutes + amount));
  };

  const createLobbyHandler = async () => {
    if (!authenticated) {
      await login();
      return;
    }
    const host = user?.wallet?.address || user?.id || "user";
    const id = slugify(`${host}-${Date.now()}`);
    try {
      await createLobby({
        room_id: id,
        host,
        stake: prizePot,
        players,
        status: "open",
      });
      toast("Lobby Created Successfully!");
      onClose();
      router.push(`/game/${encodeURIComponent(id)}`);
    } catch (e: any) {
      console.error(e);
      toast("Failed to create lobby");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1b24] rounded-lg p-8 w-full max-w-md border-2 border-[#2a2b34]">
        {/* Title */}
        <h2 className="text-white font-bold text-2xl text-center mb-8">
          CREATE A LOBBY
        </h2>

        {/* Prize Pot Section */}
        <div className="mb-8">
          <h3 className="text-[#DDD9C7] font-bold text-sm mb-2">Prize Pot</h3>
          <div className="text-[#7ACD54] font-bold text-3xl text-center">
            {prizePot.toFixed(3)} SOL
          </div>
        </div>

        {/* Prize Pot Controls */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => handlePrizePotChange(0.001)}
            className="flex-1 border-2 border-[#DDD9C7] text-[#DDD9C7] py-2 rounded-lg font-bold hover:bg-[#2a2b34] transition-all"
          >
            0.001
          </button>
          <button
            onClick={() => handlePrizePotChange(0.001)}
            className="flex-1 border-2 border-[#DDD9C7] text-[#DDD9C7] py-2 rounded-lg font-bold hover:bg-[#2a2b34] transition-all"
          >
            +0.001
          </button>
          <button
            onClick={() => handlePrizePotChange(0.01)}
            className="flex-1 border-2 border-[#DDD9C7] text-[#DDD9C7] py-2 rounded-lg font-bold hover:bg-[#2a2b34] transition-all"
          >
            +0.01
          </button>
          <button
            onClick={() => handlePrizePotChange(0.1)}
            className="flex-1 border-2 border-[#DDD9C7] text-[#DDD9C7] py-2 rounded-lg font-bold hover:bg-[#2a2b34] transition-all"
          >
            +0.1
          </button>
          <button
            onClick={() => handlePrizePotChange(-0.001)}
            className="w-12 bg-[#FF4444] text-white rounded-lg font-bold hover:bg-[#FF2222] transition-all"
          >
            −
          </button>
        </div>

        {/* Players Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 border-2 border-[#DDD9C7] text-[#DDD9C7] py-3 rounded-lg font-bold text-center">
              {players} Players
            </div>
            <button
              onClick={() => handlePlayersChange(1)}
              className="w-12 h-12 bg-[#7ACD54] text-[#14151C] rounded-lg font-bold hover:bg-[#6ab844] transition-all"
            >
              +
            </button>
            <button
              onClick={() => handlePlayersChange(-1)}
              className="w-12 h-12 bg-[#FF4444] text-white rounded-lg font-bold hover:bg-[#FF2222] transition-all"
            >
              −
            </button>
          </div>
        </div>

        {/* Minutes Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 border-2 border-[#DDD9C7] text-[#DDD9C7] py-3 rounded-lg font-bold text-center">
              {minutes} Minutes
            </div>
            <button
              onClick={() => handleMinutesChange(1)}
              className="w-12 h-12 bg-[#7ACD54] text-[#14151C] rounded-lg font-bold hover:bg-[#6ab844] transition-all"
            >
              +
            </button>
            <button
              onClick={() => handleMinutesChange(-1)}
              className="w-12 h-12 bg-[#FF4444] text-white rounded-lg font-bold hover:bg-[#FF2222] transition-all"
            >
              −
            </button>
          </div>
        </div>

        {/* Create Lobby Button */}
        <button
          className="w-full bg-[#7ACD54] text-[#14151C] py-4 rounded-full font-bold text-lg hover:bg-[#6ab844] transition-all mb-4"
          onClick={createLobbyHandler}
        >
          CREATE LOBBY
        </button>

        {/* Close Button */}
        <button
          onClick={() => onClose()}
          className="w-full text-[#DDD9C7] py-2 font-bold hover:text-white transition-all"
        >
          Cancel
        </button>
      </div>
      {/* Lobby modal now navigates directly to /game/[roomId] after creation */}
    </div>
  );
}
