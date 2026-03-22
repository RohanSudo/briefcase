"use client";

import { motion } from "framer-motion";
import { PanelRight, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  onNewChat: () => void;
  userEmail?: string;
  userName?: string;
}

export function Navbar({
  onTogglePanel,
  isPanelOpen,
  onNewChat,
  userName = "User",
}: NavbarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-navbar fixed top-0 left-0 right-0 z-50 px-6 py-3"
    >
      <div className="flex items-center justify-between max-w-[1400px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-lg font-medium tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
            briefcase
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">New Chat</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePanel}
            className={`text-muted-foreground hover:text-foreground ${
              isPanelOpen ? "text-primary" : ""
            }`}
          >
            <PanelRight className="h-4 w-4" />
          </Button>

          {/* User avatar */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
