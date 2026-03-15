// ─── Explorium API Client ─────────────────────────────────────────────────────
// Docs: https://docs.explorium.ai/reference
// Set EXPLORIUM_API_KEY in .env.local to use real data.
// On ANY failure (missing key, network error, bad response) falls back
// to the existing mocks so the flow never breaks.

import type { ExploriumPersonResult, ExploriumCompanyResult } from "@/types";
import { mockClearbit } from "@/lib/enrichment/clearbit.mock";
import { mockZoomInfo } from "@/lib/enrichment/zoominfo.mock";
import { mockHunter } from "@/lib/enrichment/hunter-linkedin.mock";

const BASE_URL = "https://api.explorium.ai/v1";

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.EXPLORIUM_API_KEY ?? "",
  };
}

function mapSeniority(raw: string): ExploriumPersonResult["seniority"] {
  const s = raw.toLowerCase();
  if (s.includes("c-level") || s.includes("executive") || s.includes("ceo") ||
      s.includes("cto") || s.includes("coo") || s.includes("founder") || s.includes("chief")) {
    return "executive";
  }
  if (s.includes("director") || s.includes("vp") || s.includes("vice president") || s.includes("head of")) {
    return "director";
  }
  if (s.includes("manager") || s.includes("lead") || s.includes("principal")) {
    return "manager";
  }
  return "individual";
}

function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean).slice(0, 5);
  if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean).slice(0, 5);
  return [];
}

// ─── Person enrichment ────────────────────────────────────────────────────────
// POST /enrichment/persons/enrich
// Falls back to mockClearbit + mockHunter on any error

export async function enrichPerson(
  email: string,
  firstName: string,
  lastName: string,
): Promise<ExploriumPersonResult> {
  const apiKey = process.env.EXPLORIUM_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(`${BASE_URL}/enrichment/persons/enrich`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          data: [{ email, first_name: firstName, last_name: lastName }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        const r = json?.data?.[0] ?? json?.results?.[0] ?? {};

        const title = r.job_title ?? r.title ?? r.current_title ?? "";
        const rawSeniority = r.seniority_level ?? r.seniority ?? r.job_level ?? "";

        if (title) {
          return {
            title,
            seniority:   mapSeniority(rawSeniority || title),
            linkedinUrl: r.linkedin_url ?? r.linkedin_profile_url ?? "",
            emailScore:  Math.min(100, Math.max(0, Number(r.email_confidence ?? r.email_score ?? 75))),
          };
        }
      } else {
        console.warn(`[Explorium] Person enrich HTTP ${res.status}:`, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.warn("[Explorium] Person enrich failed, using mock:", (err as Error).message);
    }
  }

  // ── Fallback: use clearbit mock + hunter mock ─────────────────────────────
  const domain = email.split("@")[1] ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  const cb = mockClearbit(domain, fullName);
  const hunter = mockHunter(email);

  return {
    title:       cb.person.title,
    seniority:   cb.person.seniority,
    linkedinUrl: `linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
    emailScore:  hunter.score,
  };
}

// ─── Company enrichment ───────────────────────────────────────────────────────
// POST /enrichment/businesses/enrich
// Falls back to mockClearbit + mockZoomInfo on any error

export async function enrichCompany(
  companyName: string,
  domain: string,
): Promise<ExploriumCompanyResult> {
  const apiKey = process.env.EXPLORIUM_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(`${BASE_URL}/enrichment/businesses/enrich`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          data: [{ company_name: companyName, domain }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        const r = json?.data?.[0] ?? json?.results?.[0] ?? {};

        const employees = Number(r.employee_count ?? r.employees ?? r.headcount ?? 0);
        const industry = r.industry ?? r.primary_industry ?? r.vertical ?? "";
        const raised = r.total_funding_str ?? r.total_funding ?? r.last_funding_round ?? "Unknown";

        if (industry || employees) {
          return {
            name:           r.company_name ?? r.name ?? companyName,
            domain:         r.domain ?? domain,
            industry:       industry || "Technology",
            employees:      employees || 50,
            raised,
            country:        r.country ?? r.hq_country ?? "US",
            city:           r.city ?? r.hq_city ?? "",
            annualRevenue:  r.annual_revenue ?? r.revenue ?? "Unknown",
            description:    r.description ?? r.tagline ?? r.short_description ?? "",
            website:        r.website ?? r.website_url ?? `https://${domain}`,
            techStack:      toArray(r.technologies ?? r.tech_stack ?? r.techstack),
            intentTopics:   toArray(r.intent_topics ?? r.buying_signals ?? r.topics),
            intentScore:    Math.min(100, Math.max(0, Number(r.intent_score ?? r.buying_intent_score ?? 50))),
            fundingStage:   r.funding_stage ?? r.last_funding_type ?? r.funding_round ?? "Unknown",
            recentActivity: r.recent_news ?? r.news_summary ?? r.recent_activity ?? "",
          };
        }
      } else {
        console.warn(`[Explorium] Company enrich HTTP ${res.status}:`, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.warn("[Explorium] Company enrich failed, using mock:", (err as Error).message);
    }
  }

  // ── Fallback: use clearbit mock + zoominfo mock ───────────────────────────
  const cb = mockClearbit(domain, companyName);
  const zi = mockZoomInfo(cb.company.industry, cb.company.employees, cb.company.raised);

  return {
    name:           cb.company.name,
    domain:         cb.company.domain,
    industry:       cb.company.industry,
    employees:      cb.company.employees,
    raised:         cb.company.raised,
    country:        cb.company.country,
    city:           cb.company.city,
    annualRevenue:  cb.company.annualRevenue,
    description:    cb.company.description,
    website:        `https://${domain}`,
    techStack:      zi.techStack,
    intentTopics:   zi.intentTopics,
    intentScore:    zi.intentScore,
    fundingStage:   zi.fundingStage,
    recentActivity: zi.recentActivity,
  };
}
