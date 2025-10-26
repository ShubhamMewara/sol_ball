"use client";

import { useEffect, useRef, useState } from "react";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");

  const modalContentRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        modalContentRef.current &&
        // @ts-ignore
        !modalContentRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={modalContentRef}
        className="bg-[#1a1b24] rounded-lg border-b-4 border-[#FF6B6B] p-8 shadow-lg shadow-[#FF6B6B]/20 w-full max-w-md transform transition-all duration-300"
        style={{
          animation: isOpen
            ? "slideUp 0.3s ease-out"
            : "slideDown 0.3s ease-in",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes slideDown {
            from {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
            to {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
          }
        `}</style>

        <h2 className="text-white font-bold text-2xl mb-6 text-center">
          WITHDRAW
        </h2>

        {/* Amount Input */}
        <div className="mb-6">
          <p className="text-[#DDD9C7] text-sm mb-2">Amount (SOL)</p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
          />
        </div>

        {/* Info */}
        <div className="mb-8 bg-[#2a2b34] rounded-lg px-4 py-3 text-[#DDD9C7] text-sm">
          <p className="mb-2">Available: 30 SOL</p>
          <p>Fee: 0.001 SOL</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button className="w-full bg-[#FF6B6B] text-white py-3 rounded-lg font-bold hover:bg-[#ff5252] transition-all shadow-lg shadow-[#FF6B6B]/30">
            CONFIRM WITHDRAW
          </button>
          <button
            onClick={onClose}
            className="w-full bg-[#2a2b34] text-[#DDD9C7] py-3 rounded-lg font-bold hover:bg-[#3a3b44] transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
