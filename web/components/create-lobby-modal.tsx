"use client";
import { useState } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { createLobby } from "@/lib/lobbies";
import LobbyWaitingModal from "@/components/lobby-room";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CreateLobbyModal() {
  const router = useRouter();
  const { authenticated, user, login } = usePrivy();
  const [prizePot, setPrizePot] = useState(0.001);
  const [players, setPlayers] = useState(3);
  const [minutes, setMinutes] = useState(3);
  const [open, setOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);

  const handlePrizePotChange = (amount: number) => {
    const next = Math.max(0.001, +(prizePot + amount).toFixed(3));
    setPrizePot(next);
  };

  const handlePlayersChange = (amount: number) => {
    setPlayers(Math.max(2, players + amount));
  };

  const handleMinutesChange = (amount: number) => {
    setMinutes(Math.max(1, minutes + amount));
  };

  const createLobbyHandler = async () => {
    if (!authenticated) {
      login({ loginMethods: ["wallet"] });
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
        match_minutes: minutes,
        status: "open",
      });
      toast("Lobby Created Successfully!");
      setOpen(false);
      setRoomId(id);
      setWaitingOpen(true);
    } catch (e: any) {
      console.error(e);
      toast("Failed to create lobby");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="bg-[#7ACD54] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#6ab844] transition-all shadow-[4px_4px_0_0_#65ab44]">
        CREATE A LOBBY
      </DialogTrigger>
      <DialogContent className="bg-[#1a1b24] rounded-lg p-8 w-full max-w-md border-2 border-[#2a2b34]">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-2xl text-center mb-2">
            CREATE A LOBBY
          </DialogTitle>
        </DialogHeader>

        {/* Prize Pot Section */}
        <div className="mb-4">
          <h3 className="text-[#DDD9C7] font-bold text-sm mb-2">Prize Pot</h3>
          <div className="text-[#7ACD54] font-bold text-3xl text-center">
            {prizePot.toFixed(3)} SOL
          </div>
        </div>

        {/* Prize Pot Controls */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setPrizePot(0.001)}
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
        <div className="mb-4">
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
              -
            </button>
          </div>
        </div>

        {/* Minutes Section */}
        <div className="mb-6">
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
              -
            </button>
          </div>
        </div>

        <DialogFooter>
          <button
            className="w-full bg-[#7ACD54] text-[#14151C] py-4 rounded-full font-bold text-lg hover:bg-[#6ab844] transition-all mb-4"
            onClick={createLobbyHandler}
          >
            CREATE LOBBY
          </button>

          <button
            onClick={() => setOpen(false)}
            className="w-full text-[#DDD9C7] py-2 font-bold hover:text-white transition-all"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      {waitingOpen && roomId && (
        <LobbyWaitingModal
          onClose={() => setWaitingOpen(false)}
          prizePot={+prizePot.toFixed(3)}
          maxPlayersPerTeam={players}
          matchDuration={`${minutes} min`}
          isHost={true}
          existingPlayers={{ redTeam: [], blueTeam: [] }}
          hostName={(user?.wallet?.address || user?.id || "user").slice(0, 6)}
          roomId={roomId}
        />
      )}
    </>
  );
}
