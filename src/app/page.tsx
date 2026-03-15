"use client";

import { useState, useCallback } from "react";
import type { AppScreen, EnrichmentResult, ChatMessage, LeadFormData, MondayLeadItem } from "@/types";
import { IntakeScreen }    from "@/components/intake/IntakeScreen";
import { EnrichingScreen } from "@/components/enrichment/EnrichingScreen";
import { ChatScreen }      from "@/components/chat/ChatScreen";

export default function Home() {
  const [screen, setScreen]         = useState<AppScreen>("intake");
  const [form, setForm]             = useState<LeadFormData | null>(null);
  const [mondayItem, setMondayItem] = useState<MondayLeadItem | null>(null);
  const [profile, setProfile]       = useState<EnrichmentResult | null>(null);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);

  const handleIntakeSubmit = useCallback((f: LeadFormData, m: MondayLeadItem) => {
    setForm(f);
    setMondayItem(m);
    setScreen("enriching");
  }, []);

  const handleEnrichmentComplete = useCallback((enriched: EnrichmentResult) => {
    setProfile(enriched);
    setScreen("chat");
  }, []);

  return (
    <>
      {screen === "intake" && (
        <IntakeScreen onSubmit={handleIntakeSubmit} />
      )}
      {screen === "enriching" && form && mondayItem && (
        <EnrichingScreen
          form={form}
          mondayItemId={mondayItem.itemId}
          onComplete={handleEnrichmentComplete}
        />
      )}
      {screen === "chat" && profile && (
        <ChatScreen
          profile={profile}
          messages={messages}
          setMessages={setMessages}
        />
      )}
    </>
  );
}
