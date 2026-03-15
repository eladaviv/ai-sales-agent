import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatResponse, RawMessage, ToolUseBlock, EnrichmentResult, CallNotes } from "@/types";
import { buildSystemPrompt }  from "@/lib/agents/prompt";
import { AGENT_TOOLS, parseBoardConfig, parseCallNotes, parsePaymentTrigger } from "@/lib/tools/definitions";
import { createMondayBoard }  from "@/lib/monday/client";
import { setLeadStatus, writeCallNotes, writePaymentData } from "@/lib/monday/leads";

interface ChatAPIRequest {
  rawHistory: RawMessage[];
  profile:    EnrichmentResult;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { rawHistory, profile } = (await req.json()) as ChatAPIRequest;
    const mondayItemId = profile.mondayItemId ?? "";

    const systemPrompt = buildSystemPrompt(profile);

    // ── First LLM call ────────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model:    "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:   systemPrompt,
      tools:    AGENT_TOOLS as Parameters<typeof anthropic.messages.create>[0]["tools"],
      messages: rawHistory as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );

    const result: ChatResponse & { rawHistoryAppend: RawMessage[] } = {
      text: response.content
        .filter(b => b.type === "text")
        .map(b => (b as { type: "text"; text: string }).text)
        .join(""),
      rawHistoryAppend: [],
    };

    // ── No tools — return immediately ─────────────────────────────────────
    if (toolUseBlocks.length === 0) {
      result.rawHistoryAppend = [{ role: "assistant", content: result.text }];
      return NextResponse.json(result);
    }

    // ── Process tool calls ────────────────────────────────────────────────
    const toolResults: Array<{ tool_use_id: string; content: string }> = [];

    for (const tool of toolUseBlocks) {
      let toolOutput = "";

      // ── save_call_notes ────────────────────────────────────────────────
      if (tool.name === "save_call_notes") {
        const notes = parseCallNotes(tool.input);
        result.callNotes = notes;

        // Write call notes to monday board + move to "In Conversation"
        void writeCallNotes(mondayItemId, notes);
        void setLeadStatus(mondayItemId, "In Conversation");

        toolOutput = JSON.stringify({ success: true, message: "Notes saved to monday.com" });
      }

      // ── generate_board ─────────────────────────────────────────────────
      else if (tool.name === "generate_board") {
        const boardConfig = parseBoardConfig(tool.input);
        result.boardConfig = boardConfig;

        // Create the real monday.com board
        const mondayResult = await createMondayBoard(boardConfig);
        result.mondayResult = mondayResult;

        // Update lead status → Board Sent
        void setLeadStatus(mondayItemId, "Board Sent");

        toolOutput = JSON.stringify({
          success:       mondayResult.success,
          board_id:      mondayResult.boardId,
          board_url:     mondayResult.boardUrl,
          items_created: mondayResult.itemsCreated,
          error:         mondayResult.error,
        });
      }

      // ── trigger_payment ────────────────────────────────────────────────
      else if (tool.name === "trigger_payment") {
        const payment = parsePaymentTrigger(tool.input, {
          name:    profile.person.name,
          email:   profile.person.email,
          company: profile.company.name,
        });
        payment.industry = profile.company.industry;
        result.paymentTrigger = payment;

        // Write plan details + payment link to monday, move to "Payment Sent"
        void writePaymentData({
          itemId:       mondayItemId,
          plan:         payment.plan,
          seats:        payment.seats,
          monthlyTotal: payment.monthlyTotal,
          paymentUrl:   payment.stripeUrl,
        });
        void setLeadStatus(mondayItemId, "Payment Sent");

        toolOutput = JSON.stringify({
          success:       true,
          payment_link:  payment.stripeUrl,
          email_sent_to: payment.email,
          message:       `Payment link ready for ${payment.email}`,
        });
      }

      toolResults.push({ tool_use_id: tool.id, content: toolOutput });
    }

    // ── Build raw history entries for this tool turn ──────────────────────
    const assistantToolTurn: RawMessage = {
      role:    "assistant",
      content: response.content as RawMessage["content"],
    };
    const toolResultTurn: RawMessage = {
      role: "user",
      content: toolResults.map(r => ({
        type:        "tool_result" as const,
        tool_use_id: r.tool_use_id,
        content:     r.content,
      })),
    };

    // ── Second LLM call — Claude narrates the result ──────────────────────
    const followUp = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:     systemPrompt,
      tools:      AGENT_TOOLS as Parameters<typeof anthropic.messages.create>[0]["tools"],
      messages:   [
        ...rawHistory,
        assistantToolTurn,
        toolResultTurn,
      ] as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    result.text = followUp.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

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
