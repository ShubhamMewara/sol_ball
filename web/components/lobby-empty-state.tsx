"use client";

import { Button } from "@/components/ui/button";

interface EmptyLobbyStateProps {
  onCreateLobby?: () => void;
}

export function EmptyLobbyState({ onCreateLobby }: EmptyLobbyStateProps) {
  return (
    <div
      className="flex items-center justify-center h-[60vh]"
      style={{ backgroundColor: "var(--game-bg)" }}
    >
      <div className="flex flex-col items-center gap-8 max-w-md">
        {/* Empty state icon */}
        <div className="relative w-32 h-32">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundColor: "var(--game-accent)",
              opacity: 0.1,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">🏟️</span>
          </div>
        </div>

        {/* Empty state content */}
        <div className="text-center">
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--game-text)" }}
          >
            No Lobby Available
          </h2>
          <p
            className="text-base mb-6 opacity-75"
            style={{ color: "var(--game-text)" }}
          >
            There are no active lobbies right now. Create one to get started and
            invite your friends to play!
          </p>
        </div>

        {/* Action button */}
        {/* <Button
          onClick={onCreateLobby}
          className="w-full py-6 text-lg font-semibold rounded-lg transition-all hover:scale-105"
          style={{
            backgroundColor: "var(--game-accent)",
            color: "var(--game-bg)",
          }}
        >
          Create New Lobby
        </Button> */}

        {/* Secondary info */}
        <div
          className="text-sm text-center opacity-60 pt-4"
          style={{ color: "var(--game-text)" }}
        >
          <p>💡 Tip: You can also join a lobby using an invite code</p>
        </div>
      </div>
    </div>
  );
}
