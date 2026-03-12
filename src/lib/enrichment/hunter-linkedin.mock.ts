import type { HunterMockResult, LinkedInMockResult } from "@/types";

// ─── Hunter.io email verification mock ───────────────────────────────────────
// Real API: GET https://api.hunter.io/v2/email-verifier?email={email}&api_key={key}
// Response shape mirrors Hunter's actual response.

const DOMAIN_RISK: Record<string, HunterMockResult["result"]> = {
  "gmail.com":    "risky",
  "yahoo.com":    "risky",
  "hotmail.com":  "risky",
  "outlook.com":  "risky",
};

export function mockHunter(email: string): HunterMockResult {
  const domain = email.split("@")[1] ?? "";
  const isPersonal = domain in DOMAIN_RISK;

  return {
    result:  isPersonal ? "risky" : "deliverable",
    score:   isPersonal ? 42 + Math.floor(Math.random() * 20) : 72 + Math.floor(Math.random() * 25),
    sources: isPersonal ? 0 : 1 + Math.floor(Math.random() * 5),
  };
}

// ─── LinkedIn / Proxycurl mock ────────────────────────────────────────────────
// Real API: GET https://nubela.co/proxycurl/api/v2/linkedin?linkedin_profile_url=...
// Headers: Authorization: Bearer {PROXYCURL_KEY}

const RECENT_POSTS = [
  "Shared an article about scaling remote engineering teams",
  "Posted about lessons learned building a product org from scratch",
  "Liked a post about OKR frameworks for fast-growing startups",
  "Commented on a discussion about AI in project management",
  "Shared a case study on reducing context-switching in teams",
  "Reacted to a post about async-first work culture",
];

export function mockLinkedIn(title: string, company: string, connections: number): LinkedInMockResult {
  const post = RECENT_POSTS[Math.floor(Math.random() * RECENT_POSTS.length)];
  return {
    headline:          `${title} at ${company}`,
    connections,
    recentPost:        post,
    mutualConnections: Math.floor(Math.random() * 12),
  };
}
