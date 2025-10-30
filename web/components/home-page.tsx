"use client";

import type { Dispatch, SetStateAction } from "react";
import { Card, CardTitle } from "./ui/card";
import Link from "next/link";

type tabs = "main" | "profile" | "leaderboard" | "home";

export const playHapticFeedback = () => {
  // Haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }

  // Play subtle beep sound
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.1
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

const HomePage = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: tabs;
  setActiveTab: Dispatch<SetStateAction<tabs>>;
}) => {
  return (
    <div className="w-full h-full mx-auto gap-8 flex flex-col md:flex-row justify-center items-center">
      <Link href={"/profile"} className="w-[450px] md:min-h-[600px]">
        <Card
          className="flex-1 w-full h-full bg-[#1a1b24] rounded-lg md:min-h-[600px] border-b-4 border-[#4080df] p-8 shadow-lg shadow-[#4080df]/10  hover:shadow-[#4080df]/50 card-hover card-hover-border"
          onClick={() => setActiveTab("profile")}
          onMouseEnter={playHapticFeedback}
        >
          <CardTitle className="text-white font-bold text-2xl mb-8 text-center">
            PROFILE
          </CardTitle>
        </Card>
      </Link>
      <Link href={"/main"} className="w-[450px] md:min-h-[600px] ">
        <Card
          className="flex-1 bg-[#1a1b24] w-full h-full rounded-lg md:min-h-[600px] border-b-4 border-[#7ACD54] p-8 shadow-lg shadow-[#7ACD54]/10  hover:shadow-[#7ACD54]/50 card-hover card-hover-border"
          onClick={() => setActiveTab("main")}
          onMouseEnter={playHapticFeedback}
        >
          <CardTitle className="text-white font-bold text-2xl mb-8 text-center">
            Main
          </CardTitle>
        </Card>
      </Link>
      <Link href={"/leaderboard"} className="w-[450px] md:min-h-[600px]">
        <Card
          className="flex-1 w-full h-full bg-[#1a1b24] rounded-lg md:min-h-[600px] border-b-4 border-[#ac2292] p-8 shadow-lg shadow-[#ac2292]/10  hover:shadow-[#ac2292]/50 card-hover card-hover-border"
          onClick={() => setActiveTab("leaderboard")}
          onMouseEnter={playHapticFeedback}
        >
          <CardTitle className="text-white font-bold text-2xl mb-8 text-center">
            Leaderboard
          </CardTitle>
        </Card>
      </Link>
    </div>
  );
};

export default HomePage;
