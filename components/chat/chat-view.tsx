"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageBubble, TypingIndicator } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { ApprovalCard } from "./approval-card";
import type { UIMessage } from "ai";

interface ApprovalData {
  action: string;
  details: Record<string, unknown>;
  message: string;
  status: "pending" | "approved" | "denied";
}

interface ChatViewProps {
  messages: UIMessage[];
  isLoading: boolean;
  messagesLoading?: boolean;
  onSend: (message: string) => void;
  pendingApprovals?: Map<string, ApprovalData>;
  onApprove?: (id: string, editedDetails?: Record<string, unknown>) => void;
  onDeny?: (id: string) => void;
  disabled?: boolean;
}

function getMessageText(msg: UIMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    const text = msg.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
    if (text) return text;
  }
  if ("content" in msg && typeof (msg as any).content === "string") {
    return (msg as any).content;
  }
  return "";
}

// Check if an assistant message contains an approval request
function extractApproval(text: string): { action: string; details: Record<string, unknown>; message: string } | null {
  try {
    // Look for JSON approval blocks in the message
    const match = text.match(/\[APPROVAL_REQUIRED\]([\s\S]*?)\[\/APPROVAL_REQUIRED\]/);
    if (match) {
      return JSON.parse(match[1]);
    }
  } catch {
    // Not an approval message
  }
  return null;
}

export function ChatView({
  messages,
  isLoading,
  onSend,
  pendingApprovals,
  onApprove,
  onDeny,
  messagesLoading,
  disabled,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasScrolledInitially = useRef(false);

  // Auto-scroll to bottom on new messages, loading state changes, and initial load
  useEffect(() => {
    const isInitial = !hasScrolledInitially.current;
    const behavior = isInitial ? "instant" as const : "smooth" as const;

    const scrollToBottom = () => {
      // Belt-and-suspenders: set scrollTop AND scrollIntoView
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior });
      }
    };

    // Scroll immediately and after short delays for DOM/layout updates
    scrollToBottom();
    const t1 = setTimeout(scrollToBottom, 50);
    const t2 = setTimeout(scrollToBottom, 150);
    const t3 = setTimeout(scrollToBottom, 400);

    if (messages.length > 0 || isLoading) {
      hasScrolledInitially.current = true;
    }

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [messages, messages.length, isLoading, messagesLoading]);

  const visibleMessages = messages.filter(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-20 pb-2">
        <div className="max-w-[800px] mx-auto">
          {messagesLoading && visibleMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-muted-foreground text-sm">Loading your conversation...</p>
            </div>
          )}

          {!messagesLoading && visibleMessages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center h-[60vh] text-center"
            >
              <h2 className="font-heading text-2xl font-semibold text-foreground mb-2" style={{ letterSpacing: "-0.02em" }}>
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return "good morning";
                  if (hour < 17) return "good afternoon";
                  return "good evening";
                })()}
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                your email, calendar, and files -- all in one place. what do you need?
              </p>
            </motion.div>
          )}

          {visibleMessages.map((msg) => {
            let text = getMessageText(msg);

            // Hide internal messages from the user
            if (msg.role === "user" && text.startsWith("[INTERNAL:")) {
              return null;
            }

            // Check if this assistant message has an approval
            if (msg.role === "assistant") {
              const approval = extractApproval(text);
              if (approval && pendingApprovals) {
                const approvalId = msg.id;
                const existing = pendingApprovals.get(approvalId);
                const approvalStatus = existing?.status || "pending";

                // Show the text before the approval block
                const cleanText = text
                  .replace(/\[ACTIVITY\][\s\S]*?\[\/ACTIVITY\]/, "")
                  .replace(/\[APPROVAL_REQUIRED\][\s\S]*?\[\/APPROVAL_REQUIRED\]/, "")
                  .trim();

                return (
                  <div key={msg.id}>
                    {cleanText && (
                      <MessageBubble
                        role="assistant"
                        content={cleanText}
                      />
                    )}
                    <ApprovalCard
                      action={approval}
                      status={approvalStatus}
                      onApprove={(editedDetails) => {
                        if (onApprove) {
                          onApprove(approvalId, editedDetails);
                        }
                      }}
                      onDeny={() => {
                        if (onDeny) onDeny(approvalId);
                      }}
                    />
                  </div>
                );
              }

              // Strip ACTIVITY blocks
              text = text.replace(/\[ACTIVITY\][\s\S]*?\[\/ACTIVITY\]/, "").trim();
              // Strip partial ACTIVITY blocks still streaming
              if (text.includes("[ACTIVITY")) {
                text = text.substring(0, text.indexOf("[ACTIVITY")).trim();
              }

              // Strip partial or complete APPROVAL_REQUIRED blocks that are still streaming
              if (text.includes("[APPROVAL_REQUIRED")) {
                text = text.substring(0, text.indexOf("[APPROVAL_REQUIRED")).trim();
              }
            }

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
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} isLoading={isLoading} disabled={disabled} />
    </div>
  );
}
