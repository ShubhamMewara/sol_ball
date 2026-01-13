"use client";

import { useState } from "react";

import { useHeadlessDelegatedActions } from "@privy-io/react-auth";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const x = useHeadlessDelegatedActions();

  const start2v2Match = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/start_match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: "match-" + Date.now(),
          entryFee: 0.1, // SOL per player
          players: [
            {
              userId: "3b5W3hKqdAyWY8XaW5wwZyf5XVCgPfNy4U9fHH6ikDJH",
              username: "nerddd",
              team: "A",
            },
            {
              userId: "49tYtcCf7WXZsCgQGair7ekKzR3pjuAvrgwz8eSKixUC",
              username: "shubham",
              team: "B",
            },
          ],
          matchType: "2v2",
          metadata: {
            roomName: "Haxball Arena 1",
            gameMode: "Classic",
          },
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        console.log("✅ Match ready:", data.matchId);
        // startHaxballGame(data.matchId);
      } else {
        console.error("❌ Match failed", data);
      }
    } catch (err: any) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-6">
      <h1 className="text-3xl font-bold">Sol Ball – 2v2 Match</h1>

      <button
        onClick={start2v2Match}
        disabled={loading}
        className="px-6 py-3 rounded-lg bg-green-500 text-black font-semibold disabled:opacity-50"
      >
        {loading ? "Starting Match..." : "Start 2v2 Match"}
      </button>

      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <div className="mt-4 p-4 rounded-lg bg-gray-900 w-full max-w-xl">
          <pre className="text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
