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

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-20 pb-4">
        <div className="max-w-[800px] mx-auto">
          {messages.length === 0 && (
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

          {messages
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => {
              // Extract text content from parts
              const textContent = msg.parts
                .filter((part): part is { type: "text"; text: string } => part.type === "text")
                .map((part) => part.text)
                .join("");

              if (!textContent && msg.role === "assistant") return null;

              return (
                <MessageBubble
                  key={msg.id}
                  role={msg.role as "user" | "assistant"}
                  content={textContent}
                />
              );
            })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <TypingIndicator />
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}
