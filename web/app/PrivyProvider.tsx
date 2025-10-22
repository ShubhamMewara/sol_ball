"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

export default function PrivvyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId="cmgy56w8c00m7ie0b754duzgh"
      config={{
        appearance: {
          accentColor: "#6A6FF5",
          theme: "#ffffff",
          showWalletLoginFirst: false,
          logo: "https://auth.privy.io/logos/privy-logo.png",
          walletChainType: "solana-only",
          walletList: [
            "detected_solana_wallets",
            "phantom",
            "solflare",
            "backpack",
            "okx_wallet",
          ],
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
        embeddedWallets: {
          showWalletUIs: true,
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
