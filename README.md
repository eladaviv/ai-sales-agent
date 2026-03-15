# Maya — AI Sales Concierge for monday.com

An autonomous AI sales agent that takes a prospect from a web form to a paid monday.com account — no human sales rep involved.

**Form → monday.com CRM → Explorium enrichment → AI chat → Live board creation → Payment link**

Built with Next.js 14, TypeScript, Claude Sonnet (tool use), the monday.com GraphQL API, and the Explorium enrichment platform.

---

## How it works

A prospect fills in a 5-field form. The moment they submit, a CRM item is created in monday.com. The enrichment pipeline fires immediately — pulling company size, industry, funding stage, tech stack, and buying intent from Explorium (falling back to mocks if the key isn't set). All of that data is written back to the board. Then the chat opens with Maya, who already knows everything about the prospect and never asks for information you already have. Maya qualifies them, builds a real monday.com board tailored to their use case, and sends a payment link — all tracked live on the board.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
create .env.local
# Fill in at minimum: ANTHROPIC_API_KEY, MONDAY_API_KEY, MONDAY_LEADS_BOARD_ID

# 3. Run
npm run dev

# Open http://localhost:3000
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key — [console.anthropic.com](https://console.anthropic.com/keys) |
| `MONDAY_API_KEY` | ✅ | monday.com Personal API Token — Avatar → Admin → API |
| `MONDAY_LEADS_BOARD_ID` | ✅ | The board ID where leads are tracked — copy from the board URL |
| `EXPLORIUM_API_KEY` | ⬜ | Explorium enrichment key — without this, mocks are used automatically |

> **No Explorium key?** The app works fully without it. All enrichment falls back to realistic mock data using Clearbit-shaped profiles, ZoomInfo-style intent signals, and Hunter.io-style email scoring. Set the key when you're ready for real data — no other code changes needed.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                      # Screen router: intake → enriching → chat
│   ├── layout.tsx                    # Root layout, fonts
│   └── api/
│       ├── intake/route.ts           # POST /api/intake   — creates monday.com item immediately
│       ├── enrich/route.ts           # POST /api/enrich   — Explorium pipeline + monday write
│       └── chat/route.ts             # POST /api/chat     — Claude agent loop with tool use
│
├── components/
│   ├── intake/
│   │   └── IntakeScreen.tsx          # 5-field form with inline monday.com item creation
│   ├── enrichment/
│   │   └── EnrichingScreen.tsx       # Animated pipeline (6 steps), waits for both anim + API
│   ├── chat/
│   │   ├── ChatScreen.tsx            # Main chat — rawHistory management, send/receive
│   │   ├── ChatSidebar.tsx           # Lead profile, stage tracker, n8n event log
│   │   └── MessageBubble.tsx         # Text bubble + embedded BoardPreview + PaymentCard
│   ├── board/
│   │   └── BoardPreview.tsx          # monday.com board rendered inline in chat
│   ├── payment/
│   │   └── PaymentCard.tsx           # Plan recommendation + payment CTA
│   └── shared/
│       └── Atoms.tsx                 # Tag, Dot, Spinner, Label, Divider
│
├── lib/
│   ├── explorium/
│   │   └── client.ts                 # Explorium API — enrichPerson(), enrichCompany()
│   │                                 # Falls back to mocks on any error or missing key
│   ├── enrichment/
│   │   ├── index.ts                  # Orchestrator — runs both Explorium calls in parallel,
│   │   │                             # scores lead, recommends plan, returns EnrichmentResult
│   │   ├── clearbit.mock.ts          # Company profiles keyed by domain keyword
│   │   ├── zoominfo.mock.ts          # Intent topics + tech stack by industry
│   │   └── hunter-linkedin.mock.ts   # Email score + LinkedIn mock
│   ├── monday/
│   │   ├── leads.ts                  # All CRM lead operations:
│   │   │                             #   createLeadItem()      — intake
│   │   │                             #   setLeadStatus()       — phase transitions
│   │   │                             #   writeEnrichmentData() — after enrichment
│   │   │                             #   writeCallNotes()      — Stage 2 tool
│   │   │                             #   writePaymentData()    — Stage 4 tool
│   │   │                             #   sendPaymentEmail()    — after trigger_payment
│   │   └── client.ts                 # Board creation: createMondayBoard()
│   ├── agents/
│   │   └── prompt.ts                 # buildSystemPrompt() — injects full enrichment context
│   │                                 # Industry talking points, stage flow, tool call rules
│   ├── tools/
│   │   └── definitions.ts            # AGENT_TOOLS array (3 tools) + typed parsers:
│   │                                 #   parseCallNotes(), parseBoardConfig(), parsePaymentTrigger()
│   └── n8n/
│       └── client.ts                 # fireN8nEvent() — fire-and-forget webhook
│
├── types/
│   └── index.ts                      # All TypeScript interfaces
├── constants/
│   └── index.ts                      # Colors, plans, enrichment steps, monday column IDs,
│                                     # stage labels, quick replies, n8n event names
└── styles/
    └── globals.css                   # All styles — CSS custom properties, no Tailwind
```

---

## Flow in detail

### 1. Intake

The prospect fills in: first name, last name, work email, phone, company name.

On submit the frontend calls `POST /api/intake`. This creates a monday.com CRM item **immediately** — before enrichment starts — so the lead is captured even if enrichment later fails. The item ID is returned and carried through every subsequent step.

The monday item is created with `ensureLeadColumns()` which reads the board's real column schema, matches by ID then by title, and **auto-creates any missing columns**. This means you don't need to manually set up every column — the first run creates what's missing.

---

### 2. Enrichment

The enriching screen fires `POST /api/enrich` and animates six steps independently of API timing (so the UI always feels responsive regardless of latency).

The enrichment orchestrator runs two Explorium calls in `Promise.all()`:

- **`enrichPerson(email, firstName, lastName)`** — `POST /enrichment/persons/enrich` → job title, seniority level, LinkedIn URL, email confidence score
- **`enrichCompany(companyName, domain)`** — `POST /enrichment/businesses/enrich` → industry, employee count, funding, tech stack, intent topics, intent score, recent activity

Each call has an 8-second timeout. On **any** failure (missing key, network error, non-200 response, timeout) it falls back silently to the mocks:

```
enrichPerson fails  →  mockClearbit(domain, fullName)  +  mockHunter(email)
enrichCompany fails →  mockClearbit(domain, name)       +  mockZoomInfo(industry, employees, raised)
```

After enrichment, the lead score is calculated (max 100 across 5 signals — see Scoring below) and `writeEnrichmentData()` writes 15 fields to the monday.com board in a single GraphQL mutation. The board status moves to **Enrichment**.

---

### 3. Chat

The chat opens pre-loaded. Maya's opening message is built client-side from the enrichment profile — it references the prospect's company name, employee count, and primary tech stack. The prospect has never seen a generic greeting.

Every user message goes to `POST /api/chat`. The API maintains a full Anthropic message history including tool turns.

**Why two message stores?**

```
messages[]        — display layer only (text + rich cards for UI rendering)
rawHistory ref    — sent to Claude API every request (includes tool_use and
                    tool_result content blocks)
```

Without `rawHistory`, Claude sees a clean conversation on every request with no memory of having called `save_call_notes`, and re-enters Stage 2 indefinitely. The API route returns `rawHistoryAppend` containing all new turns (assistant tool_use + user tool_result + assistant follow-up). The client appends them atomically.

**Stage flow:**

| Stage | Exit trigger | Tool called | monday.com update |
|---|---|---|---|
| Discovery | Prospect mentions any work challenge | — | — |
| Qualification | Pain point + use case understood | `save_call_notes` | Writes pain point, use case, timeline → status: In Conversation |
| Demo | Immediately after save_call_notes | `generate_board` | Creates real board via GraphQL → status: Board Sent |
| Close | Any buying intent signal | `trigger_payment` | Writes plan, seats, MRR, payment link → status: Payment Sent |

---

### Tool use — how it works

Maya has three tools defined in `lib/tools/definitions.ts`. Claude calls them with structured validated inputs. Every tool call requires two API roundtrips:

**First call** — Claude responds with a `tool_use` block alongside text.

**Server executes the tool** — for `generate_board` this means real GraphQL calls to monday.com (`create_board` → `create_group` × N → `create_item` × N).

**Second call** — the full history including the `tool_use` and `tool_result` turns is sent back. Claude narrates what just happened.

```
save_call_notes   →  parseCallNotes()       →  writeCallNotes()   + setLeadStatus('In Conversation')
generate_board    →  parseBoardConfig()     →  createMondayBoard() + setLeadStatus('Board Sent')
trigger_payment   →  parsePaymentTrigger()  →  writePaymentData()  + setLeadStatus('Payment Sent')
```

---

## Lead scoring

Scores are calculated in `lib/enrichment/index.ts` and written to the monday board as a number column.

| Signal | Max points |
|---|---|
| Email confidence (Explorium / Hunter mock) | 20 |
| Seniority — executive=30, director=22, manager=14, individual=7 | 30 |
| Company size — 10–500 employees=20, <10=8, >500=12 | 20 |
| Funding — Series C/IPO=15, B=12, A=9, Seed=6, other=3 | 15 |
| Intent score from Explorium / ZoomInfo mock (scaled) | 15 |
| **Total** | **100** |

Priority labels: **High** ≥ 70 · **Medium** ≥ 45 · **Low** < 45

---

## Plan recommendation

Calculated deterministically from employee count, independent of the lead score:

| Employees | Plan | Price per seat |
|---|---|---|
| ≤ 10 | Pro | $12/mo |
| 11–100 | Business | $20/mo |
| 100+ | Enterprise | Custom |

Seat count = `max(3, min(ceil(employees × 0.2), 50))`
Monthly total = `pricePerSeat × seats`

---

## monday.com column mapping

All column IDs are defined in `src/constants/index.ts` under `MONDAY_COLUMNS`. The `ensureLeadColumns()` function in `lib/monday/leads.ts` resolves real column IDs at runtime by matching against your board's schema — it does **not** rely solely on the constants. To find your actual column IDs:

```graphql
query {
  boards(ids: [YOUR_BOARD_ID]) {
    columns {
      id
      title
      type
    }
  }
}
```

Run this at [api.monday.com/v2](https://api.monday.com/v2) with your API token and update `MONDAY_COLUMNS` in `constants/index.ts` to match.

---

## What is mocked

The app is fully functional without any external API keys. Here is what each mock replaces:

| Component | Mock source | Real replacement |
|---|---|---|
| Person enrichment | `clearbit.mock.ts` — domain-keyword profiles + title/seniority lookup | Explorium `POST /enrichment/persons/enrich` |
| Company enrichment | `clearbit.mock.ts` + `zoominfo.mock.ts` — 8 pre-built industry profiles | Explorium `POST /enrichment/businesses/enrich` |
| Email score | `hunter-linkedin.mock.ts` — 72-97 for corporate, 42-62 for personal domains | Explorium email_confidence field |
| Stripe payment link | `https://buy.stripe.com/mock_{timestamp}` | Stripe `POST /v1/checkout/sessions` or `/v1/payment_links` |
| Payment email | monday.com board update comment | monday.com email integration or SendGrid |
| n8n webhooks | `fireN8nEvent()` logs to console if `N8N_BASE_URL` not set | n8n webhook workflows |

---

## Replacing mocks with real APIs

All enrichment mocks sit behind the Explorium client in `lib/explorium/client.ts`. The fallback is triggered by a missing key or any error — no other changes are needed:

```bash
# .env.local
EXPLORIUM_API_KEY=your_key_here
```

The orchestrator in `lib/enrichment/index.ts` calls `enrichPerson()` and `enrichCompany()` from the Explorium client. Those functions handle the Explorium → mock fallback internally. The orchestrator itself does not change.

For Stripe, replace the `stripeUrl` line in `parsePaymentTrigger()` in `lib/tools/definitions.ts`:

```typescript
// Replace this:
stripeUrl: `https://buy.stripe.com/mock_${Date.now()}`,

// With a real Stripe Checkout Session:
stripeUrl: await createStripeCheckoutSession({ plan, seats, email }),
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| AI | Claude Sonnet (`claude-sonnet-4-20250514`) via Anthropic SDK — tool use |
| Enrichment | Explorium Data Platform API with Clearbit / ZoomInfo / Hunter mocks |
| CRM | monday.com GraphQL API v2024-01 |
| Styling | Plain CSS with custom properties — no Tailwind, no CSS-in-JS |
| Fonts | Syne (display) + JetBrains Mono (monospace) via Google Fonts |