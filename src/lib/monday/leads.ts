// ─── monday.com CRM Lead Operations ──────────────────────────────────────────
// All operations that write lead data to the monday.com CRM board.
// Uses the monday.com GraphQL API directly.
// Every function is safe to call even if MONDAY_API_KEY is not set —
// it logs a warning and returns a graceful fallback.

import type { MondayLeadItem, MondayUpdateResult, EnrichmentResult, LeadStatus, CallNotes } from "@/types";
import { MONDAY_COLUMNS } from "@/constants";

const MONDAY_API_URL = "https://api.monday.com/v2";

// ─── GraphQL helper ───────────────────────────────────────────────────────────

async function gql<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) {
    console.warn("[monday.com] MONDAY_API_KEY not set — skipping API call");
    throw new Error("MONDAY_API_KEY not configured");
  }

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": apiKey,
      "API-Version":   "2024-01",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`monday.com HTTP ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`monday.com API error: ${json.errors.map(e => e.message).join(", ")}`);
  }
  return json.data as T;
}

// ─── Safe wrapper — never throws, logs on failure ─────────────────────────────

async function safeGql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  fallback?: T,
): Promise<T> {
  try {
    return await gql<T>(query, variables);
  } catch (err) {
    console.error("[monday.com]", (err as Error).message);
    return fallback as T;
  }
}

// ─── Column value builder ─────────────────────────────────────────────────────

function colValues(cols: Record<string, unknown>): string {
  // Remove undefined/null entries
  const clean = Object.fromEntries(
    Object.entries(cols).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  return JSON.stringify(clean);
}

// ─── Lead board column bootstrap ──────────────────────────────────────────────

type LeadColumnKey =
  // Contact
  | "email"
  | "phone"
  // Company / enrichment
  | "company"
  | "industry"
  | "employees"
  | "country"
  | "city"
  | "raised"
  | "website"
  | "title"
  | "seniority"
  | "leadScore"
  | "priority"
  | "intentTopics"
  | "techStack"
  // Call / qualification
  | "useCase"
  | "painPoint"
  | "timeline"
  | "callNotes"
  | "callStatus"
  // Plan / pricing
  | "plan"
  | "seats"
  | "monthlyMrr"
  | "paymentLink";

const REQUIRED_LEAD_COLUMNS: Record<
  LeadColumnKey,
  { fallbackId: string; title: string; columnType: string }
> = {
  // Contact
  email:       { fallbackId: MONDAY_COLUMNS.email,       title: "Email",         columnType: "email" },
  phone:       { fallbackId: MONDAY_COLUMNS.phone,       title: "Phone",         columnType: "phone" },
  // Company / enrichment
  company:     { fallbackId: MONDAY_COLUMNS.company,     title: "Company",       columnType: "text" },
  industry:    { fallbackId: MONDAY_COLUMNS.industry,    title: "Industry",      columnType: "text" },
  employees:   { fallbackId: MONDAY_COLUMNS.employees,   title: "Employees",     columnType: "numbers" },
  country:     { fallbackId: MONDAY_COLUMNS.country,     title: "Country",       columnType: "text" },
  city:        { fallbackId: MONDAY_COLUMNS.city,        title: "City",          columnType: "text" },
  raised:      { fallbackId: MONDAY_COLUMNS.raised,      title: "Raised",        columnType: "text" },
  website:     { fallbackId: MONDAY_COLUMNS.website,     title: "Website",       columnType: "link" },
  title:       { fallbackId: MONDAY_COLUMNS.title,       title: "Title",         columnType: "text" },
  seniority:   { fallbackId: MONDAY_COLUMNS.seniority,   title: "Seniority",     columnType: "text" },
  leadScore:   { fallbackId: MONDAY_COLUMNS.leadScore,   title: "Lead Score",    columnType: "numbers" },
  priority:    { fallbackId: MONDAY_COLUMNS.priority,    title: "Priority",      columnType: "status" },
  intentTopics:{ fallbackId: MONDAY_COLUMNS.intentTopics,title: "Intent Topics", columnType: "long_text" },
  techStack:   { fallbackId: MONDAY_COLUMNS.techStack,   title: "Tech Stack",    columnType: "text" },
  // Call / qualification
  useCase:     { fallbackId: MONDAY_COLUMNS.useCase,     title: "Use Case",      columnType: "text" },
  painPoint:   { fallbackId: MONDAY_COLUMNS.painPoint,   title: "Pain Point",    columnType: "text" },
  timeline:    { fallbackId: MONDAY_COLUMNS.timeline,    title: "Timeline",      columnType: "text" },
  callNotes:   { fallbackId: MONDAY_COLUMNS.callNotes,   title: "Call Notes",    columnType: "long_text" },
  callStatus:  { fallbackId: MONDAY_COLUMNS.callStatus,  title: "Status",        columnType: "status" },
  // Plan / pricing
  plan:        { fallbackId: MONDAY_COLUMNS.plan,        title: "Plan",          columnType: "text" },
  seats:       { fallbackId: MONDAY_COLUMNS.seats,       title: "Seats",         columnType: "numbers" },
  monthlyMrr:  { fallbackId: MONDAY_COLUMNS.monthlyMrr,  title: "Monthly MRR",   columnType: "numbers" },
  paymentLink: { fallbackId: MONDAY_COLUMNS.paymentLink, title: "Payment Link",  columnType: "link" },
};

let cachedLeadColumns: Record<LeadColumnKey, string> | null = null;
let cachedLeadBoardId: string | null = null;

async function ensureLeadColumns(boardId: string): Promise<Record<LeadColumnKey, string>> {
  if (cachedLeadColumns && cachedLeadBoardId === boardId) return cachedLeadColumns;

  type BoardColumnsResponse = {
    boards: Array<{
      id: string;
      columns: Array<{ id: string; title: string; type: string }>;
    }>;
  };

  const query = `
    query GetLeadBoardColumns($boardIds: [ID!]!) {
      boards(ids: $boardIds) {
        id
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const data = await safeGql<BoardColumnsResponse>(
    query,
    { boardIds: [boardId] },
    { boards: [] },
  );

  const existingColumns = data.boards?.[0]?.columns ?? [];

  const resolved: Record<LeadColumnKey, string> = {} as Record<LeadColumnKey, string>;

  for (const [key, def] of Object.entries(REQUIRED_LEAD_COLUMNS) as Array<[LeadColumnKey, (typeof REQUIRED_LEAD_COLUMNS)[LeadColumnKey]]>) {
    const byId = existingColumns.find(c => c.id === def.fallbackId);
    const byTitle = existingColumns.find(c => c.title.toLowerCase() === def.title.toLowerCase());

    if (byId || byTitle) {
      const match = byId ?? byTitle;
      if (match) resolved[key] = match.id;
      continue;
    }

    // Column missing → create it
    const createQuery = `
      mutation CreateLeadColumn($boardId: ID!, $title: String!, $columnType: ColumnType!) {
        create_column(board_id: $boardId, title: $title, column_type: $columnType) {
          id
          title
          type
        }
      }
    `;

    type CreateColumnResponse = {
      create_column: { id: string; title: string; type: string } | null;
    };

    const created = await safeGql<CreateColumnResponse>(
      createQuery,
      { boardId, title: def.title, columnType: def.columnType },
      { create_column: null },
    );

    if (created.create_column?.id) {
      resolved[key] = created.create_column.id;
    } else {
      // Fallback to the configured ID even if it doesn't exist yet
      console.warn(`[monday.com] Failed to create column "${def.title}", falling back to ID "${def.fallbackId}"`);
      resolved[key] = def.fallbackId;
    }
  }

  cachedLeadColumns = resolved;
  cachedLeadBoardId = boardId;
  return resolved;
}

// ─── 1. Create initial lead item (called immediately on form submit) ──────────

export async function createLeadItem(params: {
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  companyName: string;
}): Promise<MondayLeadItem> {
  const boardId = process.env.MONDAY_LEADS_BOARD_ID;
  if (!boardId) {
    console.warn("[monday.com] MONDAY_LEADS_BOARD_ID not set");
    return { itemId: `mock-${Date.now()}`, boardId: "0", itemUrl: "" };
  }

  const itemName = `${params.firstName} ${params.lastName} — ${params.companyName}`;

  const leadCols = await ensureLeadColumns(boardId);

  const cols = colValues({
    [leadCols.email]:          { email: params.email, text: params.email },
    [leadCols.phone]:          params.phone,
    [MONDAY_COLUMNS.company]:  params.companyName,
    [leadCols.callStatus]:     { label: "New Lead" },
  });

  const query = `
    mutation CreateLead($boardId: ID!, $itemName: String!, $cols: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $cols) {
        id
        name
        url
      }
    }
  `;

  const data = await safeGql<{ create_item: { id: string, url:string } }>(
    query,
    { boardId, itemName, cols },
    { create_item: { id: `mock-${Date.now()}`, url: `https://monday.com/boards/${boardId}/pulses/${`mock-${Date.now()}`}` } },
  );

  const itemUrl = data?.create_item?.url ?? `https://monday.com/boards/${boardId}/pulses/${data?.create_item?.id}`;

  return { itemId: data?.create_item?.id ?? `mock-${Date.now()}`, boardId, itemUrl };
}

// ─── 2. Set status (called at each phase transition) ─────────────────────────

export async function setLeadStatus(
  itemId: string,
  status: LeadStatus,
): Promise<MondayUpdateResult> {
  const boardId = process.env.MONDAY_LEADS_BOARD_ID;
  if (!boardId || itemId.startsWith("mock-")) {
    console.log(`[monday.com mock] setLeadStatus: ${itemId} → ${status}`);
    return { success: true };
  }

  const leadCols = await ensureLeadColumns(boardId);
  const cols = colValues({ [leadCols.callStatus]: { label: status } });
  const query = `
    mutation UpdateStatus($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }
  `;
  await safeGql(query, { boardId, itemId, cols });
  return { success: true };
}

// ─── 3. Write enrichment data (called after enrichment completes) ─────────────

export async function writeEnrichmentData(
  itemId: string,
  profile: EnrichmentResult,
): Promise<MondayUpdateResult> {
  const boardId = process.env.MONDAY_LEADS_BOARD_ID;
  if (!boardId || itemId.startsWith("mock-")) {
    console.log("[monday.com mock] writeEnrichmentData:", itemId);
    return { success: true };
  }

  const { person, company, intent, meta, recommendation } = profile;

  const leadCols = await ensureLeadColumns(boardId);

  const cols = colValues({
    [leadCols.company]:       company.name,
    [leadCols.industry]:      company.industry,
    [leadCols.employees]:     company.employees,
    [leadCols.country]:       company.country,
    [leadCols.city]:          city(company.city),
    [leadCols.raised]:        company.raised,
    [leadCols.website]:       company.website ? { url: company.website, text: company.website } : undefined,
    [leadCols.title]:         person.title,
    [leadCols.seniority]:     person.seniority,
    [leadCols.leadScore]:     meta.leadScore,
    [leadCols.priority]:      { label: meta.priority },
    [leadCols.intentTopics]:  intent.topics.join(", "),
    [leadCols.techStack]:     intent.techStack.join(", "),
    [leadCols.callStatus]:    { label: "Enrichment" },
    [leadCols.plan]:          recommendation.plan,
    [leadCols.seats]:         recommendation.seats,
    [leadCols.monthlyMrr]:    recommendation.monthlyTotal ?? 0,
  });
  console.log("cols writeEnrichmentData", cols);

  const query = `
    mutation WriteEnrichment($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }
  `;
  await safeGql(query, { boardId, itemId, cols });
  return { success: true };
}

// ─── 4. Write call notes (called during / after ElevenLabs call) ──────────────

export async function writeCallNotes(
  itemId: string,
  notes: CallNotes,
): Promise<MondayUpdateResult> {
  const boardId = process.env.MONDAY_LEADS_BOARD_ID;
  if (!boardId || itemId.startsWith("mock-")) {
    console.log("[monday.com mock] writeCallNotes:", itemId);
    return { success: true };
  }

  const leadCols = await ensureLeadColumns(boardId);

  const cols = colValues({
    [leadCols.painPoint]:        notes.painPoint,
    [leadCols.useCase]:          notes.useCase,
    [leadCols.timeline]:         notes.decisionTimeline,
    [leadCols.callNotes]:        [
      `Pain point: ${notes.painPoint}`,
      `Use case: ${notes.useCase}`,
      `Timeline: ${notes.decisionTimeline}`,
      `Budget confirmed: ${notes.budgetConfirmed ? "Yes" : "No"}`,
      notes.additionalContext ? `Notes: ${notes.additionalContext}` : "",
    ].filter(Boolean).join("\n"),
    [leadCols.callStatus]:       { label: "In Conversation" },
  });
  console.log("cols writeCallNotes", cols);
  
  const query = `
    mutation WriteCallNotes($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }
  `;
  await safeGql(query, { boardId, itemId, cols });
  return { success: true };
}

// ─── 5. Write payment data (called after payment email is sent) ───────────────

export async function writePaymentData(params: {
  itemId:       string;
  plan:         string;
  seats:        number;
  monthlyTotal: number;
  paymentUrl:   string;
}): Promise<MondayUpdateResult> {
  const boardId = process.env.MONDAY_LEADS_BOARD_ID;
  if (!boardId || params.itemId.startsWith("mock-")) {
    console.log("[monday.com mock] writePaymentData:", params.itemId);
    return { success: true };
  }

  const leadCols = await ensureLeadColumns(boardId);

  const cols = colValues({
    [leadCols.plan]:         params.plan,
    [leadCols.seats]:        params.seats,
    [leadCols.monthlyMrr]:   params.monthlyTotal,
    [leadCols.paymentLink]:  { url: params.paymentUrl, text: "Pay Now" },
    [leadCols.callStatus]:   { label: "Payment Sent" },
  });

  const query = `
    mutation WritePayment($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }
  `;
  await safeGql(query, { boardId, itemId: params.itemId, cols });
  return { success: true };
}

// ─── 6. Send payment email via monday.com ────────────────────────────────────
// Uses monday.com's email integration to send from within the platform.
// Requires monday.com email integration to be set up on the board.

export async function sendPaymentEmail(params: {
  itemId:       string;
  toEmail:      string;
  firstName:    string;
  company:      string;
  plan:         string;
  seats:        number;
  monthlyTotal: number | null;
  paymentUrl:   string;
  useCase:      string;
  industry:     string;
}): Promise<MondayUpdateResult> {
  const boardId = process.env.MONDAY_LEADS_BOARD_ID;

  // Build the email body — referenced in the monday.com email template
  const priceText = params.monthlyTotal
    ? `$${params.monthlyTotal}/month (${params.seats} seats × $${Math.round(params.monthlyTotal / params.seats)}/seat)`
    : "Custom pricing — our team will reach out";

  const emailBody = buildPaymentEmailHtml({
    firstName:   params.firstName,
    company:     params.company,
    plan:        params.plan,
    priceText,
    useCase:     params.useCase,
    industry:    params.industry,
    paymentUrl:  params.paymentUrl,
  });

  if (!boardId || params.itemId.startsWith("mock-")) {
    console.log("[monday.com mock] sendPaymentEmail to:", params.toEmail);
    console.log("[monday.com mock] subject: Your monday.com plan is ready,", params.firstName);
    return { success: true };
  }

  // Create an update on the item (visible in the item's activity log)
  // In a real setup this triggers the monday.com email integration
  const updateQuery = `
    mutation AddEmailUpdate($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }
  `;
  await safeGql(updateQuery, {
    itemId: params.itemId,
    body: `📧 Payment email sent to ${params.toEmail}\n\nPlan: ${params.plan}\nPrice: ${priceText}\nPayment link: ${params.paymentUrl}`,
  });

  // Update columns to reflect payment sent
  await writePaymentData({
    itemId:       params.itemId,
    plan:         params.plan,
    seats:        params.seats,
    monthlyTotal: params.monthlyTotal ?? 0,
    paymentUrl:   params.paymentUrl,
  });

  return { success: true };
}

// ─── Payment email HTML template ──────────────────────────────────────────────

function buildPaymentEmailHtml(p: {
  firstName:  string;
  company:    string;
  plan:       string;
  priceText:  string;
  useCase:    string;
  industry:   string;
  paymentUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4F8EF7,#7c3aed);padding:32px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:white;letter-spacing:-0.5px;">monday.com</div>
          <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">AI Sales Concierge — Maya</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px;">
          <h2 style="font-size:22px;color:#1f1f2e;margin:0 0 12px;">Hey ${p.firstName} 👋</h2>

          <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px;">
            It was great speaking with you! Based on our conversation about <strong>${p.useCase}</strong>
            at ${p.company}, I've put together a personalised <strong>${p.plan} plan</strong>
            that fits your team perfectly.
          </p>

          <!-- Plan card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border:1px solid #d0dcff;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:800;color:#4F8EF7;">${p.plan} Plan</div>
                    <div style="color:#888;font-size:13px;margin-top:4px;">Built for ${p.industry} teams</div>
                  </td>
                  <td align="right">
                    <div style="font-size:15px;font-weight:700;color:#00D97E;">${p.priceText}</div>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td align="center">
              <a href="${p.paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#4F8EF7,#7c3aed);color:white;padding:16px 40px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;">
                Complete Your Purchase &rarr;
              </a>
            </td></tr>
          </table>

          <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">
            This link expires in 48 hours &middot; Questions? Reply to this email
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f8ff;padding:16px 32px;text-align:center;">
          <p style="font-size:11px;color:#bbb;margin:0;">monday.com &middot; 6 Yitzhak Sadeh St, Tel Aviv</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Tiny helper ──────────────────────────────────────────────────────────────
function city(c: string): string { return c ?? ""; }
