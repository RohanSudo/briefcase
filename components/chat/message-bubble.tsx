"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {!isUser && (
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 ml-1">
            Briefcase
          </span>
        )}
        <div
          className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-[#0e7490] text-cyan-50 rounded-[16px_16px_4px_16px]"
              : "bg-card border border-border text-gray-300 rounded-[16px_16px_16px_4px]"
          }`}
        >
          {isUser ? (
            content
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
                li: ({ children }) => <li>{children}</li>,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
        {timestamp && (
          <span className="text-[10px] text-zinc-600 mt-1 px-1">{timestamp}</span>
        )}
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start mb-4"
    >
      <div className="flex flex-col items-start">
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 ml-1">
          Briefcase
        </span>
        <div className="bg-card border border-border rounded-[16px_16px_16px_4px] px-4 py-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-zinc-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
