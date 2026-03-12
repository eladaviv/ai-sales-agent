import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatResponse, RawMessage, ToolUseBlock } from "@/types";
import { buildSystemPrompt }                           from "@/lib/agents/prompt";
import { AGENT_TOOLS, parseBoardConfig, parseCallNotes, parsePaymentTrigger } from "@/lib/tools/definitions";
import { createMondayBoard }  from "@/lib/monday/client";
import { fireN8nEvent }       from "@/lib/n8n/client";
import { N8N_EVENTS }         from "@/constants";
import type { EnrichmentResult } from "@/types";

// ─── Request shape ────────────────────────────────────────────────────────────
// rawHistory: the FULL Anthropic message array including tool_use / tool_result turns.
// This is the key fix — without the full history, Claude re-enters qualification
// on every request because it has no memory of having called save_call_notes.
interface ChatAPIRequest {
  rawHistory: RawMessage[];
  profile:    EnrichmentResult;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { rawHistory, profile } = (await req.json()) as ChatAPIRequest;

    const systemPrompt = buildSystemPrompt(profile);

    // ── First LLM call ────────────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      AGENT_TOOLS as Parameters<typeof anthropic.messages.create>[0]["tools"],
      messages:   rawHistory as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    // ── Separate text blocks from tool_use blocks ────────────────────────────
    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );

    const result: ChatResponse & { rawHistoryAppend: RawMessage[] } = {
      text:              response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join(""),
      rawHistoryAppend: [],
    };

    // ── No tool calls — return text directly ────────────────────────────────
    if (toolUseBlocks.length === 0) {
      // Append the assistant's reply to the raw history the client holds
      result.rawHistoryAppend = [{ role: "assistant", content: result.text }];
      return NextResponse.json(result);
    }

    // ── Tool calls present ────────────────────────────────────────────────────
    // The raw history for THIS turn must include:
    //   1. The assistant message with the full content array (text + tool_use blocks)
    //   2. A user message with the tool_result blocks
    // Both must be appended together so the client's rawHistory stays consistent.

    const toolResults: Array<{ tool_use_id: string; content: string }> = [];

    for (const tool of toolUseBlocks) {
      let toolOutput = "";

      if (tool.name === "save_call_notes") {
        const notes = parseCallNotes(tool.input);
        result.callNotes = notes;

        void fireN8nEvent(N8N_EVENTS.CALL_NOTES_SAVED, {
          notes,
          prospect: profile.person.name,
          company:  profile.company.name,
        });

        toolOutput = JSON.stringify({ success: true, message: "Call notes saved to CRM" });
      }

      else if (tool.name === "generate_board") {
        const boardConfig = parseBoardConfig(tool.input);
        result.boardConfig = boardConfig;

        const mondayResult = await createMondayBoard(boardConfig);
        result.mondayResult = mondayResult;

        void fireN8nEvent(N8N_EVENTS.BOARD_CREATED, {
          boardName: boardConfig.boardName,
          boardId:   mondayResult.boardId,
          boardUrl:  mondayResult.boardUrl,
          prospect:  profile.person.name,
          company:   profile.company.name,
        });

        toolOutput = JSON.stringify({
          success:       mondayResult.success,
          board_id:      mondayResult.boardId,
          board_url:     mondayResult.boardUrl,
          items_created: mondayResult.itemsCreated,
          error:         mondayResult.error,
        });
      }

      else if (tool.name === "trigger_payment") {
        const payment = parsePaymentTrigger(tool.input, {
          name:    profile.person.name,
          email:   profile.person.email,
          company: profile.company.name,
        });
        payment.industry = profile.company.industry;
        result.paymentTrigger = payment;

        void fireN8nEvent(N8N_EVENTS.PAYMENT_EMAIL, {
          ...payment,
          leadScore: profile.meta.leadScore,
        });

        toolOutput = JSON.stringify({
          success:       true,
          payment_link:  payment.stripeUrl,
          email_sent_to: payment.email,
          message:       `Payment link sent to ${payment.email}`,
        });
      }

      toolResults.push({ tool_use_id: tool.id, content: toolOutput });
    }

    // Build the two new raw history entries for the tool turn
    const assistantToolTurn: RawMessage = {
      role:    "assistant",
      // Must pass the full content array (Anthropic requires this for tool_use turns)
      content: response.content as RawMessage["content"],
    };

    const toolResultTurn: RawMessage = {
      role: "user",
      content: toolResults.map((r) => ({
        type:        "tool_result" as const,
        tool_use_id: r.tool_use_id,
        content:     r.content,
      })),
    };

    // ── Second LLM call — Claude narrates what just happened ─────────────────
    const followUp = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:     systemPrompt,
      tools:      AGENT_TOOLS as Parameters<typeof anthropic.messages.create>[0]["tools"],
      messages: [
        ...rawHistory,
        assistantToolTurn,
        toolResultTurn,
      ] as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    result.text = followUp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Return ALL new raw turns so client can append them correctly:
    // [assistant tool_use turn] + [user tool_result turn] + [assistant follow-up text]
    result.rawHistoryAppend = [
      assistantToolTurn,
      toolResultTurn,
      { role: "assistant", content: result.text },
    ];

    return NextResponse.json(result);

  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent error";
    console.error("[/api/chat]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
