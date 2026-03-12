"use client";

import { useState, type KeyboardEvent } from "react";
import { Dot } from "@/components/shared/Atoms";

interface IntakeScreenProps {
  onSubmit: (email: string, name: string) => void;
}

const TRUST_SIGNALS = [
  "Clearbit enrichment",
  "LinkedIn data",
  "ZoomInfo intent",
  "AI-powered chat",
];

export function IntakeScreen({ onSubmit }: IntakeScreenProps) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [focused, setFocused] = useState<"name" | "email" | null>(null);

  const isValid = name.trim().length > 1 && email.includes("@") && email.includes(".");

  function handleSubmit() {
    if (isValid) onSubmit(email.trim(), name.trim());
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && isValid) handleSubmit();
  }

  return (
    <div
      className="screen"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 700px 500px at 65% 0%,   rgba(79,142,247,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 500px 400px at 10% 100%, rgba(0,217,126,0.04)  0%, transparent 60%)
        `,
      }}
    >
      <div className="intake">
        {/* Logo */}
        <div className="intake__logo">
          <div className="intake__logo-mark">m</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>
              monday.com
            </div>
            <div className="label" style={{ marginTop: 2 }}>
              AI Sales Concierge
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="intake__hero">
          <h1>
            Meet Maya.<br />
            <span>She already knows</span><br />
            who you are.
          </h1>
          <p>
            Leave your details. Maya will research your company in seconds, then
            open a personalised chat — already knowing your team size, your
            tech stack, and what you need most.
          </p>
        </div>

        {/* Form */}
        <div className="intake__form">
          {(
            [
              { key: "name",  label: "Your name",  placeholder: "Alex Johnson",     type: "text",  value: name,  setter: setName  },
              { key: "email", label: "Work email",  placeholder: "alex@company.com", type: "email", value: email, setter: setEmail },
            ] as const
          ).map(({ key, label, placeholder, type, value, setter }) => (
            <div key={key}>
              <div
                className={`intake__field-label${focused === key ? " intake__field-label--focused" : ""}`}
              >
                {label}
              </div>
              <input
                type={type}
                value={value}
                placeholder={placeholder}
                className="intake__input"
                onChange={(e) => setter(e.target.value)}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
                onKeyDown={handleKeyDown}
                autoComplete={key === "name" ? "name" : "email"}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`intake__submit${isValid ? " intake__submit--active" : " intake__submit--disabled"}`}
        >
          Start my demo →
        </button>

        {/* Trust signals */}
        <div className="intake__trust">
          {TRUST_SIGNALS.map((signal) => (
            <div key={signal} className="intake__trust-item">
              <Dot color="var(--green)" />
              {signal}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
