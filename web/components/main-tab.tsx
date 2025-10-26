"use client";

import { useState } from "react";
import CreateLobbyModal from "./create-lobby-modal";
import GameCard from "./game-card";
import ChatSidebar from "./chat-sidebar";
import ProfileTab from "./profile-menu";

export default function MainTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("main");

  return (
    <div className="min-h-screen max-w-[2000px] mx-auto ">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between pt-8 pb-8 px-4">
        {/* Decorative circles */}
        <div className="w-24 h-24 rounded-full bg-[#2a2b34] opacity-50"></div>

        {/* Tab Navigation */}
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
              activeTab === "profile"
                ? "border-b-[#00BFFF] bg-[#1a1b24] shadow-lg shadow-[#00BFFF]/20"
                : "bg-[#2a2b34] border-b-transparent"
            }`}
          >
            PROFILE
          </button>
          <button
            onClick={() => setActiveTab("main")}
            className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
              activeTab === "main"
                ? "border-b-[#7ACD54] bg-[#1a1b24] shadow-lg shadow-[#7ACD54]/20"
                : "bg-[#2a2b34] border-b-transparent"
            }`}
          >
            MAIN
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
              activeTab === "leaderboard"
                ? "border-b-[#FF1493] bg-[#1a1b24] shadow-lg shadow-[#FF1493]/20"
                : "bg-[#2a2b34] border-b-transparent"
            }`}
          >
            LEADERBOARD
          </button>
        </div>

        {/* Decorative circles */}
        <div className="w-24 h-24 rounded-full bg-[#2a2b34] opacity-50"></div>
      </div>

      {/* Main Content */}
      {activeTab === "main" && (
        <div className="flex gap-6 px-6 pb-8 relative">
          {/* Left Sidebar - Chat */}
          <ChatSidebar />

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Top Right Button */}
            <div className="absolute top-0 right-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#7ACD54] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#6ab844] transition-all shadow-[4px_4px_0_0_#65ab44]"
              >
                CREATE A LOBBY
              </button>
            </div>

            {/* SOL Balance Section */}
            <div className="mb-8 mt-4">
              <div className="bg-[#2a2b34] rounded-lg px-6 py-4 inline-block shadow-md">
                <h3 className="text-white font-bold text-lg">SOL BALANCE</h3>
              </div>
            </div>

            {/* Game Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <GameCard
                stake="0.5 $SOL"
                players="3VS3"
                blueTeam={["Kanciano", "Sigma98", "tuzin"]}
                redTeam={["Kanciano", "Sigma98", "tuzin"]}
                actionType="spectate"
              />
              <GameCard
                stake="0.5 $SOL"
                players="3VS3"
                blueTeam={["Kanciano", "Sigma98", "tuzin"]}
                redTeam={["Kanciano", "Sigma98", "tuzin"]}
                actionType="join"
              />
              <div className="border-b-4 border-[#7ACD54] rounded-lg bg-[#1a1b24] min-h-64 shadow-lg shadow-[#7ACD54]/10"></div>
            </div>
          </div>
        </div>
      )}
      {activeTab === "profile" && <ProfileTab />}
      {/* Modal */}
      {isModalOpen && (
        <CreateLobbyModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
