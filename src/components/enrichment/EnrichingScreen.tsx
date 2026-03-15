"use client";

import { useState, useEffect, useRef } from "react";
import type { LeadFormData, EnrichmentResult } from "@/types";
import { ENRICHMENT_STEPS } from "@/constants";
import { Spinner, Label, Divider } from "@/components/shared/Atoms";

interface EnrichingScreenProps {
  form:         LeadFormData;
  mondayItemId: string;
  onComplete:   (profile: EnrichmentResult) => void;
}

export function EnrichingScreen({ form, mondayItemId, onComplete }: EnrichingScreenProps) {
  const [doneSteps, setDoneSteps]   = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<string>(ENRICHMENT_STEPS[0].id);
  const [profile, setProfile]       = useState<EnrichmentResult | null>(null);
  const [animDone, setAnimDone]     = useState(false);
  const [apiError, setApiError]     = useState<string | null>(null);
  const started = useRef(false);

  const domain = form.email.split("@")[1] ?? form.companyName;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // ── Start enrichment API call (Explorium → mock fallback) ─────────────
    fetch("/api/enrich", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email:        form.email,
        firstName:    form.firstName,
        lastName:     form.lastName,
        companyName:  form.companyName,
        mondayItemId,
      }),
    })
      .then(r => r.json())
      .then((data: EnrichmentResult & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
      })
      .catch(err => setApiError((err as Error).message));

    // ── Animate steps independently of API timing ─────────────────────────
    ENRICHMENT_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setActiveStep(step.id);
        setTimeout(() => setDoneSteps(prev => new Set([...prev, step.id])), 480);
      }, step.delayMs);
    });

    const lastStep = ENRICHMENT_STEPS[ENRICHMENT_STEPS.length - 1];
    setTimeout(() => setAnimDone(true), lastStep.delayMs + 900);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance only when both animation AND API are done
  useEffect(() => {
    if (!animDone || !profile) return;
    const t = setTimeout(() => onComplete(profile), 600);
    return () => clearTimeout(t);
  }, [animDone, profile, onComplete]);

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
          <Label variant="blue" style={{ marginBottom: 12 }}>Enrichment Pipeline</Label>
          <h2>Researching {domain}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
            Maya will know exactly who she&apos;s talking to
          </p>
        </div>

        {/* API error — non-fatal, shows mock fallback is in use */}
        {apiError && (
          <div style={{ padding: "9px 14px", borderRadius: 8, background: "rgba(255,184,77,0.08)", border: "1px solid rgba(255,184,77,0.3)", color: "var(--amber)", fontSize: 11, fontFamily: "var(--mono)", marginBottom: 14 }}>
            Explorium unavailable — using mock data: {apiError}
          </div>
        )}

        {/* Steps */}
        <div className="enriching__steps">
          {ENRICHMENT_STEPS.map((step, i) => {
            const isDone   = doneSteps.has(step.id);
            const isActive = activeStep === step.id && !isDone;

            return (
              <div
                key={step.id}
                className={`enriching__step${
                  isDone    ? " enriching__step--done"    :
                  isActive  ? " enriching__step--active"  :
                              " enriching__step--pending"
                }`}
              >
                <div
                  className="enriching__step-icon"
                  style={isDone ? { background: `${step.color}15`, borderColor: `${step.color}40` } : {}}
                >
                  {isDone
                    ? <span style={{ color: step.color, fontSize: 13 }}>✓</span>
                    : isActive
                    ? <Spinner size={16} color={step.color} />
                    : <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={`enriching__step-name${isDone ? " enriching__step-name--done" : ""}`}>
                    {step.label}
                  </div>
                  <div className="enriching__step-detail" style={{ color: isDone ? step.color : undefined }}>
                    {step.detail}
                  </div>
                  {isActive && (
                    <div className="enriching__progress-bar" style={{ marginTop: 6 }}>
                      <div className="enriching__progress-fill" style={{ background: step.color }} />
                    </div>
                  )}
                </div>

                {isDone && profile && step.id === "monday" && (
                  <span className="tag tag--green">✓ CRM updated</span>
                )}
                {isDone && profile && step.id === "scoring" && (
                  <span className="tag tag--blue">{profile.meta.leadScore}/100</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Profile reveal after all steps */}
        {animDone && profile && (
          <div className="panel panel--green" style={{ padding: 16, animation: "fadeUp 0.4s ease" }}>
            <Label variant="green" style={{ marginBottom: 10 }}>
              Enrichment Complete — {profile.meta.sources[0]}
            </Label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
            <div className="label" style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Handing off to Maya…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
