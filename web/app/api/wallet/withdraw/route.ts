import { NextRequest, NextResponse } from "next/server";

// Type definitions for better type safety
interface SignaturePayload {
  version: 1;
  url: string;
  method: "POST";
  headers: {
    "privy-app-id": string;
  };
  body: {
    method: "signAndSendTransaction";
    caip2: string;
    params: {
      transaction: string;
      encoding: "base64";
    };
  };
}

interface CashOutRequest {
  signaturePayload: SignaturePayload;
  authorizationSignature: string;
  walletId: string;
}

interface PrivyRpcResponse {
  method: string;
  data: {
    hash: string;
    caip2: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CashOutRequest = await request.json();
    const { signaturePayload, authorizationSignature, walletId } = body;

    // Validation
    if (!signaturePayload || !authorizationSignature || !walletId) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details:
            "signaturePayload, authorizationSignature, and walletId are required",
        },
        { status: 400 }
      );
    }

    // Validate environment variables
    const appId = process.env.APP_ID;
    const appSecret = process.env.APP_SECRET;

    if (!appId || !appSecret) {
      console.error(
        "Missing environment variables: PRIVY_APP_ID or PRIVY_APP_SECRET"
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("🔄 Forwarding transaction to Privy API...");
    console.log("Wallet ID:", walletId);
    console.log("Method:", signaturePayload.body.method);

    // Create authorization header
    const authHeader = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString(
      "base64"
    )}`;

    // Make request to Privy API
    const privyResponse = await fetch(
      `https://api.privy.io/v1/wallets/${walletId}/rpc`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          "privy-app-id": appId,
          "privy-authorization-signature": authorizationSignature,
        },
        body: JSON.stringify(signaturePayload.body),
      }
    );

    // Parse response
    const responseData = await privyResponse.json();

    // Handle errors from Privy API
    if (!privyResponse.ok) {
      console.error("❌ Privy API error:", responseData);
      return NextResponse.json(
        {
          error: responseData.message || "Transaction failed",
          details: responseData,
        },
        { status: privyResponse.status }
      );
    }

    // Success!
    const result = responseData as PrivyRpcResponse;
    console.log("✅ Transaction successful!");
    console.log("Hash:", result.data.hash);

    return NextResponse.json({
      success: true,
      hash: result.data.hash,
      caip2: result.data.caip2,
      explorerUrl: `https://explorer.solana.com/tx/${result.data.hash}`,
    });
  } catch (error: any) {
    console.error("❌ Backend error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
