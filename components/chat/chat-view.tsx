"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageBubble, TypingIndicator } from "./message-bubble";
import { ChatInput } from "./chat-input";
import type { UIMessage } from "ai";

interface ChatViewProps {
  messages: UIMessage[];
  isLoading: boolean;
  onSend: (message: string) => void;
}

function getMessageText(msg: UIMessage): string {
  // Try parts first (AI SDK v6 format)
  if (msg.parts && msg.parts.length > 0) {
    const text = msg.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
    if (text) return text;
  }
  // Fallback to content field if it exists
  if ("content" in msg && typeof (msg as any).content === "string") {
    return (msg as any).content;
  }
  return "";
}

export function ChatView({
  messages,
  isLoading,
  onSend,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const visibleMessages = messages.filter(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-20 pb-2">
        <div className="max-w-[800px] mx-auto">
          {visibleMessages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center h-[60vh] text-center"
            >
              <h2 className="font-heading text-2xl font-semibold text-foreground mb-2" style={{ letterSpacing: "-0.02em" }}>
                good morning
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                I can check your email, calendar, and Slack. Ask me anything
                about your day.
              </p>
            </motion.div>
          )}

          {visibleMessages.map((msg) => {
            const text = getMessageText(msg);
            return (
              <MessageBubble
                key={msg.id}
                role={msg.role as "user" | "assistant"}
                content={text || (msg.role === "assistant" ? "..." : "")}
              />
            );
          })}

          {isLoading && visibleMessages[visibleMessages.length - 1]?.role === "user" && (
            <TypingIndicator />
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}
