"use client";

export default function ChatSidebar() {
  const chatMessages = [
    { name: "Kanciano", message: "Great game!" },
    { name: "Kanciano", message: "Anyone want to play?" },
    { name: "Kanciano", message: "Let's go!" },
    { name: "Kanciano", message: "Nice moves" },
    { name: "Kanciano", message: "GG" },
    { name: "Kanciano", message: "Who's next?" },
    { name: "Kanciano", message: "Amazing!" },
  ];

  return (
    <div className="w-72 bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-6 max-h-screen overflow-y-auto shadow-lg shadow-[#7ACD54]/10">
      <h3 className="text-white font-bold text-sm mb-6 tracking-wide">
        GLOBAL CHAT (300 ACTIVE)
      </h3>
      <div className="space-y-4">
        {chatMessages.map((msg, idx) => (
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
    </div>
  );
}
