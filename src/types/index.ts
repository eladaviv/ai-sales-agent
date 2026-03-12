// ─── Lead & Enrichment ────────────────────────────────────────────────────────

export interface LeadFormData {
  name: string;
  email: string;
}

export interface PersonProfile {
  name: string;
  email: string;
  title: string;
  seniority: "executive" | "director" | "manager" | "individual";
  isSenior: boolean;
  linkedinUrl: string;
  connections: number;
  emailScore: number;
}

export interface CompanyProfile {
  name: string;
  domain: string;
  industry: string;
  employees: number;
  raised: string;
  country: string;
  city: string;
  annualRevenue: string;
  description: string;
}

export interface IntentSignals {
  topics: string[];
  techStack: string[];
  buyingScore: number;
  fundingStage: string;
  recentActivity: string;
}

export interface ClearbitMockResult {
  person: Pick<PersonProfile, "title" | "seniority" | "linkedinUrl" | "connections">;
  company: CompanyProfile;
}

export interface HunterMockResult {
  result: "deliverable" | "risky" | "invalid";
  score: number;
  sources: number;
}

export interface LinkedInMockResult {
  headline: string;
  connections: number;
  recentPost: string;
  mutualConnections: number;
}

export interface ZoomInfoMockResult {
  intentTopics: string[];
  intentScore: number;
  techStack: string[];
  fundingStage: string;
  recentFundingAmount: string | null;
  employeeGrowthRate: string;
  recentActivity: string;
}

export interface GeoResult {
  country: string;
  countryCode: string;
  city: string;
  timezone: string;
  language: string;
}

export interface EnrichmentResult {
  person: PersonProfile;
  company: CompanyProfile;
  intent: IntentSignals;
  geo: GeoResult;
  recommendation: PlanRecommendation;
  meta: LeadMeta;
  enrichedAt: string;
}

export interface LeadMeta {
  leadScore: number;
  emailScore: number;
  priority: "High" | "Medium" | "Low";
  sources: string[];
}

export interface PlanRecommendation {
  plan: "Pro" | "Business" | "Enterprise";
  pricePerSeat: number | null;
  seats: number;
  monthlyTotal: number | null;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  boardConfig?: BoardConfig;
  paymentTrigger?: PaymentTrigger;
  callNotes?: CallNotes;
  mondayResult?: MondayBoardCreationResult;
}

export interface CallNotes {
  painPoint: string;
  useCase: string;
  decisionTimeline: string;
  budgetConfirmed: boolean;
  additionalContext: string;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export type BoardItemStatus = "Done" | "Working on it" | "Stuck" | "Not started";
export type BoardItemPriority = "Critical" | "High" | "Medium" | "Low";

export interface BoardItem {
  name: string;
  group: string;
  status: BoardItemStatus;
  priority: BoardItemPriority;
}

export interface BoardConfig {
  boardName: string;
  useCase: string;
  groups: string[];
  sampleItems: BoardItem[];
  recommendedPlan: "Pro" | "Business" | "Enterprise";
  monthlyPrice: number;
}

export interface MondayBoardCreationResult {
  boardId: string;
  boardUrl: string;
  itemsCreated: number;
  success: boolean;
  error?: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentTrigger {
  plan: "Pro" | "Business" | "Enterprise";
  seats: number;
  monthlyTotal: number;
  stripeUrl: string;
  prospectName: string;
  company: string;
  email: string;
  industry: string;
  useCase: string;
}

// ─── Agent tool use ───────────────────────────────────────────────────────────

export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

// ─── App state ────────────────────────────────────────────────────────────────

export type AppScreen = "intake" | "enriching" | "chat" | "done";

export interface N8nEvent {
  icon: string;
  label: string;
  color: string;
  detail: string;
  time: string;
}

// ─── Raw Anthropic message history ───────────────────────────────────────────
// Used to preserve the FULL conversation including tool_use and tool_result
// turns. This is what gets sent to the API — not the display ChatMessage[].
// Without these turns in context, Claude forgets it already called tools and
// loops forever in the same stage.

export interface RawTextContent {
  type: "text";
  text: string;
}

export interface RawToolUseContent {
  type:  "tool_use";
  id:    string;
  name:  string;
  input: Record<string, unknown>;
}

export interface RawToolResultContent {
  type:        "tool_result";
  tool_use_id: string;
  content:     string;
}

export type RawContentBlock = RawTextContent | RawToolUseContent | RawToolResultContent;

export interface RawMessage {
  role:    "user" | "assistant";
  content: string | RawContentBlock[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  messages: Array<{ role: MessageRole; content: string }>;
  profile: EnrichmentResult;
}

export interface ChatResponse {
  text: string;
  boardConfig?: BoardConfig;
  paymentTrigger?: PaymentTrigger;
  callNotes?: CallNotes;
  mondayResult?: MondayBoardCreationResult;
}
