"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsTabProps {
  hitlEnabled: boolean;
  onToggleHitl: (enabled: boolean) => void;
}

export function SettingsTab({ hitlEnabled, onToggleHitl }: SettingsTabProps) {
  const [showWarning, setShowWarning] = useState(false);

  const handleToggle = () => {
    if (hitlEnabled) {
      setShowWarning(true);
    } else {
      onToggleHitl(true);
    }
  };

  return (
    <div className="space-y-3">
      <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Agent Settings
      </span>

      {/* HITL Toggle */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <p className="text-sm font-medium text-foreground">
              Require Approval for Actions
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              When enabled, the agent will ask for your permission before sending
              emails, creating events, or posting to Slack.
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 cursor-pointer ${
              hitlEnabled ? "bg-primary" : "bg-zinc-600"
            }`}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-[left] duration-200"
              style={{ left: hitlEnabled ? "calc(100% - 22px)" : "2px" }}
            />
          </button>
        </div>
      </div>

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80"
              onClick={() => setShowWarning(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full relative z-10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <h3 className="font-[var(--font-heading)] text-base font-semibold text-foreground">
                  Disable Approval Requirement?
                </h3>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                The agent will be able to send emails, create calendar events, and
                post to Slack without asking first. All actions will still be
                logged in the Activity tab. You can turn this back on anytime.
              </p>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWarning(false)}
                  className="text-muted-foreground"
                >
                  Keep Enabled
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onToggleHitl(false);
                    setShowWarning(false);
                  }}
                  className="bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                >
                  Disable
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
