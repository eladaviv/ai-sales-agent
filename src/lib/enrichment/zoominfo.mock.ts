import type { ZoomInfoMockResult } from "@/types";

// ─── ZoomInfo intent signal mock ─────────────────────────────────────────────
// Mirrors the real ZoomInfo Enrich API response:
// POST https://api.zoominfo.com/enrich/company
// Headers: Authorization: Bearer {JWT}
//
// Key fields used:
//   intentDataList[].topic      → what they're researching
//   intentDataList[].score      → signal strength 0-100
//   techUsed[].name             → current tech stack
//   funding.fundingStage        → latest funding round
//   employeeGrowthRate          → hiring signal

// ─── Tech stacks by industry ──────────────────────────────────────────────────
const TECH_STACKS: Record<string, string[]> = {
  "Technology":         ["Jira", "Confluence", "Slack", "GitHub", "Figma", "Notion"],
  "B2B SaaS":          ["Jira", "Notion", "Slack", "HubSpot", "Intercom", "Zapier"],
  "Digital Marketing":  ["Asana", "HubSpot", "Figma", "Slack", "Trello", "Google Workspace"],
  "Construction":       ["Procore", "Microsoft Excel", "WhatsApp", "AutoCAD", "Sage"],
  "Healthcare":         ["Salesforce", "Microsoft Teams", "Google Sheets", "Slack", "Zoom"],
  "FinTech":            ["Jira", "Confluence", "Slack", "Salesforce", "Tableau", "Notion"],
  "Retail / eCommerce": ["Shopify", "Trello", "Google Sheets", "Slack", "Zendesk"],
  "default":            ["Notion", "Slack", "Trello", "Google Workspace", "Zoom"],
};

// ─── Intent topics by industry ────────────────────────────────────────────────
const INTENT_TOPICS: Record<string, string[]> = {
  "Technology":         ["project management software", "team collaboration tools", "agile planning", "work OS", "sprint tracking"],
  "B2B SaaS":          ["workflow automation", "project visibility", "cross-team alignment", "OKR tracking", "roadmap planning"],
  "Digital Marketing":  ["creative project management", "client reporting", "campaign tracker", "agency management software"],
  "Construction":       ["construction project management", "subcontractor scheduling", "site reporting", "bid management"],
  "Healthcare":         ["compliance tracking", "patient workflow", "cross-department coordination", "HIPAA-compliant PM"],
  "FinTech":            ["regulatory compliance tracking", "product roadmap", "team alignment", "sprint planning"],
  "Retail / eCommerce": ["inventory management", "store operations", "marketing calendar", "vendor management"],
  "default":            ["project management", "team productivity", "task tracking", "workflow automation"],
};

// ─── Recent activity signals by stage ────────────────────────────────────────
const RECENT_ACTIVITIES: Record<string, string> = {
  "Seed ($1.2M)":          "Actively hiring — 8 open roles in Engineering & Ops",
  "Series A ($4.2M)":      "Scaling team 40% YoY — looking to streamline operations",
  "Series A ($8M)":        "Recently opened 2 new offices, expanding headcount",
  "Series B ($12M)":       "Post-Series B scaling phase — ops tooling top priority",
  "Series C ($35M)":       "Enterprise expansion — compliance & process standardization",
  "Private Equity":        "PE-backed growth — consolidating tooling across divisions",
  "IPO":                   "Public company — enterprise procurement process",
  "Bootstrapped":          "Lean team, high ROI focus — cost-conscious buyer",
  "default":               "Growing operations — evaluating productivity tools",
};

function getTopics(industry: string): string[] {
  return INTENT_TOPICS[industry] ?? INTENT_TOPICS["default"];
}

function getStack(industry: string): string[] {
  return TECH_STACKS[industry] ?? TECH_STACKS["default"];
}

function calcIntentScore(employees: number, raised: string): number {
  let score = 40;
  if (employees > 20 && employees < 500) score += 20;
  if (raised.includes("Series") || raised.includes("IPO")) score += 25;
  if (raised.includes("Bootstrapped")) score -= 10;
  return Math.min(score + Math.floor(Math.random() * 15), 95);
}

export function mockZoomInfo(industry: string, employees: number, raised: string): ZoomInfoMockResult {
  const topics = getTopics(industry);
  const stack = getStack(industry);
  const intentScore = calcIntentScore(employees, raised);

  // Pick top 3 intent topics (highest signal)
  const topTopics = topics.slice(0, 3);

  // Employee growth rate based on funding
  const growthRate =
    raised.includes("Series C") ? "+38% YoY" :
    raised.includes("Series B") ? "+27% YoY" :
    raised.includes("Series A") ? "+45% YoY" :
    raised.includes("Seed")     ? "+60% YoY" :
    raised.includes("IPO")      ? "+12% YoY" :
    raised.includes("Bootstrap")? "+8% YoY"  :
    "+15% YoY";

  // Recent funding amount
  const fundingMatch = raised.match(/\$[\d.]+[MB]/);
  const recentFundingAmount = fundingMatch ? fundingMatch[0] : null;

  const recentActivity =
    RECENT_ACTIVITIES[raised] ?? RECENT_ACTIVITIES["default"];

  return {
    intentTopics: topTopics,
    intentScore,
    techStack: stack.slice(0, 4),
    fundingStage: raised,
    recentFundingAmount,
    employeeGrowthRate: growthRate,
    recentActivity,
  };
}
