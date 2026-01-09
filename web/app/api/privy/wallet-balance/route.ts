import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const asset = searchParams.get("asset");
  const chain = searchParams.get("chain");

  if (!address || !asset || !chain) {
    return NextResponse.json(
      { error: "address, asset and chain are required" },
      { status: 400 }
    );
  }

  // 1) Lookup user by wallet address to find the Privy wallet
  const lookupRes = await fetch(
    `https://api.privy.io/v1/users/wallet/address`,
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
      body: JSON.stringify({ address }),
    }
  );

  if (!lookupRes.ok) {
    return NextResponse.json(
      { error: "failed to lookup user by address" },
      { status: lookupRes.status }
    );
  }

  const user = await lookupRes.json();

  const linkedWallets = user.linked_accounts || [];
  const found = linkedWallets.find(
    (w: any) => w.address?.toLowerCase() === address.toLowerCase()
  );

  if (!found) {
    return NextResponse.json(
      { error: "wallet not found for that address" },
      { status: 404 }
    );
  }

  const walletId = found.wallet_id || found.id;

  // 2) Fetch balance with asset & chain query params
  const balanceRes = await fetch(
    `https://api.privy.io/v1/wallets/${walletId}/balance?asset=${asset}&chain=${chain}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "privy-app-id": process.env.APP_ID!,
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.APP_ID}:${process.env.APP_SECRET}`
          ).toString("base64"),
      },
    }
  );

  const balanceData = await balanceRes.json();
  return NextResponse.json(balanceData);
}
