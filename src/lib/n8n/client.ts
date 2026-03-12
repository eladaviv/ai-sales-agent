import { N8N_EVENTS } from "@/constants";

type N8nEventName = (typeof N8N_EVENTS)[keyof typeof N8N_EVENTS];

interface N8nPayload extends Record<string, unknown> {
  event: N8nEventName;
  ts:    number;
}

// ─── Fire-and-forget webhook to n8n ─────────────────────────────────────────
// Called server-side from the API routes.
// If N8N_BASE_URL is not set, silently skips (dev mode).

export async function fireN8nEvent(
  event: N8nEventName,
  data: Record<string, unknown>,
): Promise<void> {
  const baseUrl = process.env.N8N_BASE_URL;
  if (!baseUrl) {
    console.log(`[n8n mock] ${event}`, data);
    return;
  }

  const payload: N8nPayload = { event, ts: Date.now(), ...data };

  try {
    await fetch(`${baseUrl}/${event}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5000), // don't block on n8n timeouts
    });
  } catch (err) {
    // n8n failures should never break the main flow
    console.warn(`[n8n] Failed to fire ${event}:`, err);
  }
}
