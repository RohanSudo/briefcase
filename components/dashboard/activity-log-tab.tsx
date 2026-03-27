"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Calendar, HardDrive, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ActivityEntry {
  id: string;
  toolName: string;
  service: "gmail" | "calendar" | "drive" | "contacts" | "other";
  status: "auto" | "approved" | "denied" | "error";
  details?: Record<string, unknown>;
  createdAt: string;
}

interface ActivityLogTabProps {
  entries: ActivityEntry[];
  onClear?: () => void;
}

const serviceIcons: Record<string, React.ReactNode> = {
  gmail: <Mail className="h-3.5 w-3.5" />,
  calendar: <Calendar className="h-3.5 w-3.5" />,
  drive: <HardDrive className="h-3.5 w-3.5" />,
  contacts: <Users className="h-3.5 w-3.5" />,
  other: <Mail className="h-3.5 w-3.5" />,
};

const statusConfig: Record<string, { label: string; className: string }> = {
  auto: { label: "Auto", className: "bg-zinc-400/15 text-zinc-400" },
  approved: { label: "Approved", className: "bg-success/15 text-success" },
  denied: { label: "Denied", className: "bg-destructive/15 text-destructive" },
  error: { label: "Error", className: "bg-destructive/15 text-destructive" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning" },
};

const filters = ["all", "gmail", "calendar", "drive", "contacts"] as const;

function describeAction(toolName: string, details?: Record<string, unknown>): string {
  switch (toolName) {
    case "checkEmail":
      return `Read ${details?.count || ""} emails`.trim();
    case "sendEmail":
      return `Send email to ${details?.to || "..."}`;
    case "getCalendarEvents":
      return `Read ${details?.count || ""} calendar events`.trim();
    case "createCalendarEvent":
      return `Create event: ${details?.summary || "..."}`;
    case "searchDrive":
      return `Search Drive for "${details?.query || "..."}"`;
    case "listRecentFiles":
      return "List recent Drive files";
    case "searchContacts":
      return `Search contacts for "${details?.query || "..."}"`;
    default:
      return toolName;
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityLogTab({ entries, onClear }: ActivityLogTabProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.service === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Recent Activity
        </span>
        {entries.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[11px] capitalize transition-colors ${
              filter === f
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="space-y-0">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity yet
          </p>
        )}
        {filtered.map((entry, i) => {
          const status = statusConfig[entry.status] || statusConfig.auto;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <div className="flex items-start gap-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                  {serviceIcons[entry.service]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {describeAction(entry.toolName, entry.details)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`${status.className} border-0 text-[9px] px-1.5 py-0`}>
                      {status.label}
                    </Badge>
                    <span className="text-[10px] text-zinc-600">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              {i < filtered.length - 1 && <div className="divider-gradient" />}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
