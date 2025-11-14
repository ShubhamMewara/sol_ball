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
      {/* PROFILE CARD */}
      <Link href={"/profile"} className="w-[450px] md:min-h-[600px]">
        <Card
          className="relative flex-1 w-full h-full bg-[#1a1b24] rounded-lg md:min-h-[600px] border-b-4 border-[#4080df] p-8 shadow-lg shadow-[#4080df]/10 hover:shadow-[#4080df]/50 card-hover card-hover-border overflow-hidden"
          onClick={() => setActiveTab("profile")}
          onMouseEnter={playHapticFeedback}
        >
          {/* SVG Decorations */}
          <svg
            className="absolute top-4 right-4 w-12 h-12 opacity-20"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#4080df"
              strokeWidth="3"
            />
            <circle
              cx="50"
              cy="50"
              r="25"
              fill="none"
              stroke="#4080df"
              strokeWidth="2"
            />
            <circle cx="50" cy="50" r="10" fill="#4080df" />
          </svg>

          <svg
            className="absolute bottom-4 left-4 w-16 h-16 opacity-10"
            viewBox="0 0 100 100"
          >
            <polygon
              points="50,10 90,90 10,90"
              fill="none"
              stroke="#4080df"
              strokeWidth="3"
            />
            <circle cx="50" cy="60" r="15" fill="#4080df" opacity="0.5" />
          </svg>

          <CardTitle className="text-white font-bold text-2xl mb-8 text-center relative z-10">
            PROFILE
          </CardTitle>

          {/* Diagonal Polygon Cut Image Mockup */}
          <div className="relative mt-8 mx-auto w-full h-64">
            {/* Image with diagonal clip */}
            <img
              src="/profile.jpeg"
              alt="Profile Preview"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: "polygon(0 17%, 100% 0, 100% 100%, 0 83%)" }}
            />

            {/* SVG Border */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 400 300"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="profile-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#4080df" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#4080df" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <polygon
                points="0,50 400,0 400,300 0,250"
                fill="url(#profile-gradient)"
                opacity="0.3"
              />
              <polygon
                points="0,50 400,0 400,300 0,250"
                fill="none"
                stroke="#4080df"
                strokeWidth="2"
              />
            </svg>

            {/* Fallback text if no image */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ clipPath: "polygon(0 17%, 100% 0, 100% 100%, 0 83%)" }}
            >
              <div className="text-[#4080df] font-bold text-4xl opacity-20">
                USER STATS
              </div>
            </div>
          </div>

          {/* Decorative Corner Elements */}
          <svg
            className="absolute top-0 left-0 w-20 h-20 opacity-15"
            viewBox="0 0 100 100"
          >
            <path d="M 0 0 L 100 0 L 0 100 Z" fill="#4080df" />
          </svg>
        </Card>
      </Link>

      {/* MAIN CARD */}
      <Link href={"/main"} className="w-[450px] md:min-h-[600px]">
        <Card
          className="relative flex-1 bg-[#1a1b24] w-full h-full rounded-lg md:min-h-[600px] border-b-4 border-[#7ACD54] p-8 shadow-lg shadow-[#7ACD54]/10 hover:shadow-[#7ACD54]/50 card-hover card-hover-border overflow-hidden"
          onClick={() => setActiveTab("main")}
          onMouseEnter={playHapticFeedback}
        >
          {/* SVG Decorations */}
          <svg
            className="absolute top-4 right-4 w-16 h-16 opacity-20"
            viewBox="0 0 100 100"
          >
            <rect
              x="10"
              y="10"
              width="30"
              height="30"
              fill="none"
              stroke="#7ACD54"
              strokeWidth="2"
            />
            <rect
              x="60"
              y="10"
              width="30"
              height="30"
              fill="none"
              stroke="#7ACD54"
              strokeWidth="2"
            />
            <rect
              x="10"
              y="60"
              width="30"
              height="30"
              fill="none"
              stroke="#7ACD54"
              strokeWidth="2"
            />
            <rect
              x="60"
              y="60"
              width="30"
              height="30"
              fill="#7ACD54"
              opacity="0.5"
            />
          </svg>

          <svg
            className="absolute bottom-8 left-8 w-12 h-12 opacity-15 animate-pulse"
            viewBox="0 0 100 100"
          >
            <polygon points="50,15 90,85 10,85" fill="#7ACD54" />
          </svg>

          <CardTitle className="text-white font-bold text-2xl mb-8 text-center relative z-10">
            MAIN
          </CardTitle>

          {/* Diagonal Polygon Cut Image Mockup */}
          <div className="relative mt-8 mx-auto w-full h-64">
            {/* Image with diagonal clip */}
            <img
              src="/solball.jpeg"
              alt="Main Game Preview"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: "polygon(0 0, 100% 20%, 100% 80%, 0 100%)" }}
            />

            {/* SVG Border */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 400 300"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="main-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#7ACD54" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#7ACD54" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <polygon
                points="0,0 400,60 400,240 0,300"
                fill="url(#main-gradient)"
                opacity="0.3"
              />
              <polygon
                points="0,0 400,60 400,240 0,300"
                fill="none"
                stroke="#7ACD54"
                strokeWidth="2"
              />
            </svg>

            {/* Fallback text if no image */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ clipPath: "polygon(0 0, 100% 20%, 100% 80%, 0 100%)" }}
            >
              <div className="text-[#7ACD54] font-bold text-4xl opacity-20">
                PLAY GAME
              </div>
            </div>
          </div>

          {/* Decorative Hexagon */}
          <svg
            className="absolute top-1/2 right-4 w-10 h-10 opacity-10"
            viewBox="0 0 100 100"
          >
            <polygon
              points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
              fill="none"
              stroke="#7ACD54"
              strokeWidth="3"
            />
          </svg>
        </Card>
      </Link>

      {/* LEADERBOARD CARD */}
      <Link href={"/leaderboard"} className="w-[450px] md:min-h-[600px]">
        <Card
          className="relative flex-1 w-full h-full bg-[#1a1b24] rounded-lg md:min-h-[600px] border-b-4 border-[#ac2292] p-8 shadow-lg shadow-[#ac2292]/10 hover:shadow-[#ac2292]/50 card-hover card-hover-border overflow-hidden"
          onClick={() => setActiveTab("leaderboard")}
          onMouseEnter={playHapticFeedback}
        >
          {/* SVG Decorations */}
          <svg
            className="absolute top-4 right-4 w-14 h-14 opacity-20"
            viewBox="0 0 100 100"
          >
            <path
              d="M 50 10 L 70 40 L 100 45 L 75 70 L 80 100 L 50 85 L 20 100 L 25 70 L 0 45 L 30 40 Z"
              fill="none"
              stroke="#ac2292"
              strokeWidth="2"
            />
            <circle cx="50" cy="50" r="15" fill="#ac2292" opacity="0.5" />
          </svg>

          <svg
            className="absolute bottom-4 left-4 w-16 h-16 opacity-10"
            viewBox="0 0 100 100"
          >
            <rect
              x="35"
              y="60"
              width="30"
              height="35"
              fill="#ac2292"
              opacity="0.7"
            />
            <rect
              x="15"
              y="70"
              width="20"
              height="25"
              fill="#ac2292"
              opacity="0.5"
            />
            <rect
              x="65"
              y="75"
              width="20"
              height="20"
              fill="#ac2292"
              opacity="0.3"
            />
          </svg>

          <CardTitle className="text-white font-bold text-2xl mb-8 text-center relative z-10">
            LEADERBOARD
          </CardTitle>

          {/* Diagonal Polygon Cut Image Mockup */}
          <div className="relative mt-8 mx-auto w-full h-64">
            {/* Image with diagonal clip */}
            <img
              src="/leaderboard.jpeg"
              alt="Leaderboard Preview"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: "polygon(15% 0, 100% 0, 85% 100%, 0 100%)" }}
            />

            {/* SVG Border */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 400 300"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="leaderboard-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ac2292" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ac2292" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <polygon
                points="60,0 400,0 340,300 0,300"
                fill="url(#leaderboard-gradient)"
                opacity="0.3"
              />
              <polygon
                points="60,0 400,0 340,300 0,300"
                fill="none"
                stroke="#ac2292"
                strokeWidth="2"
              />
            </svg>

            {/* Fallback text if no image */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ clipPath: "polygon(15% 0, 100% 0, 85% 100%, 0 100%)" }}
            >
              <div className="text-[#ac2292] font-bold text-4xl opacity-20">
                TOP RANKS
              </div>
            </div>
          </div>

          {/* Decorative Trophy Icon */}
          <svg
            className="absolute top-1/2 left-4 w-12 h-12 opacity-15"
            viewBox="0 0 100 100"
          >
            <path
              d="M 30 20 L 30 35 Q 30 50 20 55 L 20 60 L 80 60 L 80 55 Q 70 50 70 35 L 70 20 Z"
              fill="#ac2292"
            />
            <rect x="40" y="60" width="20" height="25" fill="#ac2292" />
            <rect x="30" y="85" width="40" height="8" fill="#ac2292" />
            <circle cx="50" cy="30" r="8" fill="#1a1b24" />
          </svg>

          {/* Decorative Corner Star */}
          <svg
            className="absolute bottom-0 right-0 w-20 h-20 opacity-15"
            viewBox="0 0 100 100"
          >
            <path
              d="M 50 10 L 65 45 L 100 50 L 75 75 L 80 100 L 50 85 L 20 100 L 25 75 L 0 50 L 35 45 Z"
              fill="#ac2292"
            />
          </svg>
        </Card>
      </Link>
    </div>
  );
};

export default HomePage;
