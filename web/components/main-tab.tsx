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

type tabs = "main" | "profile" | "leaderboard" | "home";

export default function MainTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<tabs>("main");

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

        {/* Decorative circles */}
        <div className="w-24 h-24 rounded-full bg-[#2a2b34] opacity-50"></div>
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
        </div>
      )}
    </div>
  );
}
