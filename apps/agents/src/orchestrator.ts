import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { runAgent } from "./agent.js";
import { generateReport } from "./report.js";
import { legalAgent } from "./agents/legal.js";
import { contractsAgent } from "./agents/contracts.js";
import { devopsAgent } from "./agents/devops.js";
import { productAgent } from "./agents/product.js";
import { gtmAgent } from "./agents/gtm.js";
import type { AgentReport } from "./types.js";
import { ROOT } from "./tools.js";

const AGENTS = [legalAgent, contractsAgent, devopsAgent, productAgent, gtmAgent];

function checkApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌  ANTHROPIC_API_KEY is not set.");
    console.error("   Export it before running:");
    console.error("   export ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }
}

function printProgress(name: string, emoji: string, state: "start" | "done" | "error") {
  const icons = { start: "⏳", done: "✅", error: "❌" };
  console.log(`  ${icons[state]} ${emoji}  ${name}`);
}

async function runWithProgress(
  client: Anthropic,
  config: (typeof AGENTS)[number]
): Promise<AgentReport> {
  printProgress(config.name, config.emoji, "start");
  try {
    const report = await runAgent(client, config);
    printProgress(config.name, config.emoji, "done");
    return report;
  } catch (err: any) {
    printProgress(config.name, config.emoji, "error");
    console.error(`     Error: ${err.message}`);
    return {
      domain: config.name,
      emoji: config.emoji,
      score: 0,
      status: "critical",
      findings: [{ severity: "critical", title: "Agent failed", detail: err.message }],
      recommendations: ["Check ANTHROPIC_API_KEY and network connectivity, then re-run."],
    };
  }
}

async function main() {
  checkApiKey();
  const client = new Anthropic();

  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   OTC Platform — Enterprise Governance Audit ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
  console.log("Running 5 specialist agents in parallel...");
  console.log("");

  const reports = await Promise.all(AGENTS.map((agent) => runWithProgress(client, agent)));

  const markdown = generateReport(reports);
  const outPath = path.join(ROOT, "GOVERNANCE_REPORT.md");
  fs.writeFileSync(outPath, markdown);

  const overall = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
  const criticals = reports.flatMap((r) => r.findings).filter((f) => f.severity === "critical").length;

  console.log("");
  console.log("══════════════════════════════════════════════");
  console.log(`  Overall Readiness Score: ${overall}/100`);
  console.log(`  Critical Findings: ${criticals}`);
  console.log("══════════════════════════════════════════════");
  console.log("");
  for (const r of reports) {
    const icon = r.status === "ok" ? "✅" : r.status === "warning" ? "⚠️ " : "❌";
    console.log(`  ${icon}  ${r.emoji} ${r.domain.padEnd(28)} ${r.score}/100`);
  }
  console.log("");
  console.log(`📄 Full report saved to: GOVERNANCE_REPORT.md`);
  console.log("");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
