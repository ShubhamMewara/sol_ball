import React, { Dispatch, SetStateAction } from "react";
import { playHapticFeedback } from "./home-page";

type tabs = "main" | "profile" | "leaderboard" | "home";

const NavTabs = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: tabs;
  setActiveTab: Dispatch<SetStateAction<tabs>>;
}) => {
  return (
    <div className="flex gap-6">
      <button
        onClick={() => {
          setActiveTab("profile"), playHapticFeedback();
        }}
        className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
          activeTab === "profile"
            ? "border-b-[#00BFFF] bg-[#1a1b24] shadow-lg shadow-[#00BFFF]/20"
            : "bg-[#2a2b34] border-b-transparent"
        }`}
      >
        PROFILE
      </button>
      <button
        onClick={() => {
          setActiveTab("main"), playHapticFeedback();
        }}
        className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
          activeTab === "main"
            ? "border-b-[#7ACD54] bg-[#1a1b24] shadow-lg shadow-[#7ACD54]/20"
            : "bg-[#2a2b34] border-b-transparent"
        }`}
      >
        MAIN
      </button>
      <button
        onClick={() => {
          setActiveTab("leaderboard"), playHapticFeedback();
        }}
        className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-all border-b-4 rounded-xl ${
          activeTab === "leaderboard"
            ? "border-b-[#FF1493] bg-[#1a1b24] shadow-lg shadow-[#FF1493]/20"
            : "bg-[#2a2b34] border-b-transparent"
        }`}
      >
        LEADERBOARD
      </button>
    </div>
  );
};

export default NavTabs;
