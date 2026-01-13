// ============================================
// RETRIEVE EXISTING EMBEDDED WALLET API
// File: app/api/wallet/retrieve/route.ts
// Retrieves existing embedded wallet from Privy and updates DB
// ============================================

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

    console.log("Retrieving embedded wallet for user:", privyUserId);

    /**
     * 1. Check if embedded wallet already exists in DB
     */
    const supabase = await createClient();

    const { data: profile, error: fetchError } = await supabase
      .from("profile")
      .select("embedded_wallet_address, embedded_wallet_id")
      .eq("wallet_key", phantomAddress)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = not found
      console.error("Database fetch error:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // If already exists in DB, return it
    if (profile?.embedded_wallet_address && profile?.embedded_wallet_id) {
      console.log(
        "Embedded wallet already exists in DB:",
        profile.embedded_wallet_address
      );
      return NextResponse.json({
        embeddedWalletAddress: profile.embedded_wallet_address,
        embeddedWalletId: profile.embedded_wallet_id,
        alreadyExisted: true,
      });
    }

    /**
     * 2. Fetch user from Privy to get existing embedded wallet
     */
    console.log("Fetching user from Privy...");

    const privyRes = await fetch(
      `${
        process.env.PRIVY_API_URL || "https://auth.privy.io"
      }/api/v1/users/${privyUserId}`,
      {
        method: "GET",
        headers: {
          "privy-app-id": process.env.APP_ID!,
          Authorization: `Basic ${Buffer.from(
            `${process.env.APP_ID}:${process.env.APP_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    if (!privyRes.ok) {
      const err = await privyRes.text();
      console.error("Privy API error:", err);
      return NextResponse.json(
        { error: `Privy error: ${err}` },
        { status: privyRes.status }
      );
    }

    const privyUser = await privyRes.json();
    console.log("Privy user fetched successfully");

    /**
     * 3. Extract existing embedded Solana wallet
     */
    const embeddedSolanaWallet = privyUser.linked_accounts.find(
      (acc: any) =>
        acc.type === "wallet" &&
        acc.chain_type === "solana" &&
        acc.wallet_client_type === "privy" // This means it's an embedded wallet
    );

    if (!embeddedSolanaWallet) {
      console.error("No embedded Solana wallet found for user");
      return NextResponse.json(
        {
          error: "No embedded Solana wallet found for this user",
          hint: "User needs to create an embedded wallet first",
        },
        { status: 404 }
      );
    }

    const embeddedWalletAddress = embeddedSolanaWallet.address;
    const embeddedWalletId = embeddedSolanaWallet.id;

    console.log("Found embedded wallet:", embeddedWalletAddress);
    console.log("Wallet ID:", embeddedWalletId);

    /**
     * 4. Update DB with embedded wallet info
     */

    // First check if profile exists
    if (!profile) {
      // Create profile if it doesn't exist
      const { error: insertError } = await supabase.from("profile").insert({
        wallet_key: phantomAddress,
        embedded_wallet_address: embeddedWalletAddress,
        embedded_wallet_id: embeddedWalletId,
        privy_user_id: privyUserId,
      });

      if (insertError) {
        console.error("Failed to create profile:", insertError);
        throw new Error("Failed to create profile with embedded wallet");
      }

      console.log("✅ Profile created with embedded wallet");
    } else {
      // Update existing profile
      const { error: updateError } = await supabase
        .from("profile")
        .update({
          embedded_wallet_address: embeddedWalletAddress,
          embedded_wallet_id: embeddedWalletId,
          privy_user_id: privyUserId,
        })
        .eq("wallet_key", phantomAddress);

      if (updateError) {
        console.error("Failed to update profile:", updateError);
        throw new Error("Failed to update profile with embedded wallet");
      }

      console.log("✅ Profile updated with embedded wallet");
    }

    return NextResponse.json({
      embeddedWalletAddress,
      embeddedWalletId,
      alreadyExisted: false,
      message: "Embedded wallet retrieved and stored successfully",
    });
  } catch (err: any) {
    console.error("Error retrieving embedded wallet:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

// ============================================
// ALTERNATIVE: RETRIEVE OR CREATE
// (If you want to create only if it doesn't exist)
// ============================================

export async function POST_WITH_CREATE_FALLBACK(req: Request) {
  try {
    const body = await req.json();
    const { privyUserId, phantomAddress } = body;

    if (!privyUserId || !phantomAddress) {
      return NextResponse.json(
        { error: "Missing privyUserId or phantomAddress" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Check DB first
    const { data: profile } = await supabase
      .from("profile")
      .select("embedded_wallet_address, embedded_wallet_id")
      .eq("wallet_key", phantomAddress)
      .single();

    if (profile?.embedded_wallet_address && profile?.embedded_wallet_id) {
      return NextResponse.json({
        embeddedWalletAddress: profile.embedded_wallet_address,
        embeddedWalletId: profile.embedded_wallet_id,
        alreadyExisted: true,
      });
    }

    // 2. Fetch from Privy
    const privyRes = await fetch(
      `https://auth.privy.io/api/v1/users/${privyUserId}`,
      {
        method: "GET",
        headers: {
          "privy-app-id": process.env.APP_ID!,
          Authorization: `Basic ${Buffer.from(
            `${process.env.APP_ID}:${process.env.APP_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const privyUser = await privyRes.json();

    // 3. Find existing embedded wallet
    let embeddedSolanaWallet = privyUser.linked_accounts.find(
      (acc: any) =>
        acc.type === "wallet" &&
        acc.chain_type === "solana" &&
        acc.wallet_client_type === "privy"
    );

    // 4. If no embedded wallet exists, create one
    if (!embeddedSolanaWallet) {
      console.log("No embedded wallet found, creating one...");

      const createRes = await fetch(
        `https://auth.privy.io/api/v1/users/${privyUserId}/wallets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "privy-app-id": process.env.APP_ID!,
            Authorization: `Basic ${Buffer.from(
              `${process.env.APP_ID}:${process.env.APP_SECRET}`
            ).toString("base64")}`,
          },
          body: JSON.stringify({
            wallets: [{ chain_type: "solana" }],
          }),
        }
      );

      const updatedUser = await createRes.json();
      embeddedSolanaWallet = updatedUser.linked_accounts.find(
        (acc: any) =>
          acc.type === "wallet" &&
          acc.chain_type === "solana" &&
          acc.wallet_client_type === "privy"
      );

      if (!embeddedSolanaWallet) {
        throw new Error("Failed to create embedded wallet");
      }

      console.log("✅ Embedded wallet created:", embeddedSolanaWallet.address);
    }

    const embeddedWalletAddress = embeddedSolanaWallet.address;
    const embeddedWalletId = embeddedSolanaWallet.id;

    // 5. Update DB
    const { error: updateError } = await supabase.from("profile").upsert({
      wallet_key: phantomAddress,
      embedded_wallet_address: embeddedWalletAddress,
      embedded_wallet_id: embeddedWalletId,
      privy_user_id: privyUserId,
    });

    if (updateError) {
      throw new Error("Failed to store embedded wallet");
    }

    return NextResponse.json({
      embeddedWalletAddress,
      embeddedWalletId,
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

// ============================================
// CLIENT-SIDE USAGE
// ============================================

/*
// Call this after user logs in with Privy
async function retrieveAndStoreEmbeddedWallet(
  privyUserId: string,
  phantomAddress: string
) {
  try {
    const response = await fetch('/api/wallet/retrieve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        privyUserId,
        phantomAddress,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    console.log('Embedded wallet:', data.embeddedWalletAddress);
    console.log('Wallet ID:', data.embeddedWalletId);
    console.log('Already existed:', data.alreadyExisted);

    return data;
  } catch (error) {
    console.error('Failed to retrieve embedded wallet:', error);
    throw error;
  }
}

// Usage in your component
import { usePrivy } from '@privy-io/react-auth';

function MyComponent() {
  const { user, authenticated } = usePrivy();

  useEffect(() => {
    if (authenticated && user) {
      const phantomWallet = user.linked_accounts.find(
        (acc) => acc.type === 'wallet' && acc.walletClientType === 'phantom'
      );

      if (phantomWallet) {
        retrieveAndStoreEmbeddedWallet(
          user.id,
          phantomWallet.address
        );
      }
    }
  }, [authenticated, user]);
}
*/

// ============================================
// DATABASE SCHEMA (Supabase)
// ============================================

/*
CREATE TABLE profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_key TEXT UNIQUE NOT NULL,           -- Phantom wallet address
  embedded_wallet_address TEXT,              -- Privy embedded wallet address
  embedded_wallet_id TEXT,                   -- Privy wallet ID for signing
  privy_user_id TEXT,                        -- Privy user DID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_profile_wallet_key ON profile(wallet_key);
CREATE INDEX idx_profile_embedded_wallet ON profile(embedded_wallet_address);
*/

// ============================================
// KEY DIFFERENCES FROM YOUR ORIGINAL CODE
// ============================================

/*
❌ YOUR CODE (Creates new wallet):
const privyRes = await fetch(`/v1/users/${privyUserId}/wallets`, {
  method: "POST",  // Creates new wallet
  body: JSON.stringify({ wallets: [{ chain_type: "solana" }] }),
});

✅ FIXED CODE (Retrieves existing wallet):
const privyRes = await fetch(`/api/v1/users/${privyUserId}`, {
  method: "GET",  // Gets existing user data
});

const embeddedWallet = privyUser.linked_accounts.find(
  (acc) => acc.wallet_client_type === "privy" && acc.chain_type === "solana"
);

Key Changes:
1. Changed POST to GET - retrieves instead of creates
2. Changed endpoint from /wallets to /users/{id}
3. Searches linked_accounts for existing embedded wallet
4. Returns error if no embedded wallet exists
5. Only updates DB, doesn't create new wallet
*/
