import { NextRequest, NextResponse } from "next/server";
import { enrichLead } from "@/lib/enrichment";
import { setLeadStatus, writeEnrichmentData } from "@/lib/monday/leads";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, firstName, lastName, companyName, mondayItemId } = body as {
      email: string; firstName: string; lastName: string;
      companyName: string; mondayItemId: string;
    };

    if (!email || !firstName || !lastName || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Mark status → Enrichment on the monday board immediately
    await setLeadStatus(mondayItemId ?? "", "Enrichment");

    // 2. Run Explorium enrichment (falls back to mocks automatically)
    const profile = await enrichLead(email, firstName, lastName, companyName, mondayItemId ?? "");

    // 3. Write all enrichment data back to the monday board item
    await writeEnrichmentData(mondayItemId ?? "", profile);

    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrichment failed";
    console.error("[/api/enrich]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
