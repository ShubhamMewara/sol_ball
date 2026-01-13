import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const privy = new PrivyClient({
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
});

// Your game wallet address (embedded wallet with signer)
const GAME_WALLET_ADDRESS =
  process.env.GAME_WALLET_ADDRESS ||
  "EpudBbV12fXBi8jUuLS5wKQfGMRTRYZFoVZV1XnxoY4e";

interface Player {
  userId: string; // User's wallet address or Privy DID
  username?: string;
  team: "A" | "B";
  walletAddress?: string;
}

interface DistributeWinningsRequest {
  matchId: string;
  winningTeam: "A" | "B";
  totalPrizePool: number;
  players: Player[];
  distributionMode?: "equal" | "custom";
  customDistribution?: {
    [userId: string]: number;
  };
}

interface PayoutResult {
  userId: string;
  username?: string;
  walletAddress: string;
  amount: number;
  transactionHash?: string;
  status: "success" | "failed";
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DistributeWinningsRequest = await request.json();
    const {
      matchId,
      winningTeam,
      totalPrizePool,
      players,
      distributionMode = "equal",
      customDistribution,
    } = body;

    // Validation
    if (!matchId || !winningTeam || !totalPrizePool || !players) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (totalPrizePool <= 0) {
      return NextResponse.json(
        { error: "Prize pool must be greater than 0" },
        { status: 400 }
      );
    }

    if (!["A", "B"].includes(winningTeam)) {
      return NextResponse.json(
        { error: "Winning team must be A or B" },
        { status: 400 }
      );
    }

    console.log("🏆 Distributing winnings...");
    console.log("Match ID:", matchId);
    console.log("Winning Team:", winningTeam);
    console.log("Total Prize Pool:", totalPrizePool, "SOL");

    // Step 1: Get the game wallet (embedded wallet with signer)
    const gameUser = await privy
      .users()
      .getByWalletAddress({ address: GAME_WALLET_ADDRESS });

    if (!gameUser) {
      return NextResponse.json(
        { error: "Game wallet user not found" },
        { status: 404 }
      );
    }

    const gameWallet = gameUser.linked_accounts.find(
      (account) =>
        account.type === "wallet" && // Is a wallet
        account.chain_type === "solana" && // Is Solana
        account.wallet_client === "privy" // Has signer
    );

    if (!gameWallet) {
      return NextResponse.json(
        { error: "Game wallet does not have signer configured" },
        { status: 500 }
      );
    }

    const gameWalletId = gameWallet.id;
    if (!gameWalletId) {
      return NextResponse.json(
        { error: "Game Wallet Not Found" },
        { status: 500 }
      );
    }
    console.log("Using game wallet:", GAME_WALLET_ADDRESS);
    console.log("Game wallet ID:", gameWalletId);

    // Step 2: Filter winning players
    const winningPlayers = players.filter((p) => p.team === winningTeam);

    if (winningPlayers.length === 0) {
      return NextResponse.json(
        { error: "No players on winning team" },
        { status: 400 }
      );
    }

    console.log(
      `Winners: ${winningPlayers.length} players from Team ${winningTeam}`
    );

    // Step 3: Calculate distribution
    let distribution: { [userId: string]: number } = {};

    if (distributionMode === "equal") {
      const amountPerWinner = totalPrizePool / winningPlayers.length;
      winningPlayers.forEach((player) => {
        distribution[player.userId] = amountPerWinner;
      });
    } else if (distributionMode === "custom" && customDistribution) {
      distribution = customDistribution;
    } else {
      return NextResponse.json(
        { error: "Invalid distribution mode or missing custom distribution" },
        { status: 400 }
      );
    }

    // Step 4: Setup Solana connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
    );

    const payoutResults: PayoutResult[] = [];
    let successCount = 0;
    let failCount = 0;
    let totalPaidOut = 0;

    // Step 5: Process each winning player
    for (const player of winningPlayers) {
      try {
        const amountToSend = distribution[player.userId];

        if (!amountToSend || amountToSend <= 0) {
          console.log(
            `Skipping ${player.username || player.userId} - no amount to send`
          );
          continue;
        }

        console.log(
          `\n💰 Paying ${player.username || player.userId}: ${amountToSend} SOL`
        );

        // Get player's wallet address
        let recipientAddress = player.walletAddress;

        if (!recipientAddress) {
          try {
            const user = await privy.users().getByWalletAddress({
              address: player.userId,
            });

            if (user) {
              const solanaWallet = user.linked_accounts.find(
                (account) =>
                  account.type === "wallet" && // Is a wallet
                  account.chain_type === "solana" && // Is Solana
                  account.wallet_client === "privy" // Has signer
              );

              if (solanaWallet) {
                recipientAddress = solanaWallet.address;
              }
            }
          } catch (err) {
            // Assume userId is the wallet address
            recipientAddress = player.userId;
          }
        }

        if (!recipientAddress) {
          payoutResults.push({
            userId: player.userId,
            username: player.username,
            walletAddress: "N/A",
            amount: amountToSend,
            status: "failed",
            error: "Could not find wallet address",
          });
          failCount++;
          continue;
        }

        // Convert SOL to lamports
        const lamports = Math.floor(amountToSend * 1_000_000_000);

        // Build transaction
        const fromPubkey = new PublicKey(GAME_WALLET_ADDRESS);
        const toPubkey = new PublicKey(recipientAddress);

        const transferInstruction = SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        });

        const transaction = new Transaction().add(transferInstruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        // Serialize transaction
        const serializedTransaction = transaction
          .serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
          .toString("base64");

        // Sign and send using game's embedded wallet with signer
        const result = await privy
          .wallets()
          .solana()
          .signAndSendTransaction(gameWalletId, {
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            transaction: serializedTransaction,
            sponsor: false, // Winners pay their own gas to receive funds
          });

        console.log(`✅ Payment successful! Hash: ${result.hash}`);

        payoutResults.push({
          userId: player.userId,
          username: player.username,
          walletAddress: recipientAddress,
          amount: amountToSend,
          transactionHash: result.hash,
          status: "success",
        });

        successCount++;
        totalPaidOut += amountToSend;
      } catch (error: any) {
        console.error(
          `❌ Payment failed for ${player.username || player.userId}:`,
          error.message
        );

        payoutResults.push({
          userId: player.userId,
          username: player.username,
          walletAddress: player.walletAddress || "N/A",
          amount: distribution[player.userId] || 0,
          status: "failed",
          error: error.message,
        });
        failCount++;
      }
    }

    const allSuccess = failCount === 0;

    console.log("\n📊 Payout Summary:");
    console.log(`Total Paid Out: ${totalPaidOut} SOL`);
    console.log(`Successful: ${successCount}/${winningPlayers.length}`);
    console.log(`Failed: ${failCount}/${winningPlayers.length}`);

    return NextResponse.json({
      success: allSuccess,
      matchId,
      winningTeam,
      totalPrizePool,
      totalPaidOut,
      successCount,
      failCount,
      payouts: payoutResults,
      message: allSuccess
        ? "All winners paid successfully!"
        : `${failCount} payment(s) failed`,
    });
  } catch (error: any) {
    console.error("❌ Distribution failed:", error);
    return NextResponse.json(
      {
        error: "Failed to distribute winnings",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
