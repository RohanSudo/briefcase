"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Mail, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApprovalAction {
  action: string;
  details: Record<string, unknown>;
  message: string;
}

interface ApprovalCardProps {
  action: ApprovalAction;
  onApprove: () => void;
  onDeny: () => void;
  status?: "pending" | "approved" | "denied";
}

function getActionIcon(action: string) {
  if (action.includes("Email")) return <Mail className="h-3.5 w-3.5" />;
  if (action.includes("Calendar")) return <Calendar className="h-3.5 w-3.5" />;
  if (action.includes("Slack")) return <MessageSquare className="h-3.5 w-3.5" />;
  return <Mail className="h-3.5 w-3.5" />;
}

function ActionDetails({ action, details }: { action: string; details: Record<string, unknown> }) {
  if (action === "sendEmail") {
    return (
      <div className="space-y-2 text-sm">
        <DetailRow label="To" value={details.to as string} />
        <DetailRow label="Subject" value={details.subject as string} />
        <DetailRow label="Body" value={details.body as string} multiline />
      </div>
    );
  }
  if (action === "createCalendarEvent") {
    return (
      <div className="space-y-2 text-sm">
        <DetailRow label="Title" value={details.summary as string} />
        <DetailRow label="When" value={`${details.start} to ${details.end}`} />
        {Array.isArray(details.attendees) && (
          <DetailRow label="Attendees" value={(details.attendees as string[]).join(", ")} />
        )}
      </div>
    );
  }
  if (action === "sendSlackMessage") {
    return (
      <div className="space-y-2 text-sm">
        <DetailRow label="Channel" value={`#${details.channelName}`} />
        <DetailRow label="Message" value={details.text as string} multiline />
      </div>
    );
  }
  return null;
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? "" : "flex gap-2"}>
      <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-muted-foreground shrink-0">
        {label}:
      </span>
      <span className={`text-gray-300 ${multiline ? "block mt-1 pl-0" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function ApprovalCard({ action, onApprove, onDeny, status = "pending" }: ApprovalCardProps) {
  const isPending = status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-start mb-4"
    >
      <div className={`max-w-[85%] ${!isPending ? "opacity-70" : ""}`}>
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 ml-1 block">
          Briefcase
        </span>
        <div className="bg-card border border-[rgba(251,191,36,0.3)] rounded-[16px_16px_16px_4px] p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="text-warning">{getActionIcon(action.action)}</div>
            <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-warning">
              Action Requires Approval
            </span>
          </div>

          {/* Action details */}
          <div className="mb-4 pl-1">
            <ActionDetails action={action.action} details={action.details} />
          </div>

          {/* Buttons or status */}
          {isPending ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDeny}
                className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-lg gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Deny
              </Button>
            </div>
          ) : (
            <Badge
              className={
                status === "approved"
                  ? "bg-success/15 text-success border-0"
                  : "bg-destructive/15 text-destructive border-0"
              }
            >
              {status === "approved" ? "Approved" : "Denied"}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}
