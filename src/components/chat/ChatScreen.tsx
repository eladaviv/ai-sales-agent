"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ChatMessage, EnrichmentResult, N8nEvent, ChatResponse, RawMessage } from "@/types";
import { QUICK_REPLIES } from "@/constants";
import { ChatSidebar }   from "./ChatSidebar";
import { MessageBubble } from "./MessageBubble";
import { Spinner }       from "@/components/shared/Atoms";

// ─── Stage detection ──────────────────────────────────────────────────────────
function detectStage(messages: ChatMessage[]): number {
  if (messages.some((m) => m.paymentTrigger)) return 4;
  if (messages.some((m) => m.boardConfig))    return 3;
  if (messages.some((m) => m.callNotes))      return 2;
  if (messages.length >= 4)                   return 1;
  return 0;
}

// ─── n8n event helper ─────────────────────────────────────────────────────────
function makeN8nEvent(icon: string, label: string, detail: string, color: string): N8nEvent {
  return {
    icon, label, detail, color,
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ─── Opening message ──────────────────────────────────────────────────────────
function buildOpeningMessage(profile: EnrichmentResult): ChatMessage {
  const { person, company, intent } = profile;
  const firstName = person.name.split(" ")[0];
  const tool = intent.techStack[0] ?? "your current tools";

  return {
    id:        "opening",
    role:      "assistant",
    content:
      `Hey ${firstName}! 👋 I'm Maya from monday.com. ` +
      `I can see you're at ${company.name} — ${company.employees} people in ${company.industry}. ` +
      `A lot of ${company.industry} teams come to us when ${tool} stops scaling with them. ` +
      `What's the main challenge your team is running into right now?`,
    timestamp: new Date(),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ChatScreenProps {
  profile:     EnrichmentResult;
  messages:    ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

export function ChatScreen({ profile, messages, setMessages }: ChatScreenProps) {
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [n8nEvents, setN8nEvents] = useState<N8nEvent[]>([
    makeN8nEvent("🎯", "lead-captured", `${profile.company.name} enriched`, "var(--blue)"),
  ]);

  // ── rawHistory stores the FULL Anthropic message format including tool turns.
  // This is what gets sent to the API each time — NOT the display messages.
  // Without this, Claude forgets it already called save_call_notes and loops.
  const rawHistory = useRef<RawMessage[]>([]);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasOpened   = useRef(false);

  const firstName    = profile.person.name.split(" ")[0];
  const currentStage = detectStage(messages);
  const quickReplies = QUICK_REPLIES[currentStage] ?? [];

  // ── Inject opening message once ────────────────────────────────────────────
  useEffect(() => {
    if (hasOpened.current || messages.length > 0) return;
    hasOpened.current = true;
    const opening = buildOpeningMessage(profile);
    setMessages([opening]);
    // Seed raw history with the assistant's opening turn
    rawHistory.current = [{ role: "assistant", content: opening.content }];
  }, [profile, messages.length, setMessages]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Textarea auto-resize ──────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }, [input]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      // 1. Add user message to display
      const userMsg: ChatMessage = {
        id:        `user-${Date.now()}`,
        role:      "user",
        content:   trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      // 2. Append user message to raw history
      rawHistory.current = [...rawHistory.current, { role: "user", content: trimmed }];

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            // Send full raw history — includes prior tool_use and tool_result turns
            rawHistory: rawHistory.current,
            profile,
          }),
        });

        const data: ChatResponse & { rawHistoryAppend?: RawMessage[] } = await res.json();

        // 3. Append ALL new raw turns from the API (text + tool_use + tool_result turns)
        if (data.rawHistoryAppend?.length) {
          rawHistory.current = [...rawHistory.current, ...data.rawHistoryAppend];
        }

        // 4. Add agent display message
        const agentMsg: ChatMessage = {
          id:             `agent-${Date.now()}`,
          role:           "assistant",
          content:        data.text,
          timestamp:      new Date(),
          boardConfig:    data.boardConfig,
          paymentTrigger: data.paymentTrigger,
          callNotes:      data.callNotes,
          mondayResult:   data.mondayResult,
        };
        setMessages((prev) => [...prev, agentMsg]);

        // 5. n8n event log
        if (data.callNotes) {
          setN8nEvents((prev) => [
            ...prev,
            makeN8nEvent("📋", "call-notes-saved", "CRM updated", "var(--green)"),
          ]);
        }
        if (data.boardConfig) {
          setN8nEvents((prev) => [
            ...prev,
            makeN8nEvent(
              "🏗",
              data.mondayResult?.success ? "board-created → monday.com" : "board-created (preview)",
              data.boardConfig!.boardName,
              "var(--blue)",
            ),
          ]);
        }
        if (data.paymentTrigger) {
          setN8nEvents((prev) => [
            ...prev,
            makeN8nEvent("💳", "payment-email", `Stripe link → ${data.paymentTrigger!.email}`, "var(--amber)"),
          ]);
        }
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            id:        `err-${Date.now()}`,
            role:      "assistant",
            content:   "Sorry, I hit a snag — could you repeat that?",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, profile, setMessages],
  );

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="screen screen--chat">
      <div className="chat-layout">
        {/* ── Sidebar ── */}
        <ChatSidebar
          profile={profile}
          currentStage={currentStage}
          n8nEvents={n8nEvents}
        />

        {/* ── Main chat ── */}
        <div className="chat-main">
          {/* Header */}
          <div className="chat-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                Maya · AI Sales Concierge
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <div className="dot dot--pulse" style={{ background: "var(--green)" }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--green)" }}>
                  Online
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="tag tag--green">Score {profile.meta.leadScore}/100</span>
              <span className="tag tag--blue">{profile.recommendation.plan} plan</span>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} name={firstName} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="message">
                <div className="message__avatar message__avatar--agent">✨</div>
                <div className="message__body">
                  <div className="message__label message__label--agent">Maya</div>
                  <div className="message__bubble message__bubble--agent typing-indicator">
                    <span className="typing-indicator__dot" />
                    <span className="typing-indicator__dot" />
                    <span className="typing-indicator__dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {!loading && quickReplies.length > 0 && messages.length <= currentStage * 2 + 2 && (
            <div className="quick-replies">
              {quickReplies.map((reply) => (
                <button key={reply} className="quick-reply-btn" onClick={() => sendMessage(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-box">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                placeholder="Type a message…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className={`chat-send-btn${input.trim() && !loading ? " chat-send-btn--active" : " chat-send-btn--disabled"}`}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
              >
                {loading ? <Spinner size={16} /> : "↑"}
              </button>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>
              Enter to send · Shift+Enter for new line · Powered by Claude + monday.com API
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
