import { NextRequest, NextResponse } from "next/server";
import { createLeadItem } from "@/lib/monday/leads";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, companyName } = await req.json();

    if (!firstName || !lastName || !email || !phone || !companyName) {
      return NextResponse.json({ error: "All 5 fields are required" }, { status: 400 });
    }

    const mondayItem = await createLeadItem({ firstName, lastName, email, phone, companyName });

    return NextResponse.json({ mondayItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Intake failed";
    console.error("[/api/intake]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
