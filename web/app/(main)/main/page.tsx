"use client";
import CreateLobbyModal from "@/components/create-lobby-modal";
import GameCard from "@/components/game-card";
import { EmptyLobbyState } from "@/components/lobby-empty-state";
import { getLobbies } from "@/lib/lobbies";
import { supabase } from "@/supabase/client";
import { Tables } from "@/supabase/database.types";
import { useEffect, useState } from "react";

const Page = () => {
  const [lobbies, setLobbies] = useState<Tables<"lobbies">[]>([]);

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
    const channel = supabase
      .channel("lobbies-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lobbies" },
        (payload) => {
          const row = payload.new as Tables<"lobbies">;
          setLobbies((prev) => {
            if (prev.find((l) => l.room_id === row.room_id)) return prev;
            return [row, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lobbies" },
        (payload) => {
          const row = payload.new as Tables<"lobbies">;
          setLobbies((prev) =>
            prev.map((l) => (l.room_id === row.room_id ? { ...l, ...row } : l))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "lobbies" },
        (payload) => {
          const row = payload.old as { room_id: string };
          setLobbies((prev) => prev.filter((l) => l.room_id !== row.room_id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, []);

  return (
    <div className="px-6 pb-8">
      <div className="relative flex flex-col gap-6 lg:flex-row">
        <main className="flex-1">
          <div className="flex flex-wrap justify-end items-center gap-4 mb-2">
            <CreateLobbyModal />
          </div>
          {lobbies.length > 0 ? (
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
                  matchMinutes={l.match_minutes}
                />
              ))}
            </div>
          ) : (
            <div>
              <EmptyLobbyState />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Page;
