"use client";

import type React from "react";
import { useAuth } from "@/store/auth";
import { supabase } from "@/supabase/client";
import { Tables } from "@/supabase/database.types";
import { usePrivy } from "@privy-io/react-auth";
import {
  RealtimeChannel,
  type RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";
import {
  Loader2,
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  profile_id: string | null;
  username: string;
  text: string | null;
  created_at: string;
}

interface SupabaseProfile {
  id: string;
  username?: string | null;
  wallet_key?: string | null;
}

interface GlobalChatRow {
  id: number;
  profile_id: string | null;
  text: string;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
  wallet_key?: string | null;
  profile?: SupabaseProfile | null;
}

const resolveUsername = (
  payload: GlobalChatRow | Tables<"global_chat">
): string => {
  if ("profile" in payload && payload.profile) {
    return (
      payload.profile.username ||
      payload.profile.wallet_key ||
      payload.profile.id.slice(0, 6)
    );
  }

  const displayName =
    "display_name" in payload ? payload.display_name : undefined;
  const walletKey = "wallet_key" in payload ? payload.wallet_key : undefined;

  return (
    payload.username ||
    displayName ||
    walletKey ||
    (payload.profile_id ? `User_${payload.profile_id.slice(0, 4)}` : null) ||
    "Anonymous"
  );
};

const formatMessage = (msg: GlobalChatRow): Message => ({
  id: msg.id,
  profile_id: msg.profile_id,
  username: resolveUsername(msg),
  text: msg.text,
  created_at: msg.created_at,
});

export default function ChatSidebar() {
  const { toggleChat, settoggleChat, profile } = useAuth();
  const { authenticated, user } = usePrivy();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Connecting...");
  const [hasError, setHasError] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const canChat = authenticated && Boolean(profile?.username);
  const presenceKey = user?.wallet?.address ?? "Guest";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load initial messages from database
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("global_chat")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error loading messages:", error);
        setHasError(true);
        setStatusMessage("Failed to load history");
        return;
      }

      if (data) {
        const formattedMessages = (data as GlobalChatRow[]).map(formatMessage);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error in loadMessages:", error);
      setHasError(true);
      setStatusMessage("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePresenceCount = (channel: RealtimeChannel) => {
    const state = channel.presenceState();
    setOnlineCount(Object.keys(state).length);
  };

  // Initialize Supabase and connect to chat
  const initializeChat = useCallback(async () => {
    try {
      setStatusMessage("Connecting...");
      setHasError(false);

      await loadMessages();

      if (channelRef.current) {
        await channelRef.current.unsubscribe();
      }

      const channel = supabase
        .channel("global_chat", {
          config: {
            broadcast: { self: true },
            presence: { key: presenceKey },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "global_chat",
          },
          (payload: RealtimePostgresInsertPayload<Tables<"global_chat">>) => {
            const payloadData = payload.new;
            const newMessage: Message = {
              id: payloadData.id,
              profile_id: payloadData.profile_id,
              username: resolveUsername(payloadData),
              text: payloadData.text,
              created_at: payloadData.created_at,
            };

            setMessages((prev) =>
              prev.some((msg) => msg.id === newMessage.id)
                ? prev
                : [...prev, newMessage]
            );
          }
        )
        .on("presence", { event: "sync" }, () => updatePresenceCount(channel))
        .on("presence", { event: "join" }, () => updatePresenceCount(channel))
        .on("presence", { event: "leave" }, () => updatePresenceCount(channel));

      const scheduleReconnect = () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setStatusMessage("Reconnecting...");
          initializeChat();
        }, 2000);
      };

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            username: presenceKey,
            online_at: new Date().toISOString(),
          });
          setIsConnected(true);
          setStatusMessage("Connected");
          setHasError(false);
        }

        if (status === "CHANNEL_ERROR") {
          setIsConnected(false);
          setHasError(true);
          setStatusMessage("Connection lost");
          scheduleReconnect();
        }

        if (status === "TIMED_OUT") {
          setIsConnected(false);
          setHasError(true);
          setStatusMessage("Timed out");
          scheduleReconnect();
        }
      });

      channelRef.current = channel;
    } catch (error) {
      console.error("Error initializing chat:", error);
      setStatusMessage("Connection failed");
      setHasError(true);
      setIsLoading(false);
    }
  }, [presenceKey, loadMessages]);

  useEffect(() => {
    initializeChat();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [initializeChat]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;
    if (!canChat) {
      setStatusMessage("Username required");
      setHasError(true);
      return;
    }

    try {
      setIsSending(true);

      const { error } = await supabase.from("global_chat").insert({
        profile_id: profile?.id ?? null,
        text: inputValue.trim(),
        username: profile?.username ?? "Anonymous",
      });

      if (error) {
        console.error("Error sending message:", error);
        setStatusMessage("Failed to send");
        setHasError(true);
        return;
      }

      setInputValue("");
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      setStatusMessage("Failed to send");
      setHasError(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={cn(
        "sticky top-0 flex flex-col border-2 border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-all duration-300 ease-in-out h-[calc(100vh-12rem)] rounded-2xl",
        toggleChat ? "w-14" : "w-80"
      )}
    >
      {/* Header */}
      <div className="h-14 border-b border-border/40 flex items-center justify-between px-3 shrink-0">
        {!toggleChat && (
          <div className="flex items-center gap-2 overflow-hidden">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm tracking-wide truncate">
              GLOBAL CHAT
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", toggleChat && "mx-auto")}
          onClick={() => settoggleChat(!toggleChat)}
        >
          {toggleChat ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Online Count (Only visible when open) */}
      {!toggleChat && (
        <div className="px-4 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-primary animate-pulse" : "bg-destructive"
              )}
            />
            <span>{onlineCount} Online</span>
          </div>
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      {!toggleChat ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll min-h-0">
          {isLoading ? (
            <div className="space-y-4 mt-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className={cn(
                    "h-12 rounded-lg animate-pulse bg-muted/50",
                    idx % 2 === 0 ? "w-3/4 mr-auto" : "w-3/4 ml-auto"
                  )}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center space-y-2 text-muted-foreground p-4">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs opacity-70">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.profile_id === profile?.id;
              const showHeader =
                index === 0 ||
                messages[index - 1].username !== msg.username ||
                new Date(msg.created_at).getTime() -
                  new Date(messages[index - 1].created_at).getTime() >
                  60000;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {showHeader && (
                    <span className="text-[10px] text-muted-foreground mb-1 px-1">
                      {msg.username}
                    </span>
                  )}
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-sm wrap-break-word shadow-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-4 gap-4">
          <div className="relative">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1 rounded-full">
              {onlineCount}
            </span>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!toggleChat && (
        <div className="p-3 border-t border-border/40 bg-background/50 shrink-0">
          {canChat ? (
            <div className="flex w-full gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type..."
                disabled={!isConnected || isSending}
                className="flex-1 bg-background border-border/50 focus-visible:ring-primary/50 h-9"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !isConnected || isSending}
                className={cn(
                  "shrink-0 h-9 w-9 transition-all",
                  isSending && "opacity-70"
                )}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="w-full text-center py-2">
              <p className="text-xs text-muted-foreground">
                {authenticated ? "Set username to chat" : "Connect wallet"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
