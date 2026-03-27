"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Mail, Calendar, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApprovalAction {
  action: string;
  details: Record<string, unknown>;
  message: string;
}

interface ApprovalCardProps {
  action: ApprovalAction;
  onApprove: (editedDetails?: Record<string, unknown>) => void;
  onDeny: () => void;
  status?: "pending" | "approved" | "denied";
}

function getActionIcon(action: string) {
  if (action.includes("Email")) return <Mail className="h-3.5 w-3.5" />;
  if (action.includes("Calendar")) return <Calendar className="h-3.5 w-3.5" />;
  return <Mail className="h-3.5 w-3.5" />;
}

function EditableDetailRow({
  label,
  value,
  multiline,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  editing: boolean;
  onChange: (val: string) => void;
}) {
  if (editing) {
    return (
      <div>
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-muted-foreground shrink-0">
          {label}:
        </span>
        {multiline ? (
          <textarea
            className="w-full mt-1 bg-background border border-border rounded-md p-2 text-sm text-gray-300 resize-none min-h-[80px]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
          />
        ) : (
          <input
            className="w-full mt-1 bg-background border border-border rounded-md px-2 py-1 text-sm text-gray-300"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    );
  }

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
  const [editing, setEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<Record<string, unknown>>({ ...action.details });

  const updateField = (key: string, value: string) => {
    setEditedDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleApprove = () => {
    onApprove(editing ? editedDetails : undefined);
  };

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
            {isPending && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Edit before sending"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action details */}
          <div className="mb-4 pl-1">
            {action.action === "sendEmail" && (
              <div className="space-y-2 text-sm">
                <EditableDetailRow label="To" value={(editedDetails.to as string) || ""} editing={editing} onChange={(v) => updateField("to", v)} />
                <EditableDetailRow label="Subject" value={(editedDetails.subject as string) || ""} editing={editing} onChange={(v) => updateField("subject", v)} />
                <EditableDetailRow label="Body" value={(editedDetails.body as string) || ""} multiline editing={editing} onChange={(v) => updateField("body", v)} />
              </div>
            )}
            {action.action === "createCalendarEvent" && (
              <div className="space-y-2 text-sm">
                <EditableDetailRow label="Title" value={(editedDetails.summary as string) || ""} editing={editing} onChange={(v) => updateField("summary", v)} />
                <EditableDetailRow label="Start" value={(editedDetails.start as string) || ""} editing={editing} onChange={(v) => updateField("start", v)} />
                <EditableDetailRow label="End" value={(editedDetails.end as string) || ""} editing={editing} onChange={(v) => updateField("end", v)} />
              </div>
            )}
          </div>

          {/* Buttons or status */}
          {isPending ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                {editing ? "Send Edited" : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDeny}
                className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-lg gap-1.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Deny
              </Button>
              {editing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditedDetails({ ...action.details });
                  }}
                  className="rounded-lg gap-1.5 cursor-pointer"
                >
                  Cancel Edit
                </Button>
              )}
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
