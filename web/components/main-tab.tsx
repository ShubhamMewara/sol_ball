"use client";

import { useState } from "react";
import HomePage from "./home-page";

type tabs = "main" | "profile" | "leaderboard" | "home";

export default function MainTab() {
  const [activeTab, setActiveTab] = useState<tabs>("main");

  return (
    <div className="min-h-screen max-w-[2000px] mx-auto ">
      <HomePage activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
