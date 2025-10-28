"use client";

import { useState } from "react";
import CreateLobbyModal from "./create-lobby-modal";
import GameCard from "./game-card";
import ChatSidebar from "./chat-sidebar";
import ProfileTab from "./profile-menu";
import Circle from "./circle";
import HomePage from "./home-page";
import NavTabs from "./NavTabs";
import { lobbyData } from "@/lib/data";
import LobbyWaitingModal from "./lobby-room";
import DepositModal from "./deposit-model";
import WithdrawModal from "./withdraw-model";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

type tabs = "main" | "profile" | "leaderboard" | "home";

export default function MainTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<tabs>("main");
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const { authenticated, ready, user, login } = usePrivy();

  const shortAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";

  return (
    <div className="min-h-screen max-w-[2000px] mx-auto ">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between pt-8 pb-8 px-4">
        {/* Decorative circles */}
        <div
          onClick={() => setActiveTab("home")}
          className="cursor-pointer hover:animate-pulse"
        >
          <Circle />
        </div>

        {/* Tab Navigation */}
        {activeTab !== "home" && (
          <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* Wallet actions (replaces decorative circle) */}
        <div className="flex items-center gap-3">
          {/* Withdraw */}
          <Button
            onClick={() =>
              authenticated
                ? setIsWithdrawOpen(true)
                : login({ loginMethods: ["wallet"] })
            }
            className="px-5 py-2.5 rounded-full font-bold text-sm tracking-wider bg-[#2a2b34] text-[#DDD9C7] shadow-[0_0_0_2px_rgba(0,0,0,0.35)] hover:bg-[#343541] transition-colors"
          >
            WITHDRAW
          </Button>
          {/* Deposit */}
          <Button
            onClick={() =>
              authenticated
                ? setIsDepositOpen(true)
                : login({ loginMethods: ["wallet"] })
            }
            className="px-5 py-2.5 rounded-full font-bold text-sm tracking-wider bg-[#7ACD54] text-white hover:bg-[#6ab844] transition-colors shadow-[4px_4px_0_0_#65ab44]"
          >
            DEPOSIT
          </Button>
          {/* Wallet chip */}
          <Button
            onClick={() =>
              authenticated ? null : login({ loginMethods: ["wallet"] })
            }
            className="relative rounded-full px-5 py-2.5 font-bold text-sm text-white"
            title={authenticated ? user?.wallet?.address : "Connect Wallet"}
          >
            {authenticated ? shortAddress(user?.wallet?.address) : "Connect"}
          </Button>
        </div>
      </div>

      {/* Home Page */}

      {activeTab == "home" && (
        <HomePage activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
      {/* Main Content */}
      {activeTab !== "home" && (
        <div className="flex gap-6 px-6 pb-8 relative">
          {<ChatSidebar />}
          <div className="flex-1">
            {activeTab === "main" && (
              <>
                <div className="absolute top-0 right-6">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#7ACD54] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#6ab844] transition-all shadow-[4px_4px_0_0_#65ab44]"
                  >
                    CREATE A LOBBY
                  </button>
                </div>
                <div className="mb-8 mt-4">
                  <div className="bg-[#2a2b34] rounded-lg px-6 py-4 inline-block shadow-md">
                    <h3 className="text-white font-bold text-lg">
                      SOL BALANCE
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {lobbyData
                    .filter((data) => data.actionType == "join")
                    .map((data) => (
                      <GameCard
                        key={data.host}
                        stake={data.stake}
                        players={data.players}
                        blueTeam={data.blueTeam}
                        redTeam={data.redTeam}
                        actionType={data.actionType as "join" | "spectate"}
                        host={data.host}
                      />
                    ))}
                  {lobbyData
                    .filter((data) => data.actionType == "spectate")
                    .map((data) => (
                      <GameCard
                        key={data.host}
                        stake={data.stake}
                        players={data.players}
                        blueTeam={data.blueTeam}
                        redTeam={data.redTeam}
                        actionType={data.actionType as "join" | "spectate"}
                        host={data.host}
                      />
                    ))}
                </div>
              </>
            )}
            {activeTab === "profile" && <ProfileTab />}
          </div>
          {isModalOpen && (
            <CreateLobbyModal onClose={() => setIsModalOpen(false)} />
          )}
          {/* Header modals */}
          <DepositModal
            isOpen={isDepositOpen}
            onClose={() => setIsDepositOpen(false)}
          />
          <WithdrawModal
            isOpen={isWithdrawOpen}
            onClose={() => setIsWithdrawOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
