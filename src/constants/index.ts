// ─── Design tokens ────────────────────────────────────────────────────────────

export const COLORS = {
  bg:          "#070B14",
  bgPanel:     "rgba(255,255,255,0.032)",
  bgHover:     "rgba(255,255,255,0.055)",
  border:      "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  blue:        "#4F8EF7",
  green:       "#00D97E",
  red:         "#FF4757",
  amber:       "#FFB84D",
  purple:      "#a855f7",
  text:        "#E8EDF5",
  textMuted:   "#5A6478",
  textDim:     "#8892A4",
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
  Pro:        ["Unlimited boards", "5 GB storage", "Priority support", "250 automations/mo"],
  Business:   ["Unlimited boards", "50 GB storage", "Advanced analytics", "25K automations/mo"],
  Enterprise: ["Unlimited everything", "Enterprise security", "Dedicated CSM", "Custom automations"],
};

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
  { id: "explorium_person",  label: "Explorium",     detail: "Person + title + seniority",   color: COLORS.blue,   delayMs: 0    },
  { id: "explorium_company", label: "Explorium",     detail: "Company + funding + industry",  color: COLORS.blue,   delayMs: 600  },
  { id: "intent",            label: "Intent Signals",detail: "Buying topics + tech stack",    color: COLORS.amber,  delayMs: 1200 },
  { id: "geo",               label: "Geo + Timezone",detail: "Location · timezone · language",color: COLORS.purple, delayMs: 1800 },
  { id: "scoring",           label: "Lead Scoring",  detail: "Fit score + plan recommendation",color: COLORS.green, delayMs: 2200 },
  { id: "monday",            label: "monday.com",    detail: "Writing enrichment to CRM board",color: "#0073ea",    delayMs: 2700 },
] as const;

// ─── Lead status progression ──────────────────────────────────────────────────

export const LEAD_STATUSES = [
  "New Lead",
  "Enrichment",
  "Calling",
  "Call Complete",
  "Payment Sent",
  "Customer",
] as const;

// ─── monday.com column IDs ────────────────────────────────────────────────────
// These must match the actual column IDs on your monday.com board.
// Run: GET https://api.monday.com/v2 with query { boards(ids:[ID]) { columns { id title } } }

export const MONDAY_COLUMNS = {
  // Contact
  email:       "email",
  phone:       "phone",
  // Company
  company:     "text",        // company name text column
  industry:    "text1",
  employees:   "numbers",
  country:     "text2",
  city:        "text3",
  raised:      "text4",
  website:     "link",
  // Enrichment
  title:       "text5",       // job title
  seniority:   "text6",
  leadScore:   "numbers1",
  priority:    "color",       // colour column for priority
  intentTopics:"long_text",
  techStack:   "text7",
  // Call
  callStatus:  "status",      // main deal status column
  callNotes:   "long_text1",
  painPoint:   "text8",
  useCase:     "text9",
  timeline:    "text10",
  // Plan
  plan:        "text11",
  seats:       "numbers2",
  monthlyMrr:  "numbers3",
  paymentLink: "link1",
} as const;

// ─── ElevenLabs ───────────────────────────────────────────────────────────────

export const ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella - warm, professional

// ─── n8n event names ──────────────────────────────────────────────────────────

// export const N8N_EVENTS = {
//   LEAD_CAPTURED:    "lead-captured",
//   ENRICHMENT_DONE:  "enrichment-done",
//   CALL_INITIATED:   "call-initiated",
//   CALL_COMPLETE:    "call-complete",
//   PAYMENT_SENT:     "payment-sent",
//   DEAL_WON:         "deal-won",
// } as const;

// ─── Stage labels (used by ChatSidebar) ──────────────────────────────────────

export const STAGE_LABELS = ["Lead Captured", "Enriched", "Qualifying", "Board Ready", "Closing"] as const;

// ─── Quick reply suggestions per stage (used by ChatScreen) ──────────────────

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

// ─── n8n event names ──────────────────────────────────────────────────────────

export const N8N_EVENTS = {
  LEAD_CAPTURED:    "lead-captured",
  ENRICHMENT_DONE:  "enrichment-done",
  CALL_NOTES_SAVED: "call-notes-saved",
  BOARD_CREATED:    "board-created",
  PAYMENT_EMAIL:    "payment-email",
  DEAL_WON:         "deal-won",
} as const;

// ─── Backward-compat alias (used by monday/client.ts for board items) ─────────

export const MONDAY_COLUMN_IDS = {
  status:   "status",
  priority: "priority4",
  owner:    "person",
  dueDate:  "date4",
} as const;
