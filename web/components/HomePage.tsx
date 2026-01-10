"use client";
import Link from "next/link";
import React from "react";

export const playHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }

  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 1000;
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.05
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.05);
};

const Card: React.FC<{
  title: string;
  href: string;
  color: string;
  image: string;
  description: string;
  icon: React.ReactNode;
  clipPath: string;
  team: "RED" | "BLUE" | "SPEC";
}> = ({ title, href, color, image, description, icon, clipPath, team }) => {
  return (
    <Link
      href={href}
      className="group relative w-full max-w-[380px] h-[580px] block"
      onMouseEnter={playHapticFeedback}
    >
      {/* Team Identifier */}
      <div
        className={`absolute -top-3 left-8 z-20 px-4 py-1 rounded-sm text-[9px] font-black text-white italic tracking-widest border-l-4 border-white/50`}
        style={{ backgroundColor: color }}
      >
        SOL_{team}_UNIT
      </div>

      <div
        className={`
        relative h-full w-full bg-[#0d0e14] rounded-tr-[3rem] rounded-bl-[3rem] border-2 p-7 flex flex-col overflow-hidden card-hover
        shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]
      `}
        style={{
          borderColor: `${color}33`,
          borderBottomColor: color,
          boxShadow: `0 0 40px -10px ${color}44`,
        }}
      >
        {/* Haxball-style Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(${color} 2px, transparent 2px)`,
              backgroundSize: "30px 30px",
            }}
          ></div>
        </div>

        {/* Scoreboard UI Header */}
        <div className="relative z-10 flex justify-between items-center mb-10 bg-black/50 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
          <div className="flex flex-col">
            <h2 className="text-2xl font-orbitron font-black italic text-white uppercase group-hover:text-emerald-400 transition-colors leading-none tracking-tighter">
              {title}
            </h2>
          </div>
        </div>

        {/* Dynamic Image with Clip */}
        <div className="relative flex-1 my-2 group-hover:scale-105 transition-all duration-700 ease-out">
          <div
            className="absolute inset-0 bg-cover bg-center overflow-hidden transition-all grayscale-[40%] group-hover:grayscale-0 shadow-2xl"
            style={{
              backgroundImage: `url(${image})`,
              clipPath: clipPath,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-transparent to-transparent"></div>
          </div>

          {/* Animated SVG Decoration */}
          <div className="absolute -bottom-4 -right-4 w-24 h-24 opacity-0 group-hover:opacity-20 transition-all rotate-12 group-hover:rotate-0 duration-500">
            <svg viewBox="0 0 100 100" className="fill-white animate-spin-slow">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="white"
                strokeWidth="1"
                fill="none"
                strokeDasharray="10 5"
              />
              <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" />
            </svg>
          </div>
        </div>

        {/* Bottom Description */}
        <div className="mt-8 relative z-10">
          <p className="text-xs text-gray-500 mb-8 leading-relaxed font-semibold uppercase tracking-wider">
            {description}
          </p>
          <div className="h-1 w-full bg-white/5 overflow-hidden rounded-full">
            <div
              className="h-full w-0 group-hover:w-full transition-all duration-1000"
              style={{ backgroundColor: color }}
            ></div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const WorkflowStep: React.FC<{
  number: string;
  title: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
}> = ({ number, title, subtitle, color, icon }) => (
  <div className="flex flex-col items-center group cursor-default">
    <div className="relative mb-6">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center border-2 rotate-45 group-hover:rotate-0 transition-transform duration-500 relative z-10 bg-[#0d0e14]"
        style={{ borderColor: color, boxShadow: `0 0 20px ${color}33` }}
      >
        <div className="-rotate-45 group-hover:rotate-0 transition-transform duration-500">
          {icon}
        </div>
      </div>
      <span className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-white text-[#0d0e14] font-black font-orbitron flex items-center justify-center text-xs z-20 border-2 border-[#0d0e14]">
        {number}
      </span>
      <div
        className="absolute inset-0 blur-2xl opacity-20 group-hover:opacity-50 transition-opacity rounded-full"
        style={{ backgroundColor: color }}
      ></div>
    </div>
    <div className="text-center">
      <h3 className="text-xl font-orbitron font-black italic tracking-tighter text-white mb-2">
        {title}
      </h3>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white/80 transition-colors">
        {subtitle}
      </p>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Global Ticker */}
      <div className="w-full bg-emerald-500/5 border-y border-white/5 py-3 mb-16 overflow-hidden flex whitespace-nowrap backdrop-blur-sm">
        <div className="animate-marquee flex items-center gap-16 text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400/80">
          <span>● SOLBALL CHAMPIONSHIP LIVE: TIER 1 ARENA</span>
          <span>● [USER_771] SCORED A TRIPLE POLL COMBO</span>
          <span>● NEW SEASON STARTS IN 14 HOURS</span>
          <span>● ARENA_04 LATENCY: 12ms</span>
          <span>● SOLBALL CHAMPIONSHIP LIVE: TIER 1 ARENA</span>
        </div>
      </div>

      <div className="text-center  relative ">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 opacity-[0.03] pointer-events-none">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full fill-white animate-spin-slow"
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              stroke="white"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M0 50 L100 50 M50 0 L50 100"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
        </div>
        <h1 className="text-7xl md:text-9xl font-orbitron font-black italic tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/10 uppercase">
          SOL<span className="text-emerald-500">BALL</span>
        </h1>
        <div className="flex items-center justify-center gap-4 opacity-40">
          <div className="h-[1px] w-12 bg-white"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">
            Tactical Arena Lobby
          </p>
          <div className="h-[1px] w-12 bg-white"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 w-full max-w-7xl px-4 justify-items-center mt-20">
        <Card
          title="Profile"
          href="/profile"
          team="RED"
          color="#f43f5e"
          description="Access your tactical career data, career trophies, and custom manager disc skins."
          image="https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&q=80&w=800"
          clipPath="polygon(0 20%, 100% 0, 100% 100%, 0 80%)"
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        />

        <Card
          title="Arena"
          href="/main"
          team="SPEC"
          color="#10b981"
          description="The live battlefield. Make split-second predictions and influence the game pulse."
          image="/playground.png"
          clipPath="polygon(0 0, 100% 15%, 100% 85%, 0 100%)"
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />

        <Card
          title="Leaderboard"
          href="/leaderboard"
          team="BLUE"
          color="#3b82f6"
          description="Climb the global ranks. Compete for the MVP title and seasonal leaderboard rewards."
          image="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800"
          clipPath="polygon(15% 0, 100% 0, 85% 100%, 0 100%)"
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      {/* Workflow Section */}
      <div className="mt-32 w-full max-w-7xl px-4 py-20 border-t border-white/5 relative bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-8 py-1 bg-white/[0.03] border-x border-b border-white/10 text-[8px] font-black uppercase tracking-[0.5em] text-white/20">
          Operation Workflow
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-20 md:gap-8 justify-items-center">
          <WorkflowStep
            number="01"
            title="Login & Add Funds"
            subtitle="Prepare Your Warchest"
            color="#f43f5e"
            icon={
              <svg
                className="w-10 h-10 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
          />
          <WorkflowStep
            number="02"
            title="Bet & Play"
            subtitle="Dominate the Arena"
            color="#10b981"
            icon={
              <svg
                className="w-10 h-10 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
          />
          <WorkflowStep
            number="03"
            title="Win & Cashout"
            subtitle="Claim Your Rewards"
            color="#3b82f6"
            icon={
              <svg
                className="w-10 h-10 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>

        {/* Tactical Connectors (Visible on desktop) */}
        <div className="hidden md:block absolute top-[calc(50%+40px)] left-[33%] w-[10%] h-[1px] bg-gradient-to-r from-rose-500/20 to-emerald-500/20"></div>
        <div className="hidden md:block absolute top-[calc(50%+40px)] left-[57%] w-[10%] h-[1px] bg-gradient-to-r from-emerald-500/20 to-blue-500/20"></div>
      </div>
    </div>
  );
};

export default HomePage;
