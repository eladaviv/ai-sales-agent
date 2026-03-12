"use client";

import { useState, useCallback } from "react";
import type { AppScreen, EnrichmentResult, ChatMessage } from "@/types";
import { IntakeScreen }    from "@/components/intake/IntakeScreen";
import { EnrichingScreen } from "@/components/enrichment/EnrichingScreen";
import { ChatScreen }      from "@/components/chat/ChatScreen";

export default function Home() {
  const [screen, setScreen]   = useState<AppScreen>("intake");
  const [profile, setProfile] = useState<EnrichmentResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleEnrichmentComplete = useCallback((enriched: EnrichmentResult) => {
    setProfile(enriched);
    setScreen("chat");
  }, []);

  const handleIntakeSubmit = useCallback((email: string, name: string) => {
    setScreen("enriching");
    // Store form data so EnrichingScreen can run enrichment
    setProfile({ person: { name, email } } as unknown as EnrichmentResult);
  }, []);

  return (
    <>
      {screen === "intake" && (
        <IntakeScreen onSubmit={handleIntakeSubmit} />
      )}
      {screen === "enriching" && profile && (
        <EnrichingScreen
          email={profile.person.email}
          name={profile.person.name}
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
