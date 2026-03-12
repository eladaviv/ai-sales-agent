import { NextRequest, NextResponse } from "next/server";
import { enrichLead } from "@/lib/enrichment";
import { fireN8nEvent } from "@/lib/n8n/client";
import { N8N_EVENTS } from "@/constants";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = (await req.json()) as { email: string; name: string };

    if (!email || !name) {
      return NextResponse.json({ error: "email and name are required" }, { status: 400 });
    }

    const profile = await enrichLead(email, name);

    // Fire n8n lead-captured workflow (non-blocking)
    void fireN8nEvent(N8N_EVENTS.LEAD_CAPTURED, {
      email,
      name,
      company:    profile.company.name,
      industry:   profile.company.industry,
      employees:  profile.company.employees,
      leadScore:  profile.meta.leadScore,
      plan:       profile.recommendation.plan,
    });

    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrichment failed";
    console.error("[/api/enrich]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
