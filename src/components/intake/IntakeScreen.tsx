"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import type { LeadFormData, MondayLeadItem } from "@/types";
import { Dot, Spinner } from "@/components/shared/Atoms";

interface IntakeScreenProps {
  onSubmit: (form: LeadFormData, mondayItem: MondayLeadItem) => void;
}

const FIELDS = [
  { key: "firstName",   label: "First name",  placeholder: "Alex",             type: "text",  autoComplete: "given-name"   },
  { key: "lastName",    label: "Last name",   placeholder: "Johnson",          type: "text",  autoComplete: "family-name"  },
  { key: "email",       label: "Work email",  placeholder: "alex@company.com", type: "email", autoComplete: "email"        },
  { key: "phone",       label: "Phone",       placeholder: "+1 555 000 0000",  type: "tel",   autoComplete: "tel"          },
  { key: "companyName", label: "Company",     placeholder: "Acme Inc.",        type: "text",  autoComplete: "organization" },
] as const;

type FieldKey = typeof FIELDS[number]["key"];

export function IntakeScreen({ onSubmit }: IntakeScreenProps) {
  const [form, setForm]     = useState<Record<FieldKey, string>>({
    firstName: "", lastName: "", email: "", phone: "", companyName: "",
  });
  const [focused, setFocused]     = useState<FieldKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const isValid =
    form.firstName.trim().length > 1 &&
    form.lastName.trim().length > 1 &&
    form.email.includes("@") && form.email.includes(".") &&
    form.phone.trim().length >= 7 &&
    form.companyName.trim().length > 1;

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      // Create monday.com CRM item immediately — before enrichment starts
      const res = await fetch("/api/intake", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          firstName:   form.firstName.trim(),
          lastName:    form.lastName.trim(),
          email:       form.email.trim(),
          phone:       form.phone.trim(),
          companyName: form.companyName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create lead");

      onSubmit(
        {
          firstName:   form.firstName.trim(),
          lastName:    form.lastName.trim(),
          email:       form.email.trim(),
          phone:       form.phone.trim(),
          companyName: form.companyName.trim(),
        },
        data.mondayItem,
      );
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }, [form, isValid, submitting, onSubmit]);

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
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>monday.com</div>
            <div className="label" style={{ marginTop: 2 }}>AI Sales Concierge</div>
          </div>
        </div>

        {/* Hero */}
        <div className="intake__hero">
          <h1>
            Meet Maya.<br />
            <span>She already knows</span><br />
            who you are.
          </h1>
          <p>
            Leave your details. Maya will research your company, then open a
            personalised chat — knowing your team size, your stack, and what
            you actually need.
          </p>
        </div>

        {/* Form */}
        <div className="intake__form">
          {FIELDS.map(({ key, label, placeholder, type, autoComplete }) => (
            <div key={key}>
              <div className={`intake__field-label${focused === key ? " intake__field-label--focused" : ""}`}>
                {label}
              </div>
              <input
                type={type}
                value={form[key]}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className="intake__input"
                disabled={submitting}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
                onKeyDown={handleKeyDown}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", color: "var(--red)", fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className={`intake__submit${isValid && !submitting ? " intake__submit--active" : " intake__submit--disabled"}`}
        >
          {submitting
            ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <Spinner size={16} color="#fff" /> Creating your lead…
              </span>
            : "Start my demo →"}
        </button>

        <div className="intake__trust">
          {["Explorium enrichment", "Real-time monday.com CRM", "AI sales chat", "Live board creation"].map(s => (
            <div key={s} className="intake__trust-item">
              <Dot color="var(--green)" />{s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
