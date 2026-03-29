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
          <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5 ml-1" style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>
            Briefcase
          </span>
        )}
        <div
          className={`px-4 py-3 text-[15px] leading-[1.7] whitespace-pre-wrap font-normal ${
            isUser
              ? "bg-linear-to-br from-[#0e7490] to-[#0891b2] text-cyan-50 rounded-[20px_20px_6px_20px]"
              : "bg-card border border-border border-l-2 border-l-cyan-500/40 text-gray-200 rounded-[20px_20px_20px_6px]"
          }`}
        >
          {isUser ? (
            content
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-[1.7]">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-3 last:mb-0 space-y-1">{children}</ul>,
                li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
                code: ({ children }) => <code className="text-sm break-all whitespace-pre-wrap">{children}</code>,
                pre: ({ children }) => <pre className="overflow-x-auto whitespace-pre-wrap break-words">{children}</pre>,
                hr: () => <hr className="border-border my-3" />,
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
        <div className="bg-card border border-border border-l-2 border-l-cyan-500/40 rounded-[20px_20px_20px_6px] px-4 py-3 flex gap-1.5">
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
