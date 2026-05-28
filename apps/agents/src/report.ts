import type { AgentReport, Finding } from "./types.js";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_ICON: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };
const STATUS_ICON: Record<string, string> = { critical: "❌", warning: "⚠️", ok: "✅" };

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${score}/100`;
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );
}

export function generateReport(reports: AgentReport[]): string {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const overall = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
  const criticals = reports.flatMap((r) => r.findings).filter((f) => f.severity === "critical").length;

  const lines: string[] = [
    "# Enterprise Governance Report",
    `> Generated: ${now}`,
    "",
    "---",
    "",
    "## Overall Readiness",
    "",
    `**Score:** ${scoreBar(overall)}`,
    "",
    "| Domain | Status | Score |",
    "|--------|--------|-------|",
    ...reports.map(
      (r) =>
        `| ${r.emoji} ${r.domain} | ${STATUS_ICON[r.status]} ${r.status.toUpperCase()} | ${scoreBar(r.score)} |`
    ),
    "",
  ];

  if (criticals > 0) {
    lines.push(`> ⚠️ **${criticals} critical finding${criticals > 1 ? "s" : ""} must be resolved before enterprise deployment.**`);
    lines.push("");
  }

  lines.push("---", "");

  for (const report of reports) {
    lines.push(
      `## ${report.emoji} ${report.domain}`,
      "",
      `**Readiness:** ${scoreBar(report.score)}  |  **Status:** ${STATUS_ICON[report.status]} ${report.status.toUpperCase()}`,
      ""
    );

    if (report.findings.length > 0) {
      lines.push("### Findings", "");
      for (const f of sortFindings(report.findings)) {
        lines.push(
          `#### ${SEVERITY_ICON[f.severity]} [${f.severity.toUpperCase()}] ${f.title}`,
          "",
          f.detail,
          ...(f.file ? [`\n*File: \`${f.file}\`*`] : []),
          ""
        );
      }
    }

    if (report.recommendations.length > 0) {
      lines.push("### Recommendations", "");
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push("");
    }

    lines.push("---", "");
  }

  lines.push("## Next Steps", "");
  const criticalDomains = reports.filter((r) => r.status === "critical");
  const warningDomains = reports.filter((r) => r.status === "warning");

  if (criticalDomains.length > 0) {
    lines.push(`**Immediate action required in:** ${criticalDomains.map((r) => r.domain).join(", ")}`, "");
  }
  if (warningDomains.length > 0) {
    lines.push(`**Address before beta launch:** ${warningDomains.map((r) => r.domain).join(", ")}`, "");
  }

  const topFindings = reports
    .flatMap((r) => r.findings.filter((f) => f.severity === "critical" || f.severity === "high"))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    .slice(0, 5);

  if (topFindings.length > 0) {
    lines.push("### Top Priority Items", "");
    topFindings.forEach((f, i) => {
      lines.push(`${i + 1}. ${SEVERITY_ICON[f.severity]} **${f.title}**${f.file ? ` — \`${f.file}\`` : ""}`);
    });
    lines.push("");
  }

  lines.push(
    "---",
    "",
    `*Report produced by the OTC Governance Agent System · Model: claude-sonnet-4-6*`
  );

  return lines.join("\n");
}
