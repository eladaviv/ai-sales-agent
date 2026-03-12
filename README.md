# Maya — AI Sales Concierge for monday.com

Autonomous AI sales agent that replaces the full GTM flow:
**Form → Enrichment → Chat → Board Creation → Payment**

Built with Next.js 14 (App Router), TypeScript, Claude tool use, and the monday.com API.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, fonts
│   ├── page.tsx                # App entry, screen routing
│   └── api/
│       ├── enrich/route.ts     # POST /api/enrich  — runs enrichment pipeline
│       └── chat/route.ts       # POST /api/chat    — agent loop with tool use
│
├── components/
│   ├── intake/
│   │   └── IntakeScreen.tsx    # Name + email form
│   ├── enrichment/
│   │   └── EnrichingScreen.tsx # Animated enrichment pipeline
│   ├── chat/
│   │   ├── ChatScreen.tsx      # Main chat layout + state
│   │   ├── ChatSidebar.tsx     # Profile card, stage progress, n8n log
│   │   └── MessageBubble.tsx   # Individual message (text + rich cards)
│   ├── board/
│   │   └── BoardPreview.tsx    # monday.com board rendered inline
│   ├── payment/
│   │   └── PaymentCard.tsx     # Plan recommendation + payment CTA
│   └── shared/
│       └── Atoms.tsx           # Tag, Dot, Divider, Spinner, Label
│
├── lib/
│   ├── enrichment/
│   │   ├── index.ts            # Orchestrates all enrichment sources
│   │   ├── clearbit.mock.ts    # Clearbit person + company mock
│   │   ├── zoominfo.mock.ts    # ZoomInfo intent signals mock (detailed)
│   │   └── hunter-linkedin.mock.ts  # Hunter.io + LinkedIn mocks
│   ├── monday/
│   │   └── client.ts          # Real monday.com GraphQL API client
│   ├── agents/
│   │   └── prompt.ts          # System prompt builder (profile-aware)
│   ├── tools/
│   │   └── definitions.ts     # Tool schemas + input parsers
│   └── n8n/
│       └── client.ts          # Fire-and-forget n8n webhook client
│
├── types/
│   └── index.ts               # All TypeScript types
├── constants/
│   └── index.ts               # Colors, plans, stages, tool names
└── styles/
    └── globals.css            # All styles (CSS custom properties)
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in ANTHROPIC_API_KEY and MONDAY_API_KEY

# 3. Run dev server
npm run dev

# 4. Open http://localhost:3000
```

---

## Environment Variables

| Variable         | Required | Description |
|-----------------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key from console.anthropic.com |
| `MONDAY_API_KEY`    | ✅ | monday.com Personal API Token (Admin → API) |
| `N8N_BASE_URL`      | ❌ | n8n webhook base URL — events log to console if not set |

---

## How it works

### 1. Enrichment pipeline (mocked, ready for real APIs)

On form submit, `/api/enrich` runs:
- **Clearbit** (`clearbit.mock.ts`) — person title, seniority, company industry/employees/raised
- **Hunter.io** (`hunter-linkedin.mock.ts`) — email deliverability score
- **LinkedIn/Proxycurl** (`hunter-linkedin.mock.ts`) — headline, connections, recent activity
- **ZoomInfo** (`zoominfo.mock.ts`) — buying intent topics, tech stack, funding stage, growth rate
- **IPapi** — location, timezone

Each mock mirrors the real API response shape. Swap in real HTTP calls when you have keys — the orchestrator in `lib/enrichment/index.ts` stays the same.

### 2. AI agent with tool use

`/api/chat` calls Claude with three tools:

| Tool | Triggered when | Action |
|------|---------------|--------|
| `save_call_notes` | Pain point + use case understood | Fires n8n `call-notes-saved` |
| `generate_board` | Ready to show a demo board | Calls **real monday.com API** to create the board |
| `trigger_payment` | Prospect ready to buy | Fires n8n `payment-email` → Stripe + SendGrid |

### 3. monday.com API

`lib/monday/client.ts` makes real GraphQL calls:
1. `create_board` — creates the board
2. `create_group` — creates each group
3. `create_item` — creates each task with status + priority

Requires `MONDAY_API_KEY` in `.env.local`.

### 4. Replacing mocks with real APIs

Each enrichment function has a comment explaining the real API call:

```typescript
// Real API: GET https://person.clearbit.com/v2/combined/find?email={email}
// Headers: Authorization: Bearer YOUR_CLEARBIT_KEY
// Route through Next.js API (/api/enrich) to avoid CORS
```

---

## n8n Workflows

Import the 3 JSON files from `n8n-flows/` into your n8n instance:
- `01-lead-captured-enrichment.json` — Clearbit → Hunter → monday CRM → Slack
- `02-call-notes-board.json` — Update lead + create board
- `03-payment-deal-won.json` — Stripe payment link → SendGrid → deal won → Slack
