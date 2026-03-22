"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Navbar } from "@/components/layout/navbar";
import { ChatView } from "@/components/chat/chat-view";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import type { Connection } from "@/components/dashboard/connections-tab";
import type { ActivityEntry } from "@/components/dashboard/activity-log-tab";

const MOCK_ACTIVITY: ActivityEntry[] = [];

export default function ChatPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hitlEnabled, setHitlEnabled] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [connections, setConnections] = useState<Connection[]>([
    { provider: "google", status: "disconnected", scopes: [] },
    { provider: "slack", status: "disconnected", scopes: [] },
  ]);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    onError: (err) => {
      console.error("useChat onError:", err);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Fetch user profile from Auth0
  useEffect(() => {
    fetch("/auth/profile")
      .then((res) => {
        if (!res.ok) {
          window.location.href = "/auth/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUserName(data.name || data.nickname || "User");
          setUserEmail(data.email || "");
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        window.location.href = "/auth/login";
      });
  }, []);

  // Check connection status
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/connections")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.connections) {
          setConnections(
            data.connections.map((c: any) => ({
              provider: c.provider,
              status: c.status === "connected" ? "connected" : "disconnected",
              scopes: c.scopes || [],
            }))
          );
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text });
  };

  const handleReconnect = (provider: string) => {
    const connectionName = provider === "google" ? "google-oauth2" : "slack";
    window.location.href = `/auth/connect?connection=${connectionName}&returnTo=/chat`;
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
        isPanelOpen={isPanelOpen}
        onNewChat={() => setMessages([])}
        userName={userName}
        userEmail={userEmail}
      />

      <main
        className={`flex-1 transition-all duration-300 ${
          isPanelOpen ? "md:mr-[360px]" : ""
        }`}
      >
        <ChatView
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
        />
      </main>

      <DashboardPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        connections={connections}
        activityLog={MOCK_ACTIVITY}
        hitlEnabled={hitlEnabled}
        onReconnect={handleReconnect}
        onToggleHitl={setHitlEnabled}
      />
    </div>
  );
}
