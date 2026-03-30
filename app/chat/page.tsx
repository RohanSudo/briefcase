"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { Navbar } from "@/components/layout/navbar";
import { ChatView } from "@/components/chat/chat-view";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import type { Connection } from "@/components/dashboard/connections-tab";
import type { ActivityEntry } from "@/components/dashboard/activity-log-tab";

export default function ChatPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hitlEnabled, setHitlEnabled] = useState(true);

  // Load saved HITL preference from DB
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hitlEnabled !== undefined) {
          setHitlEnabled(data.hitlEnabled);
        }
      })
      .catch(() => {});
  }, []);
  const [pendingApprovals, setPendingApprovals] = useState<Map<string, { action: string; details: Record<string, unknown>; message: string; status: "pending" | "approved" | "denied" }>>(new Map());
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [connections, setConnections] = useState<Connection[]>([
    { provider: "google", status: "disconnected", scopes: [] },
  ]);
  const isGoogleConnected = connections.some(
    (c) => c.provider === "google" && c.status === "connected"
  );

  const [conversationId] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("conversationId");
      if (saved) return saved;
      const id = crypto.randomUUID();
      localStorage.setItem("conversationId", id);
      return id;
    }
    return "default";
  });

  const { messages, sendMessage, setMessages, status, error } = useChat({
    onError: (err) => {
      console.error("useChat onError:", err);
    },
  });

  // Load saved messages on mount
  const messagesLoadedRef = React.useRef(false);
  useEffect(() => {
    if (!isAuthenticated || messagesLoadedRef.current) return;
    messagesLoadedRef.current = true;
    fetch(`/api/messages?conversationId=${conversationId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Array<{ id: number; role: string; content: string; created_at: string }>) => {
        if (rows.length > 0) {
          const restored = rows
            .filter((r) => !r.content.startsWith("[INTERNAL"))
            .map((r) => ({
              id: String(r.id),
              role: r.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: r.content }],
              createdAt: new Date(r.created_at),
            }));
          if (restored.length > 0) {
            setMessages(restored);
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated, conversationId, setMessages]);

  // Save messages to DB when they change
  const savedCountRef = React.useRef(0);
  useEffect(() => {
    if (!isAuthenticated || messages.length === 0) return;
    // Only save new messages (beyond what we've already saved)
    const newMessages = messages.slice(savedCountRef.current);
    for (const msg of newMessages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const text = msg.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "";
      if (!text || text.startsWith("[INTERNAL")) continue;
      // Only save completed messages (not streaming)
      if (msg.role === "assistant" && status === "streaming") continue;
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, role: msg.role, content: text }),
      }).catch(() => {});
    }
    if (status !== "streaming") {
      savedCountRef.current = messages.length;
    }
  }, [messages, status, isAuthenticated, conversationId]);

  const isLoading = status === "submitted" || status === "streaming";

  // Watch for approval blocks and activity blocks in messages
  const processedActivityIdsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const text = msg.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "";

      // Parse approval blocks
      const approvalMatch = text.match(/\[APPROVAL_REQUIRED\]([\s\S]*?)\[\/APPROVAL_REQUIRED\]/);
      if (approvalMatch && !pendingApprovals.has(msg.id)) {
        try {
          const data = JSON.parse(approvalMatch[1]);
          setPendingApprovals((prev) => {
            const next = new Map(prev);
            next.set(msg.id, { ...data, status: "pending" });
            return next;
          });
        } catch { /* not valid json */ }
      }

      // Parse activity blocks (use ref to avoid re-render loop)
      const activityMatch = text.match(/\[ACTIVITY\]([\s\S]*?)\[\/ACTIVITY\]/);
      if (activityMatch && !processedActivityIdsRef.current.has(msg.id)) {
        try {
          const entries = JSON.parse(activityMatch[1]) as Array<{
            toolName: string;
            service: string;
            status: string;
            details?: Record<string, unknown>;
          }>;
          processedActivityIdsRef.current.add(msg.id);
          setActivityLog((prev) => [
            ...entries.map((e, i) => ({
              id: `${msg.id}-${i}`,
              toolName: e.toolName,
              service: e.service as "gmail" | "calendar",
              status: e.status as "auto" | "approved" | "denied" | "error",
              details: e.details,
              createdAt: new Date().toISOString(),
            })),
            ...prev,
          ]);
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

  // Check connection status on load
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

  // Fetch activity log from DB
  const fetchActivity = useCallback(() => {
    if (!isAuthenticated) return;
    fetch("/api/activity")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setActivityLog(data.map((d: Record<string, unknown>) => ({
            id: String(d.id),
            toolName: d.tool_name as string,
            service: d.service as "gmail" | "calendar" | "drive" | "contacts" | "other",
            status: d.status as "auto" | "approved" | "denied" | "error",
            details: (typeof d.details === "string" ? JSON.parse(d.details) : d.details) as Record<string, unknown>,
            createdAt: d.created_at as string,
          })));
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Poll activity log every 10 seconds
  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 10000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Also refresh activity when streaming finishes (a tool call just completed)
  const prevStatusRef = React.useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && status === "ready") {
      // Short delay so the server has time to commit the activity row
      const t = setTimeout(fetchActivity, 1000);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = status;
  }, [status, fetchActivity]);

  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check if user is confirming a pending approval
    const confirmWords = /^(send|ok|do it|yes|go ahead|approve|confirmed|send it|go|yep|yeah|sure)\.?$/i;
    if (confirmWords.test(text.trim())) {
      // Find the most recent pending approval
      const pendingEntries = Array.from(pendingApprovals.entries()).filter(
        ([, v]) => v.status === "pending"
      );
      if (pendingEntries.length > 0) {
        const [approvalId] = pendingEntries[pendingEntries.length - 1];
        handleApprove(approvalId);
        return;
      }
    }

    sendMessage({ text });
  };

  const handleApprove = async (approvalId: string, editedDetails?: Record<string, unknown>) => {
    const approval = pendingApprovals.get(approvalId);
    if (!approval) return;
    const finalDetails = editedDetails || approval.details;
    setPendingApprovals((prev) => {
      const next = new Map(prev);
      next.set(approvalId, { ...approval, details: finalDetails, status: "approved" });
      return next;
    });
    // Execute the action
    try {
      const res = await fetch("/api/chat/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approval.action, details: finalDetails }),
      });
      const result = await res.json();
      // Add activity log entry
      setActivityLog((prev) => [
        {
          id: Date.now().toString(),
          toolName: approval.action === "sendEmail" ? "Sent email" : "Created event",
          service: (approval.action.includes("Email") ? "gmail" : "calendar") as "gmail" | "calendar",
          createdAt: new Date().toISOString(),
          status: result.error ? "error" as const : "approved" as const,
          details: { message: approval.message },
        },
        ...prev,
      ]);
      // Refresh activity from DB
      fetchActivity();
      // Add a confirmation message without re-triggering the AI tool loop
      if (result.error) {
        sendMessage({ text: `[INTERNAL: Error executing the action: ${result.error}. Tell the user something went wrong. Do NOT call any tools.]` });
      } else {
        sendMessage({ text: "[INTERNAL: The user approved the action and it has been executed successfully. Confirm to the user that it's done. Do NOT call any tools. Do NOT try to send the email again.]" });
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
        toolName: approval.action === "sendEmail" ? "Email blocked" : "Event blocked",
        service: (approval.action.includes("Email") ? "gmail" : "calendar") as "gmail" | "calendar",
        createdAt: new Date().toISOString(),
        status: "denied" as const,
        details: { message: approval.message },
      },
      ...prev,
    ]);
    sendMessage({ text: "I denied the action. Don't proceed with it." });
  };

  const handleReconnect = (provider: string) => {
    const connectionName = "google-oauth2";
    window.location.href = `/auth/connect?connection=${connectionName}&returnTo=/chat`;
  };

  const handleDisconnect = (provider: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === provider ? { ...c, status: "disconnected" as const, scopes: [] } : c
      )
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
        isPanelOpen={isPanelOpen}
        onNewChat={() => {
          setMessages([]);
          savedCountRef.current = 0;
          // Clear DB messages for this conversation
          fetch(`/api/messages?conversationId=${conversationId}`, { method: "DELETE" }).catch(() => {});
          // Generate new conversation ID
          const newId = crypto.randomUUID();
          localStorage.setItem("conversationId", newId);
          window.location.reload();
        }}
        userName={userName}
        userEmail={userEmail}
      />

      <main
        className={`flex-1 relative transition-all duration-300 ${
          isPanelOpen ? "md:mr-[360px]" : ""
        }`}
      >
        {!isGoogleConnected && (
          <div className="absolute top-16 left-0 right-0 z-10 px-4 pt-4" style={{ pointerEvents: "auto" }}>
            <div className="max-w-[800px] mx-auto">
              <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">🔗</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary mb-1">Connect your Google services</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You signed in with Google, but Briefcase also needs permission to access Gmail, Calendar, Drive &amp; Contacts. This is a separate one-time step.
                  </p>
                </div>
                <button
                  onClick={() => handleReconnect("google")}
                  className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Connect →
                </button>
              </div>
            </div>
          </div>
        )}
        <ChatView
          messages={messages}
          isLoading={isLoading}
          messagesLoading={!messagesLoadedRef.current}
          onSend={handleSend}
          pendingApprovals={pendingApprovals}
          onApprove={handleApprove}
          onDeny={handleDeny}
          disabled={!isGoogleConnected}
        />
      </main>

      <DashboardPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        connections={connections}
        activityLog={activityLog}
        onClearActivity={() => {
          fetch("/api/activity/clear", { method: "DELETE" })
            .then(() => setActivityLog([]))
            .catch(() => {});
        }}
        hitlEnabled={hitlEnabled}
        onReconnect={handleReconnect}
        onDisconnect={handleDisconnect}
        onToggleHitl={(enabled) => {
          setHitlEnabled(enabled);
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hitlEnabled: enabled }),
          }).catch(() => {});
        }}
      />
    </div>
  );
}
