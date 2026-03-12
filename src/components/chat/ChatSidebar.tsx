import type { EnrichmentResult, N8nEvent } from "@/types";
import { STAGE_LABELS } from "@/constants";
import { Tag, Dot, Divider, Label } from "@/components/shared/Atoms";

// ─── Profile card ─────────────────────────────────────────────────────────────
function ProfileCard({ profile }: { profile: EnrichmentResult }) {
  const { person, company, intent, meta, recommendation } = profile;

  return (
    <div className="panel profile-card">
      <Label style={{ marginBottom: 10 }}>Lead Profile</Label>

      <div className="profile-card__name">{person.name}</div>
      <div className="profile-card__title">
        {person.title} · {company.name}
      </div>

      <Divider />

      {[
        ["Industry",   company.industry],
        ["Employees",  `${company.employees}`],
        ["Location",   `${company.city}, ${company.country}`],
        ["Raised",     company.raised],
        ["Plan fit",   recommendation.plan],
        ["Lead score", `${meta.leadScore} / 100`],
      ].map(([key, val]) => (
        <div key={key} className="profile-card__row">
          <span className="profile-card__key">{key}</span>
          <span className="profile-card__value">{val}</span>
        </div>
      ))}

      <Divider />

      {/* Intent signals */}
      <Label style={{ marginBottom: 8 }}>Intent Signals</Label>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        {intent.topics.map((t) => (
          <Tag key={t} variant="amber">{t}</Tag>
        ))}
      </div>

      {/* Tech stack */}
      <Label style={{ marginBottom: 8 }}>Current Stack</Label>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {intent.techStack.map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </div>

      {/* Priority badge */}
      <Divider />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label>Email score</Label>
        <Tag variant={meta.emailScore > 70 ? "green" : "amber"}>
          {meta.emailScore}/100
        </Tag>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <Label>Priority</Label>
        <Tag variant={meta.priority === "High" ? "green" : meta.priority === "Medium" ? "amber" : "default"}>
          {meta.priority}
        </Tag>
      </div>
    </div>
  );
}

// ─── Stage progress ───────────────────────────────────────────────────────────
function StageProgress({ currentStage }: { currentStage: number }) {
  return (
    <div className="panel stage-progress">
      <Label style={{ marginBottom: 12 }}>Conversation Stage</Label>
      {STAGE_LABELS.map((label, i) => {
        const isDone   = i < currentStage;
        const isActive = i === currentStage;

        return (
          <div
            key={label}
            className={`stage-progress__item${
              isActive ? " stage-progress__item--active" :
              isDone   ? " stage-progress__item--done"   : ""
            }`}
          >
            <Dot
              color={
                isDone   ? "var(--green)"     :
                isActive ? "var(--blue)"      :
                "var(--text-muted)"
              }
              pulse={isActive}
            />
            <span
              style={{
                fontSize:   11,
                fontFamily: "var(--mono)",
                color:
                  isDone   ? "var(--green)"    :
                  isActive ? "var(--text)"     :
                  "var(--text-muted)",
              }}
            >
              {label}
            </span>
            {isDone && (
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--green)" }}>✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── n8n event log ────────────────────────────────────────────────────────────
function N8nEventLog({ events }: { events: N8nEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="panel n8n-log">
        <Label style={{ marginBottom: 8 }}>n8n Automations</Label>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
          Waiting for triggers…
        </div>
      </div>
    );
  }

  return (
    <div className="panel n8n-log">
      <Label style={{ marginBottom: 8 }}>n8n Automations</Label>
      {events.map((ev, i) => (
        <div key={i} className="n8n-log__event">
          <span style={{ fontSize: 14, flexShrink: 0 }}>{ev.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: ev.color }}>{ev.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--mono)", marginTop: 1 }}>
              {ev.detail}
            </div>
          </div>
          <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--mono)", flexShrink: 0 }}>
            {ev.time}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sidebar root ─────────────────────────────────────────────────────────────
interface ChatSidebarProps {
  profile:      EnrichmentResult;
  currentStage: number;
  n8nEvents:    N8nEvent[];
}

export function ChatSidebar({ profile, currentStage, n8nEvents }: ChatSidebarProps) {
  return (
    <div className="chat-sidebar">
      {/* Logo */}
      <div className="chat-sidebar__logo">
        <div className="chat-sidebar__logo-mark">m</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>monday.com</div>
          <div className="label" style={{ marginTop: 1 }}>Maya · AI Concierge</div>
        </div>
      </div>

      <ProfileCard  profile={profile} />
      <StageProgress currentStage={currentStage} />
      <N8nEventLog  events={n8nEvents} />
    </div>
  );
}
