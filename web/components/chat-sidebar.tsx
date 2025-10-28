"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

export default function ChatSidebar() {
  const [messages, setMessages] = useState([
    { name: "Kanciano", message: "Great game!" },
    { name: "Kanciano", message: "Anyone want to play?" },
    { name: "Kanciano", message: "Let's go!" },
    { name: "Kanciano", message: "Nice moves" },
    { name: "Kanciano", message: "GG" },
    { name: "Kanciano", message: "Who's next?" },
    { name: "Kanciano", message: "Amazing!" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const { authenticated } = usePrivy();
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([...messages, { name: "You", message: inputValue }]);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-72 bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-6 h-[80vh] max-h-[1000px] overflow-y-auto shadow-lg shadow-[#7ACD54]/10 flex flex-col">
      <h3 className="text-white font-bold text-sm mb-6 tracking-wide">
        GLOBAL CHAT (300 ACTIVE)
      </h3>
      <div className="space-y-4 flex-1 overflow-y-auto mb-4 chat-scroll">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="text-[#DDD9C7] text-sm py-2 px-2 border-l-2 border-[#7ACD54] bg-[#0f1017] rounded hover:bg-[#16171f] transition-colors"
          >
            <div className="font-semibold text-[#7ACD54] text-xs mb-1">
              {msg.name}
            </div>
            <div>{msg.message}</div>
          </div>
        ))}
      </div>
      {authenticated ? (
        <div className="flex gap-2 mt-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-[#0f1017] border border-[#7ACD54]/30 rounded px-3 py-2 text-[#DDD9C7] text-sm placeholder-[#7ACD54]/50 focus:outline-none focus:border-[#7ACD54] transition-colors"
          />
          <Button
            onClick={handleSendMessage}
            className="bg-[#7ACD54] hover:bg-[#6ab844] text-[#1a1b24] font-semibold px-3 py-2 h-auto rounded transition-colors"
          >
            <Send size={18} />
          </Button>
        </div>
      ) : (
        <div className="text-center">
          Please connect Wallet to continue chat
        </div>
      )}
    </div>
  );
}
