"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionsTab, type Connection } from "./connections-tab";
import { ActivityLogTab, type ActivityEntry } from "./activity-log-tab";
import { SettingsTab } from "./settings-tab";

interface DashboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connections: Connection[];
  activityLog: ActivityEntry[];
  hitlEnabled: boolean;
  onReconnect: (provider: string) => void;
  onToggleHitl: (enabled: boolean) => void;
}

export function DashboardPanel({
  isOpen,
  onClose,
  connections,
  activityLog,
  hitlEnabled,
  onReconnect,
  onToggleHitl,
}: DashboardPanelProps) {
  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Panel - always mounted, translated off-screen when closed */}
      <aside
        className={`fixed top-0 right-0 h-full w-full md:w-[360px] z-40 glass-card border-l border-border md:border-l-border transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-16 md:pt-14">
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-4 py-3 md:hidden">
            <span className="font-[var(--font-heading)] text-sm font-semibold">
              Dashboard
            </span>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="connections" className="flex-1 flex flex-col">
            <TabsList className="mx-4 bg-background/50 border border-border">
              <TabsTrigger
                value="connections"
                className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                Connections
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
              <TabsContent value="connections" className="mt-0">
                <ConnectionsTab
                  connections={connections}
                  onReconnect={onReconnect}
                />
              </TabsContent>
              <TabsContent value="activity" className="mt-0">
                <ActivityLogTab entries={activityLog} />
              </TabsContent>
              <TabsContent value="settings" className="mt-0">
                <SettingsTab
                  hitlEnabled={hitlEnabled}
                  onToggleHitl={onToggleHitl}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </aside>
    </>
  );
}
