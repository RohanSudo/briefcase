"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { PanelRight, Plus, LogOut, ChevronDown } from "lucide-react";
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
  userEmail = "",
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

          {/* User dropdown */}
          <div className="relative ml-2 pl-2 border-l border-border" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  )}
                </div>
                <a
                  href="/auth/logout"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
