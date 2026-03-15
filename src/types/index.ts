// ─── Lead form (5-field intake) ───────────────────────────────────────────────

export interface LeadFormData {
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  companyName: string;
}

// ─── Person — keeps `name` for all existing chat/sidebar/prompt code ──────────

export interface PersonProfile {
  // Computed full name — used everywhere in existing chat code
  name:        string;
  // Individual fields from the 5-field form / Explorium
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  title:       string;
  seniority:   "executive" | "director" | "manager" | "individual";
  isSenior:    boolean;
  linkedinUrl: string;
  connections: number;
  emailScore:  number;
}

export interface CompanyProfile {
  name:          string;
  domain:        string;
  industry:      string;
  employees:     number;
  raised:        string;
  country:       string;
  city:          string;
  annualRevenue: string;
  description:   string;
  website:       string;
}

export interface IntentSignals {
  topics:         string[];
  techStack:      string[];
  buyingScore:    number;
  fundingStage:   string;
  recentActivity: string;
}

export interface GeoResult {
  country:     string;
  countryCode: string;
  city:        string;
  timezone:    string;
  language:    string;
}

export interface LeadMeta {
  leadScore:  number;
  emailScore: number;
  priority:   "High" | "Medium" | "Low";
  sources:    string[];
}

export interface PlanRecommendation {
  plan:         "Pro" | "Business" | "Enterprise";
  pricePerSeat: number | null;
  seats:        number;
  monthlyTotal: number | null;
}

export interface EnrichmentResult {
  person:         PersonProfile;
  company:        CompanyProfile;
  intent:         IntentSignals;
  geo:            GeoResult;
  recommendation: PlanRecommendation;
  meta:           LeadMeta;
  enrichedAt:     string;
  // Monday.com item ID created on intake — carried through the whole flow
  mondayItemId:   string;
}

// ─── Monday.com ───────────────────────────────────────────────────────────────

export type LeadStatus =
  | "New Lead"
  | "Enrichment"
  | "In Conversation"
  | "Board Sent"
  | "Payment Sent"
  | "Customer"
  | "Lost";

export interface MondayLeadItem {
  itemId:   string;
  boardId:  string;
  itemUrl:  string;
}

export interface MondayUpdateResult {
  success: boolean;
  error?:  string;
}

// ─── Explorium ────────────────────────────────────────────────────────────────

export interface ExploriumPersonResult {
  title:       string;
  seniority:   "executive" | "director" | "manager" | "individual";
  linkedinUrl: string;
  emailScore:  number;
}

export interface ExploriumCompanyResult {
  name:           string;
  domain:         string;
  industry:       string;
  employees:      number;
  raised:         string;
  country:        string;
  city:           string;
  annualRevenue:  string;
  description:    string;
  website:        string;
  techStack:      string[];
  intentTopics:   string[];
  intentScore:    number;
  fundingStage:   string;
  recentActivity: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id:              string;
  role:            MessageRole;
  content:         string;
  timestamp:       Date;
  boardConfig?:    BoardConfig;
  paymentTrigger?: PaymentTrigger;
  callNotes?:      CallNotes;
  mondayResult?:   MondayBoardCreationResult;
}

export interface CallNotes {
  painPoint:         string;
  useCase:           string;
  decisionTimeline:  string;
  budgetConfirmed:   boolean;
  additionalContext: string;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export type BoardItemStatus   = "Done" | "Working on it" | "Stuck" | "Not started";
export type BoardItemPriority = "Critical" | "High" | "Medium" | "Low";

export interface BoardItem {
  name:     string;
  group:    string;
  status:   BoardItemStatus;
  priority: BoardItemPriority;
}

export interface BoardConfig {
  boardName:       string;
  useCase:         string;
  groups:          string[];
  sampleItems:     BoardItem[];
  recommendedPlan: "Pro" | "Business" | "Enterprise";
  monthlyPrice:    number;
}

export interface MondayBoardCreationResult {
  boardId:      string;
  boardUrl:     string;
  itemsCreated: number;
  success:      boolean;
  error?:       string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentTrigger {
  plan:         "Pro" | "Business" | "Enterprise";
  seats:        number;
  monthlyTotal: number;
  stripeUrl:    string;
  prospectName: string;
  company:      string;
  email:        string;
  industry:     string;
  useCase:      string;
}

// ─── Agent tool use ───────────────────────────────────────────────────────────

export interface AgentTool {
  name:         string;
  description:  string;
  input_schema: {
    type:       "object";
    properties: Record<string, unknown>;
    required:   string[];
  };
}

export interface ToolUseBlock {
  type:  "tool_use";
  id:    string;
  name:  string;
  input: Record<string, unknown>;
}

// ─── App state ────────────────────────────────────────────────────────────────

export type AppScreen = "intake" | "enriching" | "chat";

export interface N8nEvent {
  icon:   string;
  label:  string;
  color:  string;
  detail: string;
  time:   string;
}

// ─── Raw Anthropic message history ───────────────────────────────────────────

export interface RawTextContent        { type: "text";        text: string; }
export interface RawToolUseContent     { type: "tool_use";    id: string; name: string; input: Record<string, unknown>; }
export interface RawToolResultContent  { type: "tool_result"; tool_use_id: string; content: string; }
export type RawContentBlock = RawTextContent | RawToolUseContent | RawToolResultContent;

export interface RawMessage {
  role:    "user" | "assistant";
  content: string | RawContentBlock[];
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface ChatRequest {
  rawHistory: RawMessage[];
  profile:    EnrichmentResult;
}

export interface ChatResponse {
  text:             string;
  boardConfig?:     BoardConfig;
  paymentTrigger?:  PaymentTrigger;
  callNotes?:       CallNotes;
  mondayResult?:    MondayBoardCreationResult;
}
