import type { Metadata } from "next";
import "./globals.css";
import PrivvyProvider from "../providers/PrivyProvider";
import { DynaPuff } from "next/font/google";
import { NavTabs } from "@/components/NavTabs";
import ProfileProvider from "@/providers/ProfileProvider";
import { Toaster } from "sonner";
import { WelcomeAlert } from "@/components/welcome-alert";

const dynapuff = DynaPuff({
  subsets: ["latin"], // adjust subsets if needed
  variable: "--font-dynapuff",
  display: "swap",
  weight: ["400", "500", "600", "700"], // include all available weights
  style: ["normal"], // include both styles
});
export const metadata: Metadata = {
  title: "Sol Ball ⚽ – Real-Time Web3 Football Game",
  description:
    "Sol Ball is a real-time, physics-based multiplayer football game built on Solana. Deposit, play, and earn — skill meets on-chain rewards.",
  keywords: [
    "Sol Ball",
    "Solana game",
    "Haxball",
    "Web3 football",
    "crypto gaming",
    "multiplayer physics game",
    "Privy wallet",
    "decentralized esports",
    "on-chain rewards",
    "blockchain gaming",
  ],
  authors: [{ name: "Sol Ball Team", url: "" }],
  creator: "Sol Ball",
  openGraph: {
    title: "Sol Ball ⚽ – Play, Compete & Earn on Solana",
    description:
      "Join 3v3 matches, deposit SOL, and win rewards instantly. Sol Ball brings Haxball-style gameplay to Solana with seamless wallet integration.",
    url: "",
    siteName: "Sol Ball",
    type: "website",
    images: [
      {
        url: "https://rotaidwsuspvtajitelz.supabase.co/storage/v1/object/public/solball/logo.png",
        width: 1200,
        height: 630,
        alt: "Sol Ball Game Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sol Ball ⚽ – Real-Time Football Game on Solana",
    description:
      "Compete in 3v3 football matches, deposit SOL, and earn on-chain rewards. Built with Privy & Solana for seamless Web3 gameplay.",
    images: [
      "https://rotaidwsuspvtajitelz.supabase.co/storage/v1/object/public/solball/logo.png",
    ],
    creator: "@piyushhsainii | @shubhamewara",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={dynapuff.className}>
        <PrivvyProvider>
          <ProfileProvider>
            <NavTabs />
            {children}
            <Toaster />
            <WelcomeAlert />
          </ProfileProvider>
        </PrivvyProvider>
      </body>
    </html>
  );
}
