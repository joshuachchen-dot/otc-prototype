import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, executeTool } from "./tools.js";
import type { AgentConfig, AgentReport } from "./types.js";

const MAX_ITERATIONS = 12;

export async function runAgent(
  client: Anthropic,
  config: AgentConfig
): Promise<AgentReport> {
  const messages: Anthropic.MessageParam[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: config.systemPrompt,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      return parseReport(text, config);
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = toolUses.map((tu) => ({
        type: "tool_result",
        tool_use_id: tu.id,
        content: executeTool(tu.name, tu.input as Record<string, string>),
      }));

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  return {
    domain: config.name,
    emoji: config.emoji,
    score: 0,
    status: "critical",
    findings: [{ severity: "critical", title: "Agent did not complete", detail: "Max iterations reached without a final report." }],
    recommendations: ["Re-run the governance audit."],
  };
}

function parseReport(text: string, config: AgentConfig): AgentReport {
  // Extract JSON block from the agent's response
  const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*"findings"[\s\S]*\})/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return { ...parsed, domain: config.name, emoji: config.emoji };
    } catch {
      // fall through to default
    }
  }

  return {
    domain: config.name,
    emoji: config.emoji,
    score: 0,
    status: "critical",
    findings: [
      {
        severity: "critical",
        title: "Could not parse agent report",
        detail: text.slice(0, 500),
      },
    ],
    recommendations: ["Check agent output and re-run."],
  };
}
