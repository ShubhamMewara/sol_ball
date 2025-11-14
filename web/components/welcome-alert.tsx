"use client";

import { useEffect, useState } from "react";

export function WelcomeAlert() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the alert before
    const hasSeenAlert = localStorage.getItem("solball-welcome-seen");

    if (!hasSeenAlert) {
      setIsOpen(true);
      localStorage.setItem("solball-welcome-seen", "true");
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div
        className="relative max-w-md w-full mx-4 p-6 rounded-lg shadow-2xl border border-opacity-20"
        style={{
          backgroundColor: "#1a1b24",
          borderColor: "#7ACD54",
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 transition-opacity hover:opacity-70"
          style={{ color: "#7ACD54" }}
          aria-label="Close alert"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold" style={{ color: "#7ACD54" }}>
            Welcome to Solball 🎾
          </h2>

          <p className="text-base leading-relaxed" style={{ color: "#7ACD54" }}>
            This is an application built on{" "}
            <span className="font-semibold">Devnet</span> using Solana
            blockchain technology.
          </p>

          <p className="text-sm opacity-90" style={{ color: "#7ACD54" }}>
            Experience decentralized gaming on the Solana network with instant
            transactions and low fees.
          </p>

          {/* Action button */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2 rounded-md font-semibold transition-all hover:opacity-80 mt-6"
            style={{
              backgroundColor: "#7ACD54",
              color: "#1a1b24",
            }}
          >
            Let's Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
