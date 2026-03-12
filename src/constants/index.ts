// ─── Design tokens ────────────────────────────────────────────────────────────

export const COLORS = {
  bg:        "#070B14",
  bgPanel:   "rgba(255,255,255,0.032)",
  bgHover:   "rgba(255,255,255,0.055)",
  border:    "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  blue:      "#4F8EF7",
  green:     "#00D97E",
  red:       "#FF4757",
  amber:     "#FFB84D",
  purple:    "#a855f7",
  text:      "#E8EDF5",
  textMuted: "#5A6478",
  textDim:   "#8892A4",
} as const;

export const FONTS = {
  display: "'Syne', sans-serif",
  mono:    "'JetBrains Mono', monospace",
} as const;

// ─── Plan pricing ─────────────────────────────────────────────────────────────

export const PLAN_PRICES: Record<"Pro" | "Business" | "Enterprise", number | null> = {
  Pro:        12,
  Business:   20,
  Enterprise: null,
};

export const PLAN_FEATURES: Record<"Pro" | "Business" | "Enterprise", string[]> = {
  Pro:        ["Unlimited boards", "5 GB storage", "Priority support", "Automations (250/mo)"],
  Business:   ["Unlimited boards", "50 GB storage", "Priority support", "Automations (25,000/mo)", "Advanced analytics"],
  Enterprise: ["Unlimited everything", "Enterprise security", "Dedicated CSM", "Custom automations", "SLA guarantee"],
};

// ─── Board status / priority colors ──────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  "Done":          COLORS.green,
  "Working on it": COLORS.amber,
  "Stuck":         COLORS.red,
  "Not started":   COLORS.textMuted,
};

export const PRIORITY_COLORS: Record<string, string> = {
  "Critical": "#FF2D55",
  "High":     COLORS.red,
  "Medium":   COLORS.amber,
  "Low":      COLORS.blue,
};

// ─── Enrichment pipeline steps ────────────────────────────────────────────────

export const ENRICHMENT_STEPS = [
  { id: "clearbit",   label: "Clearbit",      detail: "Person + company data",      color: COLORS.blue,   delayMs: 0    },
  { id: "hunter",     label: "Hunter.io",     detail: "Email deliverability",       color: COLORS.green,  delayMs: 500  },
  { id: "linkedin",   label: "LinkedIn",      detail: "Title · seniority · network",color: "#0A66C2",     delayMs: 900  },
  { id: "zoominfo",   label: "ZoomInfo",      detail: "Buying intent signals",      color: COLORS.amber,  delayMs: 1300 },
  { id: "ipapi",      label: "IPapi",         detail: "Location · timezone",        color: COLORS.purple, delayMs: 1700 },
  { id: "scoring",    label: "Lead Scoring",  detail: "Fit score calculation",      color: COLORS.green,  delayMs: 2100 },
] as const;

// ─── App stage labels ─────────────────────────────────────────────────────────

export const STAGE_LABELS = ["Lead Captured", "Enriched", "Qualifying", "Board Ready", "Closing"] as const;

// ─── Quick reply suggestions per stage ───────────────────────────────────────

export const QUICK_REPLIES: Record<number, string[]> = {
  0: [
    "I need to manage my team's projects",
    "We're drowning in spreadsheets",
    "I want to replace Jira",
    "I need a CRM for my sales team",
  ],
  1: [
    "We're a team of about 15",
    "Around 50 people",
    "Just me and a few contractors",
    "We're scaling fast, 200+",
  ],
  2: [
    "Yes, show me what a board would look like",
    "What does the Pro plan include?",
    "How does this compare to Asana?",
    "We're ready to get started",
  ],
};

// ─── Monday.com column IDs (match your board schema) ─────────────────────────

export const MONDAY_COLUMN_IDS = {
  status:   "status",
  priority: "priority4",
  owner:    "person",
  dueDate:  "date4",
} as const;

// ─── n8n event names ──────────────────────────────────────────────────────────

export const N8N_EVENTS = {
  LEAD_CAPTURED:    "lead-captured",
  CALL_NOTES_SAVED: "call-notes-saved",
  BOARD_CREATED:    "board-created",
  PAYMENT_EMAIL:    "payment-email",
  DEAL_WON:         "deal-won",
} as const;
