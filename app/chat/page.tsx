"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Navbar } from "@/components/layout/navbar";
import { ChatView } from "@/components/chat/chat-view";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import type { Connection } from "@/components/dashboard/connections-tab";
import type { ActivityEntry } from "@/components/dashboard/activity-log-tab";

const MOCK_CONNECTIONS: Connection[] = [
  {
    provider: "google",
    status: "connected",
    scopes: ["gmail.readonly", "gmail.send", "calendar.events.readonly", "calendar.events"],
  },
  {
    provider: "slack",
    status: "connected",
    scopes: ["channels:history", "channels:read", "chat:write", "users:read"],
  },
];

const MOCK_ACTIVITY: ActivityEntry[] = [];

export default function ChatPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hitlEnabled, setHitlEnabled] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  const { messages, sendMessage, setMessages, status } = useChat();

  const isLoading = status === "submitted" || status === "streaming";

  // Fetch user profile from Auth0
  useEffect(() => {
    fetch("/auth/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUserName(data.name || data.nickname || "User");
          setUserEmail(data.email || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text });
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
        connections={MOCK_CONNECTIONS}
        activityLog={MOCK_ACTIVITY}
        hitlEnabled={hitlEnabled}
        onReconnect={(provider) => {
          console.log("Reconnect:", provider);
        }}
        onToggleHitl={setHitlEnabled}
      />
    </div>
  );
}
