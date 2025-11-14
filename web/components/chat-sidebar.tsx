"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { MessagesSquare, Send } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/store/auth";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// Replace with your Supabase credentials
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

interface Message {
  id: number;
  profile_id: string | null;
  username: string;
  text: string;
  created_at: string;
}

interface Profile {
  id: string;
  username?: string;
  wallet_address?: string;
}

export default function ChatSidebar() {
  const { toggleChat, settoggleChat } = useAuth();
  const { authenticated, user } = usePrivy();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get username from Privy user or generate anonymous name
  const getUsername = () => {
    if (!user) return `Guest_${Math.floor(Math.random() * 9999)}`;

    if (user.email?.address) return user.email.address.split("@")[0];
    if (user.twitter?.username) return user.twitter.username;
    if (user.discord?.username) return user.discord.username;
    if (user.wallet?.address)
      return `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(
        -4
      )}`;

    return `User_${Math.floor(Math.random() * 9999)}`;
  };

  const username = getUsername();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages from database
  const loadMessages = async (supabase: ReturnType<typeof createClient>) => {
    try {
      const { data, error } = await supabase
        .from("global_chat")
        .select(
          `
          id,
          profile_id,
          text,
          created_at,
          profile:profile_id (
            id,
            username,
            wallet_key
          )
        `
        )
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      if (data) {
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id,
          profile_id: msg.profile_id,
          username:
            msg.profile?.username || msg.profile?.wallet_key || "Anonymous",
          text: msg.text,
          created_at: msg.created_at,
        }));

        setMessages(formattedMessages);
        console.log("Loaded messages:", formattedMessages.length);
      }
    } catch (error) {
      console.error("Error in loadMessages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Supabase and connect to chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Initialize Supabase client
        if (!supabaseRef.current) {
          supabaseRef.current = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
              params: {
                eventsPerSecond: 10,
              },
            },
          });
        }

        const supabase = supabaseRef.current;

        // Load existing messages
        await loadMessages(supabase);

        // Unsubscribe from previous channel if exists
        if (channelRef.current) {
          await channelRef.current.unsubscribe();
        }

        // Create a channel for global chat with both DB changes and presence
        const channel = supabase
          .channel("global_chat", {
            config: {
              broadcast: { self: true },
              presence: { key: username },
            },
          })
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "global_chat",
            },
            async (payload) => {
              console.log("New message received via realtime:", payload);

              // Fetch the complete message with profile info
              const { data, error } = await supabase
                .from("global_chat")
                .select(
                  `
                  id,
                  profile_id,
                  text,
                  created_at,
                  profile:profile_id (
                    id,
                    username,
                    wallet_key
                  )
                `
                )
                .eq("id", payload.new.id)
                .single();

              if (error) {
                console.error("Error fetching message details:", error);
                return;
              }

              if (data) {
                console.log("Fetched message details:", data);
                const newMessage: Message = {
                  id: data.id,
                  profile_id: data.profile_id,
                  username:
                    data.profile?.username ||
                    data.profile?.wallet_key ||
                    "Anonymous",
                  text: data.text,
                  created_at: data.created_at,
                };

                setMessages((prev) => {
                  // Avoid duplicates
                  if (prev.some((msg) => msg.id === newMessage.id)) {
                    console.log("Message already exists, skipping");
                    return prev;
                  }
                  console.log("Adding new message to state");
                  return [...prev, newMessage];
                });
              }
            }
          )
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            setOnlineCount(count);
            console.log("Online users:", count);
          })
          .on("presence", { event: "join" }, ({ key }) => {
            console.log("User joined:", key);
            const state = channel.presenceState();
            setOnlineCount(Object.keys(state).length);
          })
          .on("presence", { event: "leave" }, ({ key }) => {
            console.log("User left:", key);
            const state = channel.presenceState();
            setOnlineCount(Object.keys(state).length);
          });

        // Subscribe and track presence
        await channel.subscribe(async (status) => {
          console.log("Channel status:", status);

          if (status === "SUBSCRIBED") {
            const presenceKey = authenticated
              ? username
              : `Guest_${Math.random().toString(36).substr(2, 9)}`;
            await channel.track({
              username: presenceKey,
              online_at: new Date().toISOString(),
            });
            setIsConnected(true);
            console.log("Connected to channel as:", presenceKey);
          }

          if (status === "CHANNEL_ERROR") {
            console.error("Channel error, attempting reconnect...");
            setIsConnected(false);
            reconnectTimeoutRef.current = setTimeout(() => {
              initializeChat();
            }, 2000);
          }

          if (status === "TIMED_OUT") {
            console.error("Channel timed out, attempting reconnect...");
            setIsConnected(false);
            reconnectTimeoutRef.current = setTimeout(() => {
              initializeChat();
            }, 2000);
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error("Error initializing chat:", error);
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [authenticated, username]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !supabaseRef.current) return;

    const supabase = supabaseRef.current;

    try {
      let profileId = null;

      // If authenticated, get profile_id from profile table using wallet_address
      if (authenticated && user?.wallet?.address) {
        console.log("Looking up profile for wallet:", user.wallet.address);

        const { data: existingProfile, error: profileError } = await supabase
          .from("profile")
          .select("id, username, wallet_key")
          .eq("wallet_key", user.wallet.address)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        } else if (existingProfile) {
          profileId = existingProfile.id;
          console.log("Found profile:", existingProfile);
        } else {
          console.log("No profile found for wallet:", user.wallet.address);
        }
      }

      console.log("Sending message with profile_id:", profileId);

      // Insert message into database - this will trigger the realtime update
      const { data, error } = await supabase
        .from("global_chat")
        .insert({
          profile_id: profileId,
          text: inputValue.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        return;
      }

      console.log("Message inserted successfully:", data);
      setInputValue("");
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex">
      {!toggleChat && (
        <div className="w-72 bg-[#1a1b24] rounded-lg border-b-4 border-[#7ACD54] p-6 h-[80vh] max-h-[1000px] overflow-y-auto shadow-lg shadow-[#7ACD54]/10 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-sm tracking-wide">
              GLOBAL CHAT
            </h3>
            <div className="flex items-center gap-2">
              {isConnected && (
                <span className="w-2 h-2 bg-[#7ACD54] rounded-full animate-pulse"></span>
              )}
              <span className="text-[#7ACD54] text-xs font-semibold">
                {onlineCount} ACTIVE
              </span>
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto mb-4 chat-scroll">
            {isLoading ? (
              <div className="text-center text-[#7ACD54]/50 text-sm mt-8">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-[#7ACD54]/50 text-sm mt-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="text-[#DDD9C7] text-sm py-2 px-2 border-l-2 border-[#7ACD54] bg-[#0f1017] rounded hover:bg-[#16171f] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#7ACD54] text-xs">
                      {msg.username}
                    </span>
                    <span className="text-[#7ACD54]/50 text-xs">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="break-words">{msg.text}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {authenticated ? (
            <div className="flex gap-2 mt-auto">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!isConnected}
                className="flex-1 bg-[#0f1017] border border-[#7ACD54]/30 rounded px-3 py-2 text-[#DDD9C7] text-sm placeholder-[#7ACD54]/50 focus:outline-none focus:border-[#7ACD54] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !isConnected}
                className="bg-[#7ACD54] hover:bg-[#6ab844] text-[#1a1b24] font-semibold px-3 py-2 h-auto rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </Button>
            </div>
          ) : (
            <div className="text-center text-[#7ACD54]/70 text-sm">
              Please connect Wallet to continue chat
            </div>
          )}
        </div>
      )}
      <div className="">
        <MessagesSquare
          size={24}
          color="black"
          onClick={() => settoggleChat(toggleChat ? false : true)}
          className="bg-[#7ACD54] m-2 h-8 w-8 p-1 rounded-xl mt-3 cursor-pointer"
        />
      </div>
    </div>
  );
}
