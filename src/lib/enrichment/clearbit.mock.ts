import type { ClearbitMockResult, CompanyProfile } from "@/types";

// ─── Company profiles keyed by domain keyword ─────────────────────────────────
// These mirror real Clearbit API response shapes.
// Replace with: GET https://person.clearbit.com/v2/combined/find?email={email}
// Headers: Authorization: Bearer YOUR_CLEARBIT_KEY

const COMPANY_PROFILES: Record<string, Partial<CompanyProfile>> = {
  google: {
    name: "Google",
    industry: "Technology",
    employees: 182000,
    raised: "IPO",
    country: "US",
    city: "Mountain View",
    annualRevenue: "$280B",
    description: "Search, cloud, and AI platform",
  },
  microsoft: {
    name: "Microsoft",
    industry: "Technology",
    employees: 221000,
    raised: "IPO",
    country: "US",
    city: "Redmond",
    annualRevenue: "$211B",
    description: "Enterprise software and cloud services",
  },
  startup: {
    name: "Startup.io",
    industry: "B2B SaaS",
    employees: 38,
    raised: "Series A ($4.2M)",
    country: "IL",
    city: "Tel Aviv",
    annualRevenue: "$2.1M ARR",
    description: "B2B SaaS productivity platform",
  },
  agency: {
    name: "Agency Creative",
    industry: "Digital Marketing",
    employees: 22,
    raised: "Bootstrapped",
    country: "US",
    city: "New York",
    annualRevenue: "$1.4M",
    description: "Full-service digital marketing agency",
  },
  build: {
    name: "BuildRight Inc",
    industry: "Construction",
    employees: 190,
    raised: "Private Equity",
    country: "US",
    city: "Chicago",
    annualRevenue: "$18M",
    description: "Commercial general contractor",
  },
  health: {
    name: "HealthOps",
    industry: "Healthcare",
    employees: 65,
    raised: "Series B ($12M)",
    country: "US",
    city: "Boston",
    annualRevenue: "$5M ARR",
    description: "Healthcare operations software",
  },
  finance: {
    name: "FinanceFlow",
    industry: "FinTech",
    employees: 120,
    raised: "Series C ($35M)",
    country: "UK",
    city: "London",
    annualRevenue: "$14M ARR",
    description: "B2B financial workflow automation",
  },
  retail: {
    name: "RetailHub",
    industry: "Retail / eCommerce",
    employees: 85,
    raised: "Series A ($8M)",
    country: "US",
    city: "Austin",
    annualRevenue: "$22M",
    description: "Omnichannel retail operations platform",
  },
};

const TITLES_BY_SENIORITY = {
  executive: ["CEO", "CTO", "CFO", "COO", "Co-Founder & CEO", "President", "VP Engineering", "VP Product"],
  director:  ["Director of Operations", "Director of Engineering", "Director of Marketing", "Head of Product", "Head of Growth"],
  manager:   ["Senior Project Manager", "Operations Manager", "Product Manager", "Engineering Manager", "Marketing Manager"],
  individual: ["Senior Software Engineer", "Product Designer", "Data Analyst", "Business Analyst", "Marketing Specialist"],
} as const;

function pickTitle(seniority: keyof typeof TITLES_BY_SENIORITY): string {
  const arr = TITLES_BY_SENIORITY[seniority];
  return arr[Math.floor(Math.random() * arr.length)];
}

function inferSeniority(employees: number): "executive" | "director" | "manager" | "individual" {
  // Small companies have higher chance of executive contact
  if (employees < 20) return Math.random() > 0.3 ? "executive" : "manager";
  if (employees < 100) return Math.random() > 0.5 ? "director" : "manager";
  return Math.random() > 0.6 ? "manager" : "individual";
}

export function mockClearbit(domain: string, name: string): ClearbitMockResult {
  const keyword = Object.keys(COMPANY_PROFILES).find((k) => domain.includes(k));
  const companyData = keyword ? COMPANY_PROFILES[keyword] : null;

  const fallbackCompanyName =
    domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

  const company: CompanyProfile = {
    name: companyData?.name ?? fallbackCompanyName,
    domain,
    industry: companyData?.industry ?? "Technology",
    employees: companyData?.employees ?? 45,
    raised: companyData?.raised ?? "Seed ($1.2M)",
    country: companyData?.country ?? "US",
    city: companyData?.city ?? "San Francisco",
    annualRevenue: companyData?.annualRevenue ?? "$1.8M ARR",
    description: companyData?.description ?? "Growing technology company",
  };

  const seniority = inferSeniority(company.employees);
  const title = pickTitle(seniority);

  return {
    person: {
      title,
      seniority,
      linkedinUrl: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, "-")}`,
      connections: 300 + Math.floor(Math.random() * 600),
    },
    company,
  };
}
