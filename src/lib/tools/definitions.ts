import type { AgentTool, BoardConfig, CallNotes, PaymentTrigger } from "@/types";

// ─── Tool definitions (sent to Anthropic API) ─────────────────────────────────
// These tell Claude exactly when and how to call each tool.

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "save_call_notes",
    description:
      "Save structured notes captured during the conversation. Call this once you've understood the prospect's pain point, use case, and timeline. This triggers the n8n workflow to update the CRM.",
    input_schema: {
      type: "object",
      properties: {
        pain_point: {
          type: "string",
          description: "The prospect's primary challenge or frustration",
        },
        use_case: {
          type: "string",
          description: "The main monday.com use case that fits them (e.g. 'project management', 'CRM', 'marketing campaigns')",
        },
        decision_timeline: {
          type: "string",
          enum: ["immediate", "this_quarter", "exploring"],
          description: "How urgently they want to move forward",
        },
        budget_confirmed: {
          type: "boolean",
          description: "Whether they've confirmed willingness to pay",
        },
        additional_context: {
          type: "string",
          description: "Any other relevant detail from the conversation",
        },
      },
      required: ["pain_point", "use_case", "decision_timeline", "budget_confirmed"],
    },
  },

  {
    name: "generate_board",
    description:
      "Generate a custom monday.com board configuration tailored to the prospect's use case, industry, and team. Call this when you have enough context to build a relevant demo board. This will immediately create a real board in monday.com via the API.",
    input_schema: {
      type: "object",
      properties: {
        board_name: {
          type: "string",
          description: "Descriptive board name, e.g. 'Acme Marketing Campaigns Q3'",
        },
        use_case: {
          type: "string",
          description: "The business use case this board addresses",
        },
        groups: {
          type: "array",
          items: { type: "string" },
          description: "3-4 group names (columns in the board), e.g. ['Planning', 'In Progress', 'Review', 'Done']",
        },
        sample_items: {
          type: "array",
          description: "6-10 realistic sample tasks/items that reflect their actual work",
          items: {
            type: "object",
            properties: {
              name:     { type: "string", description: "Task name" },
              group:    { type: "string", description: "Which group this item belongs to" },
              status:   { type: "string", enum: ["Done", "Working on it", "Stuck", "Not started"] },
              priority: { type: "string", enum: ["Critical", "High", "Medium", "Low"] },
            },
            required: ["name", "group", "status", "priority"],
          },
        },
        recommended_plan: {
          type: "string",
          enum: ["Pro", "Business", "Enterprise"],
          description: "The monday.com plan that best fits their needs",
        },
        monthly_price: {
          type: "number",
          description: "Price per seat per month for the recommended plan",
        },
      },
      required: ["board_name", "use_case", "groups", "sample_items", "recommended_plan", "monthly_price"],
    },
  },

  {
    name: "trigger_payment",
    description:
      "Trigger the payment flow when the prospect is ready to purchase. Call this when they've expressed intent to buy or asked how to get started. This sends a personalized payment link to their email via Stripe + SendGrid through n8n.",
    input_schema: {
      type: "object",
      properties: {
        plan: {
          type: "string",
          enum: ["Pro", "Business", "Enterprise"],
        },
        seats: {
          type: "number",
          description: "Number of seats recommended",
        },
        monthly_total: {
          type: "number",
          description: "Total monthly cost (price_per_seat × seats)",
        },
        use_case: {
          type: "string",
          description: "Main use case, used to personalize the email",
        },
      },
      required: ["plan", "seats", "monthly_total", "use_case"],
    },
  },
];

// ─── Tool input parsers ───────────────────────────────────────────────────────
// These validate and shape the raw tool inputs from Claude into typed objects.

export function parseCallNotes(input: Record<string, unknown>): CallNotes {
  return {
    painPoint:         String(input.pain_point ?? ""),
    useCase:           String(input.use_case ?? ""),
    decisionTimeline:  String(input.decision_timeline ?? "exploring"),
    budgetConfirmed:   Boolean(input.budget_confirmed),
    additionalContext: String(input.additional_context ?? ""),
  };
}

export function parseBoardConfig(input: Record<string, unknown>): BoardConfig {
  const rawItems = (input.sample_items as Array<Record<string, unknown>>) ?? [];

  return {
    boardName:       String(input.board_name ?? "My Board"),
    useCase:         String(input.use_case ?? ""),
    groups:          (input.groups as string[]) ?? [],
    sampleItems:     rawItems.map((item) => ({
      name:     String(item.name ?? ""),
      group:    String(item.group ?? ""),
      status:   (item.status as BoardConfig["sampleItems"][0]["status"]) ?? "Not started",
      priority: (item.priority as BoardConfig["sampleItems"][0]["priority"]) ?? "Medium",
    })),
    recommendedPlan: (input.recommended_plan as BoardConfig["recommendedPlan"]) ?? "Pro",
    monthlyPrice:    Number(input.monthly_price ?? 12),
  };
}

export function parsePaymentTrigger(
  input: Record<string, unknown>,
  profile: { name: string; email: string; company: string },
): PaymentTrigger {
  return {
    plan:         (input.plan as PaymentTrigger["plan"]) ?? "Pro",
    seats:        Number(input.seats ?? 3),
    monthlyTotal: Number(input.monthly_total ?? 0),
    stripeUrl:    `https://buy.stripe.com/mock_${Date.now()}`,
    prospectName: profile.name,
    company:      profile.company,
    email:        profile.email,
    industry:     "",
    useCase:      String(input.use_case ?? ""),
  };
}
