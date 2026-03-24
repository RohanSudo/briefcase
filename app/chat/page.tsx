"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Navbar } from "@/components/layout/navbar";
import { ChatView } from "@/components/chat/chat-view";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import type { Connection } from "@/components/dashboard/connections-tab";
import type { ActivityEntry } from "@/components/dashboard/activity-log-tab";

export default function ChatPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hitlEnabled, setHitlEnabled] = useState(true);

  // Load saved HITL preference after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("hitl");
    if (saved !== null) {
      setHitlEnabled(saved === "1");
    }
  }, []);
  const [pendingApprovals, setPendingApprovals] = useState<Map<string, { action: string; details: Record<string, unknown>; message: string; status: "pending" | "approved" | "denied" }>>(new Map());
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
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

  // Sync hitlEnabled to cookie (server) and localStorage (persistence)
  useEffect(() => {
    document.cookie = `hitl=${hitlEnabled ? "1" : "0"}; path=/; SameSite=Lax`;
    localStorage.setItem("hitl", hitlEnabled ? "1" : "0");
  }, [hitlEnabled]);

  const isLoading = status === "submitted" || status === "streaming";

  // Watch for approval blocks in messages and register them
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const text = msg.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "";
      const match = text.match(/\[APPROVAL_REQUIRED\]([\s\S]*?)\[\/APPROVAL_REQUIRED\]/);
      if (match && !pendingApprovals.has(msg.id)) {
        try {
          const data = JSON.parse(match[1]);
          setPendingApprovals((prev) => {
            const next = new Map(prev);
            next.set(msg.id, { ...data, status: "pending" });
            return next;
          });
        } catch { /* not valid json */ }
      }
    }
  }, [messages, pendingApprovals]);

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

  const handleApprove = async (approvalId: string) => {
    const approval = pendingApprovals.get(approvalId);
    if (!approval) return;
    setPendingApprovals((prev) => {
      const next = new Map(prev);
      next.set(approvalId, { ...approval, status: "approved" });
      return next;
    });
    // Execute the action
    try {
      const res = await fetch("/api/chat/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approval.action, details: approval.details }),
      });
      const result = await res.json();
      // Add activity log entry
      setActivityLog((prev) => [
        {
          id: Date.now().toString(),
          toolName: approval.action === "sendEmail" ? "Sent email" : approval.action === "createCalendarEvent" ? "Created event" : "Sent Slack message",
          service: (approval.action.includes("Email") ? "gmail" : approval.action.includes("Calendar") ? "calendar" : "slack") as "gmail" | "calendar" | "slack",
          createdAt: new Date().toISOString(),
          status: result.error ? "error" as const : "approved" as const,
          details: { message: approval.message },
        },
        ...prev,
      ]);
      // Add a confirmation message without re-triggering the AI tool loop
      if (result.error) {
        sendMessage({ text: `Error executing the action: ${result.error}` });
      } else {
        sendMessage({ text: "[INTERNAL: The user approved the action. The action has already been executed. Simply confirm that it was done successfully. Do NOT call any tools.]" });
      }
    } catch {
      sendMessage({ text: "[INTERNAL: There was an error executing the approved action. Let the user know something went wrong. Do NOT call any tools.]" });
    }
  };

  const handleDeny = (approvalId: string) => {
    const approval = pendingApprovals.get(approvalId);
    if (!approval) return;
    setPendingApprovals((prev) => {
      const next = new Map(prev);
      next.set(approvalId, { ...approval, status: "denied" });
      return next;
    });
    setActivityLog((prev) => [
      {
        id: Date.now().toString(),
        toolName: approval.action === "sendEmail" ? "Email blocked" : approval.action === "createCalendarEvent" ? "Event blocked" : "Slack message blocked",
        service: (approval.action.includes("Email") ? "gmail" : approval.action.includes("Calendar") ? "calendar" : "slack") as "gmail" | "calendar" | "slack",
        createdAt: new Date().toISOString(),
        status: "denied" as const,
        details: { message: approval.message },
      },
      ...prev,
    ]);
    sendMessage({ text: "I denied the action. Don't proceed with it." });
  };

  const handleReconnect = (provider: string) => {
    const connectionName = provider === "google" ? "google-oauth2" : "sign-in-with-slack";
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
          pendingApprovals={pendingApprovals}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      </main>

      <DashboardPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        connections={connections}
        activityLog={activityLog}
        hitlEnabled={hitlEnabled}
        onReconnect={handleReconnect}
        onToggleHitl={setHitlEnabled}
      />
    </div>
  );
}
