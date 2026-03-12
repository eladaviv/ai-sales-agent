import type { EnrichmentResult, GeoResult, IntentSignals, LeadMeta, PlanRecommendation, PersonProfile } from "@/types";
import { mockClearbit } from "./clearbit.mock";
import { mockHunter, mockLinkedIn } from "./hunter-linkedin.mock";
import { mockZoomInfo } from "./zoominfo.mock";
import { PLAN_PRICES } from "@/constants";

// ─── Geo mock (real: GET https://ipapi.co/json/) ──────────────────────────────
function mockGeo(country: string, city: string): GeoResult {
  const timezones: Record<string, string> = {
    US: "America/New_York",
    IL: "Asia/Jerusalem",
    UK: "Europe/London",
    DE: "Europe/Berlin",
    AU: "Australia/Sydney",
  };

  const languages: Record<string, string> = {
    US: "en-US", IL: "he-IL", UK: "en-GB", DE: "de-DE", AU: "en-AU",
  };

  return {
    country,
    countryCode: country,
    city,
    timezone: timezones[country] ?? "America/New_York",
    language: languages[country] ?? "en-US",
  };
}

// ─── Lead scoring algorithm ───────────────────────────────────────────────────
function scoreLead(params: {
  emailScore: number;
  seniority:  PersonProfile["seniority"];
  employees:  number;
  raised:     string;
  intentScore: number;
}): { score: number; priority: LeadMeta["priority"] } {
  let score = 0;

  // Email quality (max 20)
  score += Math.round((params.emailScore / 100) * 20);

  // Seniority (max 30)
  const seniorityPoints = { executive: 30, director: 22, manager: 14, individual: 7 };
  score += seniorityPoints[params.seniority];

  // Company size sweet spot (max 20)
  const emp = params.employees;
  if (emp >= 10 && emp <= 500) score += 20;
  else if (emp < 10) score += 8;
  else score += 12;

  // Funding signal (max 15)
  if (params.raised.includes("Series C") || params.raised.includes("IPO")) score += 15;
  else if (params.raised.includes("Series B")) score += 12;
  else if (params.raised.includes("Series A")) score += 9;
  else if (params.raised.includes("Seed")) score += 6;
  else score += 3;

  // Intent score (max 15)
  score += Math.round((params.intentScore / 100) * 15);

  const capped = Math.min(score, 100);
  const priority: LeadMeta["priority"] =
    capped >= 70 ? "High" : capped >= 45 ? "Medium" : "Low";

  return { score: capped, priority };
}

// ─── Plan recommendation ──────────────────────────────────────────────────────
function recommendPlan(employees: number): PlanRecommendation {
  const plan =
    employees <= 10 ? "Pro" :
    employees <= 100 ? "Business" :
    "Enterprise";

  const pricePerSeat = PLAN_PRICES[plan];
  const seats = Math.max(3, Math.min(Math.ceil(employees * 0.2), 50));
  const monthlyTotal = pricePerSeat ? pricePerSeat * seats : null;

  return { plan, pricePerSeat, seats, monthlyTotal };
}

// ─── Main enrichment function ─────────────────────────────────────────────────
// In production: replace each mock call with real HTTP requests
// routed through a backend (Next.js API route or n8n) to avoid CORS.

export async function enrichLead(email: string, name: string): Promise<EnrichmentResult> {
  const domain = email.split("@")[1] ?? "unknown.com";

  // Simulate realistic API latency (remove in prod — real calls take 400-1200ms)
  await new Promise((r) => setTimeout(r, 50));

  // ── Source 1: Clearbit ────────────────────────────────────────────────────
  const clearbit = mockClearbit(domain, name);

  // ── Source 2: Hunter.io ───────────────────────────────────────────────────
  const hunter = mockHunter(email);

  // ── Source 3: LinkedIn / Proxycurl ────────────────────────────────────────
  const linkedin = mockLinkedIn(
    clearbit.person.title,
    clearbit.company.name,
    clearbit.person.connections,
  );

  // ── Source 4: ZoomInfo ────────────────────────────────────────────────────
  const zoominfo = mockZoomInfo(
    clearbit.company.industry,
    clearbit.company.employees,
    clearbit.company.raised,
  );

  // ── Source 5: IPapi geo ───────────────────────────────────────────────────
  const geo = mockGeo(clearbit.company.country, clearbit.company.city);

  // ── Compose final result ──────────────────────────────────────────────────
  const person: PersonProfile = {
    name,
    email,
    title:       clearbit.person.title,
    seniority:   clearbit.person.seniority,
    isSenior:    ["executive", "director"].includes(clearbit.person.seniority),
    linkedinUrl: clearbit.person.linkedinUrl,
    connections: linkedin.connections,
    emailScore:  hunter.score,
  };

  const intent: IntentSignals = {
    topics:       zoominfo.intentTopics,
    techStack:    zoominfo.techStack,
    buyingScore:  zoominfo.intentScore,
    fundingStage: zoominfo.fundingStage,
    recentActivity: zoominfo.recentActivity,
  };

  const recommendation = recommendPlan(clearbit.company.employees);

  const { score: leadScore, priority } = scoreLead({
    emailScore:  hunter.score,
    seniority:   clearbit.person.seniority,
    employees:   clearbit.company.employees,
    raised:      clearbit.company.raised,
    intentScore: zoominfo.intentScore,
  });

  const meta: LeadMeta = {
    leadScore,
    emailScore: hunter.score,
    priority,
    sources: ["Clearbit", "Hunter.io", "LinkedIn", "ZoomInfo", "IPapi"],
  };

  return {
    person,
    company: clearbit.company,
    intent,
    geo,
    recommendation,
    meta,
    enrichedAt: new Date().toISOString(),
  };
}
