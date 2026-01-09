import { createClient } from "@/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { privyUserId, phantomAddress } = body;

    if (!privyUserId || !phantomAddress) {
      return NextResponse.json(
        { error: "Missing privyUserId or phantomAddress" },
        { status: 400 }
      );
    }

    /**
     * 1. Check if embedded wallet already exists in DB
     */
    const supabase = await createClient();

    const { data: profile, error: fetchError } = await supabase
      .from("profile")
      .select("embedded_wallet_address")
      .eq("wallet_key", phantomAddress)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile?.embedded_wallet_address) {
      return NextResponse.json({
        embeddedWalletAddress: profile.embedded_wallet_address,
        alreadyExisted: true,
      });
    }

    /**
     * 2. Call Privy to create embedded Solana wallet
     */
    const privyRes = await fetch(
      `${process.env.PRIVY_API_URL}/v1/users/${privyUserId}/wallets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-app-id": process.env.APP_ID!,
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.APP_ID}:${process.env.APP_SECRET}`
            ).toString("base64"),
        },
        body: JSON.stringify({
          wallets: [{ chain_type: "solana" }],
        }),
      }
    );

    if (!privyRes.ok) {
      const err = await privyRes.text();
      throw new Error(`Privy error: ${err}`);
    }

    const privyUser = await privyRes.json();

    /**
     * 3. Extract embedded Solana wallet address
     */
    const embeddedSolanaWallet = privyUser.linked_accounts.find(
      (acc: any) =>
        acc.type === "wallet" &&
        acc.chain_type === "solana" &&
        acc.wallet_client_type === "privy"
    );

    if (!embeddedSolanaWallet?.address) {
      throw new Error("Embedded Solana wallet not found in Privy response");
    }

    const embeddedWalletAddress = embeddedSolanaWallet.address;
    const embeddedWalletId = embeddedSolanaWallet.id;
    /**
     * 4. Store embedded wallet in DB
     */
    const { error: updateError } = await supabase
      .from("profile")
      .update({
        embedded_wallet_address: embeddedWalletAddress,
        embedded_wallet_id: embeddedWalletId,
      })
      .eq("wallet_key", phantomAddress);

    if (updateError) {
      throw new Error("Failed to store embedded wallet");
    }

    return NextResponse.json({
      embeddedWalletAddress: embeddedSolanaWallet.address,
      embedded_wallet_id: embeddedWalletId,
      alreadyExisted: false,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
