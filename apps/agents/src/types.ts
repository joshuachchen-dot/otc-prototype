export type Severity = "critical" | "high" | "medium" | "low";
export type DomainStatus = "critical" | "warning" | "ok";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  file?: string;
}

export interface AgentReport {
  domain: string;
  emoji: string;
  score: number;
  status: DomainStatus;
  findings: Finding[];
  recommendations: string[];
}

export interface AgentConfig {
  name: string;
  emoji: string;
  systemPrompt: string;
}
