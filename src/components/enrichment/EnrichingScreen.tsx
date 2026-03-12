"use client";

import { useState, useEffect } from "react";
import type { EnrichmentResult } from "@/types";
import { ENRICHMENT_STEPS } from "@/constants";
import { Spinner, Label, Divider } from "@/components/shared/Atoms";

interface EnrichingScreenProps {
  email:      string;
  name:       string;
  onComplete: (profile: EnrichmentResult) => void;
}

export function EnrichingScreen({ email, name, onComplete }: EnrichingScreenProps) {
  const [doneSteps, setDoneSteps]     = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep]   = useState<string>(ENRICHMENT_STEPS[0].id);
  const [profile, setProfile]         = useState<EnrichmentResult | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const domain = email.split("@")[1] ?? "company.com";

  useEffect(() => {
    // Start enrichment API call immediately
    fetch("/api/enrich", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, name }),
    })
      .then((r) => r.json())
      .then((data: EnrichmentResult) => setProfile(data))
      .catch(console.error);

    // Animate steps independently of API (UI feel)
    ENRICHMENT_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setActiveStep(step.id);
        setTimeout(() => {
          setDoneSteps((prev) => new Set([...prev, step.id]));
        }, 450);
      }, step.delayMs);
    });

    // Show profile card after all steps animate
    const lastDelay = ENRICHMENT_STEPS[ENRICHMENT_STEPS.length - 1].delayMs + 900;
    setTimeout(() => setShowProfile(true), lastDelay);
  }, [email, name]);

  // Advance once profile is loaded AND animation finished
  useEffect(() => {
    if (!showProfile || !profile) return;
    const t = setTimeout(() => onComplete(profile), 600);
    return () => clearTimeout(t);
  }, [showProfile, profile, onComplete]);

  return (
    <div
      className="screen"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 600px 400px at 50% 50%, rgba(79,142,247,0.06) 0%, transparent 70%)",
      }}
    >
      <div className="enriching">
        {/* Header */}
        <div className="enriching__header">
          <Label variant="blue" style={{ marginBottom: 12 }}>
            Enrichment Pipeline
          </Label>
          <h2>Researching {domain}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
            Maya will know exactly who she&apos;s talking to
          </p>
        </div>

        {/* Steps */}
        <div className="enriching__steps">
          {ENRICHMENT_STEPS.map((step, i) => {
            const isDone    = doneSteps.has(step.id);
            const isActive  = activeStep === step.id && !isDone;
            const isPending = !isDone && !isActive;

            return (
              <div
                key={step.id}
                className={`enriching__step${
                  isDone    ? " enriching__step--done"    :
                  isActive  ? " enriching__step--active"  :
                  " enriching__step--pending"
                }`}
              >
                {/* Icon */}
                <div
                  className="enriching__step-icon"
                  style={
                    isDone
                      ? { background: `${step.color}15`, borderColor: `${step.color}40` }
                      : {}
                  }
                >
                  {isDone ? (
                    <span style={{ color: step.color, fontSize: 13 }}>✓</span>
                  ) : isActive ? (
                    <Spinner size={16} color={step.color} />
                  ) : (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className={`enriching__step-name${isDone ? " enriching__step-name--done" : ""}`}
                  >
                    {step.label}
                  </div>
                  <div
                    className="enriching__step-detail"
                    style={{ color: isDone ? step.color : undefined }}
                  >
                    {step.detail}
                  </div>

                  {/* Progress bar when active */}
                  {isActive && (
                    <div className="enriching__progress-bar" style={{ marginTop: 6 }}>
                      <div
                        className="enriching__progress-fill"
                        style={{ background: step.color }}
                      />
                    </div>
                  )}
                </div>

                {/* Done badge */}
                {isDone && profile && step.id === "hunter" && (
                  <span className="tag tag--green">{profile.meta.emailScore}/100</span>
                )}
                {isDone && profile && step.id === "scoring" && (
                  <span className="tag tag--blue">{profile.meta.leadScore}/100</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Profile reveal */}
        {showProfile && profile && (
          <div
            className="panel panel--green"
            style={{ padding: 16, animation: "fadeUp 0.4s ease" }}
          >
            <Label variant="green" style={{ marginBottom: 10 }}>
              Enrichment Complete
            </Label>

            <div
              style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr",
                gap:                 10,
              }}
            >
              {[
                ["Person",     `${profile.person.name} · ${profile.person.title}`],
                ["Company",    `${profile.company.name} · ${profile.company.employees} employees`],
                ["Industry",   profile.company.industry],
                ["Location",   `${profile.company.city}, ${profile.company.country}`],
                ["Plan fit",   profile.recommendation.plan],
                ["Lead score", `${profile.meta.leadScore} / 100`],
              ].map(([key, val]) => (
                <div key={key}>
                  <div className="label">{key}</div>
                  <div style={{ fontSize: 12, color: "var(--text)", marginTop: 3 }}>{val}</div>
                </div>
              ))}
            </div>

            <Divider />

            <div
              className="label"
              style={{ textAlign: "center", color: "var(--text-muted)" }}
            >
              Handing off to Maya…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
