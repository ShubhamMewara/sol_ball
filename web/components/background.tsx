"use client";
import React, { useEffect, useRef } from "react";

const BackgroundField: React.FC = () => {
  const ballRef = useRef<HTMLDivElement>(null);
  const redRef = useRef<HTMLDivElement>(null);
  const blueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial State - relative to window size
    const state = {
      ball: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        r: 20,
      },
      red: {
        x: window.innerWidth * 0.2,
        y: window.innerHeight / 2,
        vx: 0,
        vy: 0,
        r: 30,
      },
      blue: {
        x: window.innerWidth * 0.8,
        y: window.innerHeight / 2,
        vx: 0,
        vy: 0,
        r: 30,
      },
    };

    const friction = 0.985;
    const playerAccel = 0.8;
    const playerFriction = 0.88;
    const kickForce = 2.0;

    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // 1. AI Logic for Red and Blue players
      const entities = [
        { data: state.red, side: "left" },
        { data: state.blue, side: "right" },
      ];

      entities.forEach((p) => {
        // AI: Target the ball
        const dx = state.ball.x - p.data.x;
        const dy = state.ball.y - p.data.y;
        const distToBall = Math.sqrt(dx * dx + dy * dy);

        // Simple pursuit AI
        if (distToBall > 0) {
          p.data.vx += (dx / distToBall) * playerAccel;
          p.data.vy += (dy / distToBall) * playerAccel;
        }

        // Apply friction and move
        p.data.vx *= playerFriction;
        p.data.vy *= playerFriction;
        p.data.x += p.data.vx;
        p.data.y += p.data.vy;

        // Keep players in bounds (with padding)
        const pad = p.data.r + 20;
        if (p.data.x < pad) {
          p.data.x = pad;
          p.data.vx *= -0.5;
        }
        if (p.data.x > w - pad) {
          p.data.x = w - pad;
          p.data.vx *= -0.5;
        }
        if (p.data.y < pad) {
          p.data.y = pad;
          p.data.vy *= -0.5;
        }
        if (p.data.y > h - pad) {
          p.data.y = h - pad;
          p.data.vy *= -0.5;
        }

        // Ball Collision
        if (distToBall < p.data.r + state.ball.r) {
          const nx = dx / distToBall;
          const ny = dy / distToBall;

          // Transfer momentum
          state.ball.vx += nx * kickForce + p.data.vx * 0.8;
          state.ball.vy += ny * kickForce + p.data.vy * 0.8;

          // Resolve overlap
          const overlap = p.data.r + state.ball.r - distToBall;
          state.ball.x += nx * overlap;
          state.ball.y += ny * overlap;
        }
      });

      // 2. Ball Physics
      state.ball.vx *= friction;
      state.ball.vy *= friction;
      state.ball.x += state.ball.vx;
      state.ball.y += state.ball.vy;

      // Ball Wall Bounces
      const bPad = state.ball.r;
      if (state.ball.x < bPad) {
        state.ball.x = bPad;
        state.ball.vx *= -1;
      }
      if (state.ball.x > w - bPad) {
        state.ball.x = w - bPad;
        state.ball.vx *= -1;
      }
      if (state.ball.y < bPad) {
        state.ball.y = bPad;
        state.ball.vy *= -1;
      }
      if (state.ball.y > h - bPad) {
        state.ball.y = h - bPad;
        state.ball.vy *= -1;
      }

      // 3. Render via transforms (using translate3d for hardware acceleration)
      if (ballRef.current)
        ballRef.current.style.transform = `translate3d(${state.ball.x}px, ${state.ball.y}px, 0)`;
      if (redRef.current)
        redRef.current.style.transform = `translate3d(${state.red.x}px, ${state.red.y}px, 0)`;
      if (blueRef.current)
        blueRef.current.style.transform = `translate3d(${state.blue.x}px, ${state.blue.y}px, 0)`;

      requestAnimationFrame(update);
    };

    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#06070a]">
      {/* Pitch Layout */}
      <div className="absolute inset-0 pitch-pattern opacity-10"></div>

      {/* Pitch Markings */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-20 h-[60vh] border-r border-y border-white/5 rounded-r-3xl"></div>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-20 h-[60vh] border-l border-y border-white/5 rounded-l-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] border border-white/5 rounded-full flex items-center justify-center">
        <div className="w-1 h-1 bg-white/20 rounded-full"></div>
      </div>

      {/* Red AI Player */}
      <div
        ref={redRef}
        className="absolute top-0 left-0 w-[60px] h-[60px] rounded-full border-[6px] border-red-500 bg-red-600/20 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: "transform" }}
      >
        <div className="w-4 h-4 rounded-full bg-white/10"></div>
      </div>

      {/* Blue AI Player */}
      <div
        ref={blueRef}
        className="absolute top-0 left-0 w-[60px] h-[60px] rounded-full border-[6px] border-blue-500 bg-blue-600/20 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: "transform" }}
      >
        <div className="w-4 h-4 rounded-full bg-white/10"></div>
      </div>

      {/* The Ball */}
      <div
        ref={ballRef}
        className="absolute top-0 left-0 w-[40px] h-[40px] -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ willChange: "transform" }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="white"
            stroke="#111"
            strokeWidth="2"
          />
          <path d="M50 2 L30 20 L35 45 L65 45 L70 20 Z" fill="#111" />
          <path d="M2 50 L20 70 L45 65 L45 35 L20 30 Z" fill="#111" />
          <path d="M98 50 L80 30 L55 35 L55 65 L80 70 Z" fill="#111" />
          <path d="M50 98 L70 80 L65 55 L35 55 L30 80 Z" fill="#111" />
        </svg>
      </div>
    </div>
  );
};

export default BackgroundField;
