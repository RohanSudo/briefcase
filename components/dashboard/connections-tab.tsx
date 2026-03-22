"use client";

import { motion } from "framer-motion";
import { Mail, Calendar, MessageSquare, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface Connection {
  provider: "google" | "slack";
  status: "connected" | "disconnected" | "expiring";
  scopes: string[];
  expiresIn?: string;
}

interface ConnectionsTabProps {
  connections: Connection[];
  onReconnect: (provider: string) => void;
}

const providerConfig = {
  google: {
    label: "Google",
    subtitle: "Gmail & Calendar",
    icon: <Mail className="h-4 w-4" />,
    scopeLabels: {
      "gmail.readonly": "Read emails",
      "gmail.send": "Send emails",
      "calendar.events.readonly": "Read calendar",
      "calendar.events": "Create events",
    } as Record<string, string>,
  },
  slack: {
    label: "Slack",
    subtitle: "Workspace",
    icon: <MessageSquare className="h-4 w-4" />,
    scopeLabels: {
      "channels:history": "Read messages",
      "channels:read": "List channels",
      "chat:write": "Post messages",
      "users:read": "View users",
    } as Record<string, string>,
  },
};

const statusConfig = {
  connected: { label: "Connected", className: "bg-success/15 text-success" },
  disconnected: { label: "Disconnected", className: "bg-destructive/15 text-destructive" },
  expiring: { label: "Expiring Soon", className: "bg-warning/15 text-warning" },
};

export function ConnectionsTab({ connections, onReconnect }: ConnectionsTabProps) {
  return (
    <div className="space-y-3">
      <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Connected Services
      </span>

      {connections.map((conn, i) => {
        const config = providerConfig[conn.provider];
        const status = statusConfig[conn.status];

        return (
          <motion.div
            key={conn.provider}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="text-primary">{config.icon}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{config.label}</p>
                  <p className="text-[11px] text-muted-foreground">{config.subtitle}</p>
                </div>
              </div>
              <Badge className={`${status.className} border-0 text-[10px]`}>
                {status.label}
              </Badge>
            </div>

            {/* Scopes */}
            <div className="mt-2 mb-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {conn.scopes
                  .map((s) => {
                    const short = s.split("/").pop() || s;
                    return config.scopeLabels[short] || short;
                  })
                  .join(", ")}
              </p>
            </div>

            {/* Expiry warning */}
            {conn.status === "expiring" && conn.expiresIn && (
              <p className="text-[11px] text-warning mb-2">
                Connection expires in ~{conn.expiresIn}
              </p>
            )}

            {/* Reconnect button */}
            {conn.status !== "connected" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReconnect(conn.provider)}
                className="text-primary hover:text-primary/80 gap-1.5 h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Reconnect
              </Button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
