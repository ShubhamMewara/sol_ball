"use client";
import ChatSidebar from "@/components/chat-sidebar";
import CreateLobbyModal from "@/components/create-lobby-modal";
import GameCard from "@/components/game-card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getLobbies, Lobby } from "@/lib/lobbies";
import { usePrivy } from "@privy-io/react-auth";
import { supabase } from "@/supabase/client";
import { useAuth } from "@/store/auth";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const Page = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const { authenticated, login } = usePrivy();
  const { balance } = useAuth();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const rows = await getLobbies();
        if (mounted) setLobbies(rows);
      } catch (e) {
        console.error(e);
      }
    };
    // initial
    load();

    // realtime subscription (apply payload instead of refetching)
    const channel = (supabase as any)
      .channel("lobbies-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lobbies" },
        (payload: any) => {
          const row = payload.new as Lobby;
          setLobbies((prev) => {
            if (prev.find((l) => l.room_id === row.room_id)) return prev;
            return [row, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lobbies" },
        (payload: any) => {
          const row = payload.new as Lobby;
          setLobbies((prev) =>
            prev.map((l) => (l.room_id === row.room_id ? { ...l, ...row } : l))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "lobbies" },
        (payload: any) => {
          const row = payload.old as { room_id: string };
          setLobbies((prev) => prev.filter((l) => l.room_id !== row.room_id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        (supabase as any).removeChannel(channel);
      } catch {}
    };
  }, []);
  return (
    <>
      <div className="px-6 pb-8 max-w-[1800px] mx-auto">
        <div className="relative flex flex-col gap-6 lg:flex-row">
          <ChatSidebar />
          <main className="flex-1">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <Button
                onClick={() => (authenticated ? setIsModalOpen(true) : login())}
                className="bg-[#7ACD54] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#6ab844] transition-all shadow-[4px_4px_0_0_#65ab44]"
              >
                CREATE A LOBBY
              </Button>
              <Button variant={"outline"}>
                {" "}
                {balance ? (balance / LAMPORTS_PER_SOL).toFixed(4) : "0"} SOL
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {lobbies.map((l) => (
                <GameCard
                  key={l.room_id}
                  stake={l.stake}
                  players={l.players}
                  blueTeam={[]}
                  redTeam={[]}
                  actionType={"join"}
                  host={l.host}
                  roomId={l.room_id}
                />
              ))}
            </div>
          </main>
        </div>
      </div>
      {isModalOpen && (
        <CreateLobbyModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
};

export default Page;
