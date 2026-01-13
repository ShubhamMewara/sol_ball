import { NextRequest, NextResponse } from "next/server";
import { PrivyClient, AuthorizationContext } from "@privy-io/node";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

// Initialize Privy client
const privy = new PrivyClient({
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
});

// Type definitions
interface Player {
  userId: string; // Privy user DID
  username?: string; // Optional username for display
  team: "A" | "B"; // Which team the player is on
}
interface StartMatchRequest {
  matchId: string; // Unique match identifier
  entryFee: number; // Entry fee per player in SOL
  players: Player[]; // Array of all players (2v2, 3v3, etc.)
  matchType?: string; // Optional: '2v2', '3v3', etc.
  metadata?: {
    // Optional match metadata
    roomName?: string;
    gameMode?: string;
    [key: string]: any;
  };
}
interface PlayerTransaction {
  userId: string;
  username?: string;
  team: "A" | "B";
  walletAddress: string;
  transactionHash: string;
  amount: number;
  status: "success" | "failed";
  error?: string;
}
interface MatchResult {
  matchId: string;
  totalCollected: number;
  successfulTransactions: number;
  failedTransactions: number;
  transactions: PlayerTransaction[];
  allPlayersDebitedSuccessfully: boolean;
}

// Game wallet address (your wallet where all entry fees go)
const GAME_WALLET_ADDRESS =
  process.env.GAME_WALLET_ADDRESS ||
  "BNJr8zEXhNt2qY1RvqBcpk5MECYcJQ1MiqbKchnDrsnT";

export async function POST(request: NextRequest) {
  try {
    // Parse request body - MUST include user JWTs
    const body = await request.json();
    const { matchId, entryFee, players, matchType } = body;

    // Validation
    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    if (!entryFee || entryFee <= 0) {
      return NextResponse.json(
        { error: "Invalid entry fee. Must be greater than 0" },
        { status: 400 }
      );
    }

    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "Players array is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate minimum players (at least 2)
    if (players.length < 2) {
      return NextResponse.json(
        { error: "Match requires at least 2 players" },
        { status: 400 }
      );
    }

    // Validate even number of players for team games
    if (players.length % 2 !== 0) {
      return NextResponse.json(
        { error: "Match requires an even number of players (2v2, 3v3, etc.)" },
        { status: 400 }
      );
    }

    if (!GAME_WALLET_ADDRESS) {
      console.error("GAME_WALLET_ADDRESS not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("⚽ Starting Haxball match...");
    console.log("Match ID:", matchId);
    console.log(
      "Match Type:",
      matchType || `${players.length / 2}v${players.length / 2}`
    );
    console.log("Entry Fee:", entryFee, "SOL per player");
    console.log("Total Players:", players.length);
    console.log("Expected Total Collection:", entryFee * players.length, "SOL");

    // Result tracking
    const transactions: PlayerTransaction[] = [];
    let totalCollected = 0;
    let successfulTransactions = 0;
    let failedTransactions = 0;

    // Process each player's payment
    for (const player of players) {
      try {
        console.log(
          `\n💰 Processing payment for player: ${
            player.username || player.userId
          }`
        );
        console.log(`Team: ${player.team}`);

        // Get user and their wallets
        const user = await privy
          .users()
          .getByWalletAddress({ address: player.userId });

        if (!user) {
          console.error(`User not found: ${player.userId}`);
          transactions.push({
            userId: player.userId,
            username: player.username,
            team: player.team,
            walletAddress: "N/A",
            transactionHash: "",
            amount: 0,
            status: "failed",
            error: "User not found",
          });
          failedTransactions++;
          continue;
        }

        // Find Solana embedded wallet with signer
        const solanaWallet = user.linked_accounts.find(
          (account) =>
            account.type === "wallet" && // Is a wallet
            account.chain_type === "solana" && // Is Solana
            account.wallet_client === "privy" // Has signer
        );

        if (!solanaWallet) {
          console.error(
            `No wallet with signer found for user: ${player.userId}`
          );
          transactions.push({
            userId: player.userId,
            username: player.username,
            team: player.team,
            walletAddress: "N/A",
            transactionHash: "",
            amount: 0,
            status: "failed",
            error: "No embedded wallet with signer found",
          });
          failedTransactions++;
          continue;
        }

        const walletId = solanaWallet.id; // Use the actual wallet ID from the account

        console.log(`Wallet found: ${solanaWallet.address}`);

        // Convert SOL to lamports
        const lamports = Math.floor(entryFee * 1_000_000_000);
        const connection = new Connection(clusterApiUrl("devnet"));
        const fromPubkey = new PublicKey(solanaWallet.address);
        const toPubkey = new PublicKey(GAME_WALLET_ADDRESS);

        // Execute transaction from player's wallet to game wallet
        const transferInstruction = SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        });

        const transaction = new Transaction().add(transferInstruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey; // Fee payer should be the sender

        // Serialize to base64
        const serializedTransaction = transaction
          .serialize({ requireAllSignatures: false })
          .toString("base64");

        // ✅ CORRECT: Use user JWT for authorization
        const PRIVY_AUTHORIZATION_PRIVATE_KEY =
          process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY!;
        const authorizationContext: AuthorizationContext = {
          authorization_private_keys: [PRIVY_AUTHORIZATION_PRIVATE_KEY],
        };
        // Sign and send transaction
        const result = await privy
          .wallets()
          .solana()
          .signAndSendTransaction(walletId!, {
            caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
            authorization_context: authorizationContext,
            transaction: serializedTransaction,
          });
        console.log(`✅ Payment successful! Hash: ${result.hash}`);

        transactions.push({
          userId: player.userId,
          username: player.username,
          team: player.team,
          walletAddress: solanaWallet.address,
          transactionHash: result.hash,
          amount: entryFee,
          status: "success",
        });

        totalCollected += entryFee;
        successfulTransactions++;
      } catch (error: any) {
        console.error(`❌ Payment failed for ${player.userId}:`, error.message);

        transactions.push({
          userId: player.userId,
          username: player.username,
          team: player.team,
          walletAddress: "N/A",
          transactionHash: "",
          amount: 0,
          status: "failed",
          error: error.message || "Transaction failed",
        });

        failedTransactions++;
      }
    }

    // Determine if all payments were successful
    const allPlayersDebitedSuccessfully = failedTransactions === 0;

    console.log("\n📊 Match Payment Summary:");
    console.log(`Total Collected: ${totalCollected} SOL`);
    console.log(`Successful: ${successfulTransactions}/${players.length}`);
    console.log(`Failed: ${failedTransactions}/${players.length}`);
    console.log(
      `Match can start: ${allPlayersDebitedSuccessfully ? "YES ✅" : "NO ❌"}`
    );

    const result: MatchResult = {
      matchId,
      totalCollected,
      successfulTransactions,
      failedTransactions,
      transactions,
      allPlayersDebitedSuccessfully,
    };

    // If not all players paid successfully, return error
    if (!allPlayersDebitedSuccessfully) {
      return NextResponse.json(
        {
          error: "Not all players could be debited",
          message: `${failedTransactions} player(s) failed to pay entry fee`,
          ...result,
        },
        { status: 402 } // Payment Required
      );
    }

    // Success! All players paid
    return NextResponse.json({
      success: true,
      message: "All players debited successfully. Match can start!",
      ...result,
    });
  } catch (error: any) {
    console.error("❌ Match start failed:", error);
    return NextResponse.json(
      {
        error: "Failed to start match",
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET ENDPOINT - Check Match Payment Status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId parameter is required" },
        { status: 400 }
      );
    }

    // TODO: Fetch match payment status from your database
    // This is a placeholder - implement based on your database schema

    return NextResponse.json({
      matchId,
      message: "Match status endpoint - implement with your database",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
