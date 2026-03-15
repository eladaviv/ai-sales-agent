import type {
  EnrichmentResult, GeoResult, IntentSignals,
  LeadMeta, PlanRecommendation, PersonProfile,
} from "@/types";
import { enrichPerson, enrichCompany } from "@/lib/explorium/client";
import { PLAN_PRICES } from "@/constants";

function buildGeo(country: string, city: string): GeoResult {
  const timezones: Record<string, string> = {
    US: "America/New_York", IL: "Asia/Jerusalem", UK: "Europe/London",
    GB: "Europe/London",    DE: "Europe/Berlin",  AU: "Australia/Sydney",
    FR: "Europe/Paris",     CA: "America/Toronto", SG: "Asia/Singapore",
  };
  const languages: Record<string, string> = {
    US: "en-US", IL: "he-IL", UK: "en-GB", GB: "en-GB",
    DE: "de-DE", AU: "en-AU", FR: "fr-FR", CA: "en-CA", SG: "en-SG",
  };
  return {
    country, countryCode: country, city,
    timezone: timezones[country] ?? "America/New_York",
    language: languages[country] ?? "en-US",
  };
}

function scoreLead(params: {
  emailScore: number; seniority: PersonProfile["seniority"];
  employees: number; raised: string; intentScore: number;
}): { score: number; priority: LeadMeta["priority"] } {
  let score = 0;
  score += Math.round((params.emailScore / 100) * 20);
  score += { executive: 30, director: 22, manager: 14, individual: 7 }[params.seniority];
  const emp = params.employees;
  score += (emp >= 10 && emp <= 500) ? 20 : emp < 10 ? 8 : 12;
  if      (params.raised.includes("Series C") || params.raised.includes("IPO")) score += 15;
  else if (params.raised.includes("Series B"))  score += 12;
  else if (params.raised.includes("Series A"))  score += 9;
  else if (params.raised.includes("Seed"))      score += 6;
  else                                          score += 3;
  score += Math.round((params.intentScore / 100) * 15);
  const capped = Math.min(score, 100);
  return { score: capped, priority: capped >= 70 ? "High" : capped >= 45 ? "Medium" : "Low" };
}

function recommendPlan(employees: number): PlanRecommendation {
  const plan        = employees <= 10 ? "Pro" : employees <= 100 ? "Business" : "Enterprise";
  const pricePerSeat = PLAN_PRICES[plan];
  const seats       = Math.max(3, Math.min(Math.ceil(employees * 0.2), 50));
  const monthlyTotal = pricePerSeat ? pricePerSeat * seats : null;
  return { plan, pricePerSeat, seats, monthlyTotal };
}

export async function enrichLead(
  email:       string,
  firstName:   string,
  lastName:    string,
  companyName: string,
  mondayItemId: string,
): Promise<EnrichmentResult> {
  const domain = email.split("@")[1] ?? "unknown.com";

  // Both calls use Explorium if key is set, fall back to mocks automatically
  const [personData, companyData] = await Promise.all([
    enrichPerson(email, firstName, lastName),
    enrichCompany(companyName, domain),
  ]);

  const fullName = `${firstName} ${lastName}`.trim();

  const person: PersonProfile = {
    // `name` is the single field all existing chat/sidebar/prompt code uses
    name:        fullName,
    firstName,
    lastName,
    email,
    phone:       "",
    title:       personData.title,
    seniority:   personData.seniority,
    isSenior:    ["executive", "director"].includes(personData.seniority),
    linkedinUrl: personData.linkedinUrl,
    connections: 300 + Math.floor(Math.random() * 500),
    emailScore:  personData.emailScore,
  };

  const intent: IntentSignals = {
    topics:         companyData.intentTopics,
    techStack:      companyData.techStack,
    buyingScore:    companyData.intentScore,
    fundingStage:   companyData.fundingStage,
    recentActivity: companyData.recentActivity,
  };

  const geo            = buildGeo(companyData.country, companyData.city);
  const recommendation = recommendPlan(companyData.employees);

  const { score: leadScore, priority } = scoreLead({
    emailScore:  personData.emailScore,
    seniority:   personData.seniority,
    employees:   companyData.employees,
    raised:      companyData.raised,
    intentScore: companyData.intentScore,
  });

  const meta: LeadMeta = {
    leadScore,
    emailScore: personData.emailScore,
    priority,
    sources: process.env.EXPLORIUM_API_KEY
      ? ["Explorium Person API", "Explorium Company API"]
      : ["Clearbit mock", "ZoomInfo mock", "Hunter mock"],
  };

  return {
    person,
    company: {
      name:          companyData.name,
      domain:        companyData.domain,
      industry:      companyData.industry,
      employees:     companyData.employees,
      raised:        companyData.raised,
      country:       companyData.country,
      city:          companyData.city,
      annualRevenue: companyData.annualRevenue,
      description:   companyData.description,
      website:       companyData.website,
    },
    intent,
    geo,
    recommendation,
    meta,
    enrichedAt:   new Date().toISOString(),
    mondayItemId, // carry the monday item ID through the whole flow
  };
}
