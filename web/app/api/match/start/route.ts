import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/supabase/admin";

export const runtime = "nodejs";

function toLamports(sol: number): number {
  // Avoid NaN, round to nearest lamport
  return Math.max(0, Math.round(sol * 1_000_000_000));
}

export async function POST(req: NextRequest) {
  console.log("Starting match...");
  try {
    const { roomId } = await req.json();
    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { error: "roomId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: lobby, error: lobbyErr } = await supabase
      .from("lobbies")
      .select("id, stake, players")
      .eq("room_id", roomId)
      .single();

    if (lobbyErr || !lobby) {
      console.error("/api/match/start lobby error", { roomId, lobbyErr });
      return NextResponse.json(
        { error: lobbyErr?.message || "Lobby not found" },
        { status: 404 }
      );
    }

    const { data: members, error: memErr } = await supabase
      .from("lobby_members")
      .select("user_id")
      .eq("lobby_room_id", lobby.id);

    if (memErr) {
      console.error("/api/match/start members error", { roomId, memErr });
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const wallets = (members || []).map((m) => m.user_id);
    if (!wallets.length) {
      console.error("/api/match/start no members", { roomId });
      return NextResponse.json(
        { error: "No members in lobby" },
        { status: 400 }
      );
    }

    const stakeLamports = toLamports(lobby.stake);

    // Load balances
    const { data: profiles, error: profErr } = await supabase
      .from("profile")
      .select("wallet_key, balance_lamports")
      .in("wallet_key", wallets);

    if (profErr) {
      console.error("/api/match/start profile load error", { roomId, profErr });
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    // Deduct stake from each user (sequential for now)
    // Create a quick lookup by wallet
    const byWallet = new Map(
      (profiles || []).map((p: any) => [p.wallet_key, p])
    );
    for (const wallet of wallets) {
      const p = byWallet.get(wallet);
      const current = Number(p?.balance_lamports || 0);
      const next = current - stakeLamports;
      const { error: upErr } = await supabase
        .from("profile")
        .update({ balance_lamports: next })
        .eq("wallet_key", wallet)
        .select("wallet_key")
        .single();
      if (upErr) {
        console.error("/api/match/start update error", { wallet, upErr });
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      debitedLamports: stakeLamports,
      users: wallets.length,
    });
  } catch (e: any) {
    console.error("Error in /api/match/start:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
