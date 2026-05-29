import { useState } from "react";
import { API, apiFetch, sandboxAPI, sandboxFetch } from "@/lib/api";

const SELLER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const BUYER  = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

const TRADE_AMOUNT = (500n * 10n ** 18n).toString();
const NAV_FLOOR    = "2000000000";

type Tab = "simulator" | "sandbox";

type ScenarioDef = {
  id: 1 | 2 | 3;
  title: string;
  description: string;
  sellCondition: string;
  buyCondition: string;
  expectedOutcome: "success" | "sell-fail" | "buy-fail";
  outcomeLabel: string;
};

const SCENARIOS: ScenarioDef[] = [
  {
    id: 1,
    title: "Scenario 1 — Successful Settlement",
    description:
      "Seller holds 1,000 OTCF (well above the 500 trade amount). " +
      "NAV is posted at $3,000, above the $2,000 floor required by the trade terms. " +
      "Both conditions are satisfied → trade settles.",
    sellCondition: "Seller balance = 1,000 OTCF ≥ 500 OTCF required",
    buyCondition:  "NAV = $3,000 ≥ $2,000 floor",
    expectedOutcome: "success",
    outcomeLabel: "Trade settles — tokens transferred from seller to buyer",
  },
  {
    id: 2,
    title: "Scenario 2 — Sell-Side Fail (insufficient inventory)",
    description:
      "Seller holds only 100 OTCF, below the 500 required. " +
      "NAV is fine at $3,000. The contract rejects settlement because the " +
      "sell-side term is not met → SELLER_INSUFFICIENT_BALANCE.",
    sellCondition: "Seller balance = 100 OTCF < 500 OTCF required ✗",
    buyCondition:  "NAV = $3,000 ≥ $2,000 floor ✓",
    expectedOutcome: "sell-fail",
    outcomeLabel: "Terminated — SELLER_INSUFFICIENT_BALANCE",
  },
  {
    id: 3,
    title: "Scenario 3 — Buy-Side Fail (NAV below floor)",
    description:
      "Seller holds 1,000 OTCF (sufficient). NAV is only $1,500, below the " +
      "$2,000 floor in the buy-side contract terms. The contract rejects → NAV_BELOW_FLOOR.",
    sellCondition: "Seller balance = 1,000 OTCF ≥ 500 OTCF required ✓",
    buyCondition:  "NAV = $1,500 < $2,000 floor ✗",
    expectedOutcome: "buy-fail",
    outcomeLabel: "Terminated — NAV_BELOW_FLOOR",
  },
];

type TradeResult = { id: number; seller: string; buyer: string; amount: string; navFloor: string; status: string };
type StepLog     = { label: string; value: string; ok: boolean };
type TabState    = { logs: Record<number, StepLog[]>; trades: Record<number, TradeResult>; outcomes: Record<number, { ok: boolean; msg: string }> };

const ff = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

function emptyTabState(): TabState {
  return { logs: {}, trades: {}, outcomes: {} };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Settled:   { bg: "#dcfce7", color: "#15803d" },
    Pending:   { bg: "#fef9c3", color: "#854d0e" },
    Cancelled: { bg: "#fee2e2", color: "#b91c1c" },
  };
  const s = colors[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function LogLine({ step }: { step: StepLog }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ minWidth: 16, color: step.ok ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{step.ok ? "✓" : "✗"}</span>
      <span style={{ color: "#555", minWidth: 200 }}>{step.label}</span>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#888", wordBreak: "break-all" }}>{step.value}</span>
    </div>
  );
}

function TradeCard({ trade }: { trade: TradeResult }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", background: "#fafafa", fontSize: 13, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: "#111" }}>Trade #{trade.id}</span>
        <StatusBadge status={trade.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", color: "#555" }}>
        <div><b>Seller</b></div><div style={{ fontFamily: "monospace", fontSize: 11 }}>{trade.seller}</div>
        <div><b>Buyer</b></div><div style={{ fontFamily: "monospace", fontSize: 11 }}>{trade.buyer}</div>
        <div><b>Amount</b></div><div>{(BigInt(trade.amount) / 10n ** 18n).toString()} OTCF</div>
        <div><b>NAV floor</b></div><div>${(Number(trade.navFloor) / 1e6).toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function OTCPage() {
  const [tab, setTab] = useState<Tab>("simulator");
  const [running, setRunning] = useState<1 | 2 | 3 | null>(null);

  const [simState,     setSimState]     = useState<TabState>(emptyTabState);
  const [sandboxState, setSandboxState] = useState<TabState>(emptyTabState);

  const state    = tab === "simulator" ? simState     : sandboxState;
  const setState = tab === "simulator" ? setSimState  : setSandboxState;
  const fetch_   = tab === "simulator" ? apiFetch     : sandboxFetch;
  const api_     = tab === "simulator" ? API          : sandboxAPI;

  const hasAnyResults = Object.keys(state.logs).length > 0 || Object.keys(state.outcomes).length > 0;

  function resetAll() {
    setState(emptyTabState());
  }

  function clearScenario(id: number) {
    setState((prev) => ({
      logs:     Object.fromEntries(Object.entries(prev.logs).filter(([k]) => Number(k) !== id)),
      trades:   Object.fromEntries(Object.entries(prev.trades).filter(([k]) => Number(k) !== id)),
      outcomes: Object.fromEntries(Object.entries(prev.outcomes).filter(([k]) => Number(k) !== id)),
    }));
  }

  function addLog(scenario: number, log: StepLog) {
    setState((prev) => ({ ...prev, logs: { ...prev.logs, [scenario]: [...(prev.logs[scenario] ?? []), log] } }));
  }

  async function runScenario(s: ScenarioDef) {
    setRunning(s.id);
    setState((prev) => ({
      ...prev,
      logs:     { ...prev.logs,     [s.id]: [] },
      trades:   Object.fromEntries(Object.entries(prev.trades).filter(([k]) => Number(k) !== s.id)),
      outcomes: Object.fromEntries(Object.entries(prev.outcomes).filter(([k]) => Number(k) !== s.id)),
    }));

    try {
      const setupRes  = await fetch_("/otc/setup-scenario", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario: s.id, seller: SELLER, buyer: BUYER }) });
      const setupData = await setupRes.json();
      if (!setupRes.ok) throw new Error(setupData.error ?? "Setup failed");
      for (const step of setupData.steps as string[]) addLog(s.id, { label: "Setup", value: step, ok: true });

      const proposeRes  = await fetch_("/otc/propose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seller: SELLER, buyer: BUYER, amount: TRADE_AMOUNT, navFloor: NAV_FLOOR }) });
      const proposeData = await proposeRes.json();
      if (!proposeRes.ok) throw new Error(proposeData.error ?? "Propose failed");
      const tradeId: number = proposeData.id;
      addLog(s.id, { label: `Proposed trade #${tradeId}`, value: `tx: ${proposeData.tx}`, ok: true });

      const settleRes  = await fetch_("/otc/settle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: tradeId }) });
      const settleData = await settleRes.json();
      if (settleRes.ok) {
        addLog(s.id, { label: "Settlement", value: `tx: ${settleData.tx}`, ok: true });
        setState((prev) => ({ ...prev, outcomes: { ...prev.outcomes, [s.id]: { ok: true, msg: "Trade settled successfully" } } }));
      } else {
        const reason = settleData.error ?? "unknown";
        addLog(s.id, { label: "Settlement rejected", value: reason, ok: false });
        setState((prev) => ({ ...prev, outcomes: { ...prev.outcomes, [s.id]: { ok: false, msg: reason } } }));
      }

      const tradeRes  = await fetch(api_(`/otc/trade/${tradeId}`));
      const tradeData = await tradeRes.json();
      setState((prev) => ({ ...prev, trades: { ...prev.trades, [s.id]: { id: tradeId, ...tradeData } } }));

    } catch (err: any) {
      addLog(s.id, { label: "Error", value: err.message ?? String(err), ok: false });
      setState((prev) => ({ ...prev, outcomes: { ...prev.outcomes, [s.id]: { ok: false, msg: err.message ?? "Unexpected error" } } }));
    } finally {
      setRunning(null);
    }
  }

  const isSandbox = tab === "sandbox";

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: ff }}>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "2px solid #e5e7eb", paddingBottom: 0 }}>
        {(["simulator", "sandbox"] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "9px 20px",
                borderRadius: "8px 8px 0 0",
                border: "1px solid",
                borderBottom: active ? "2px solid white" : "1px solid #e5e7eb",
                borderColor: active ? "#e5e7eb" : "#e5e7eb",
                marginBottom: active ? -2 : 0,
                background: active ? "white" : "#f9fafb",
                color: active ? "#111" : "#6b7280",
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t === "simulator" ? "OTC Simulator" : "Sandbox"}
              {t === "sandbox" && (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", background: "#fde047", color: "#713f12", padding: "1px 6px", borderRadius: 4 }}>
                  DEMO
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sandbox banner */}
      {isSandbox && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, background: "#fefce8", border: "1px solid #fde047", marginBottom: 24, fontSize: 13, color: "#713f12" }}>
          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", background: "#fde047", color: "#713f12", padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
            SANDBOX
          </span>
          <span>Isolated demo environment. All transactions run against a throwaway test chain — no real assets, no production data.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 4 }}>
            {isSandbox ? "OTC Trade — Live Demo" : "OTC Trade Simulator"}
          </h1>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
            {isSandbox
              ? <>Run each scenario to see how <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 4 }}>OTCTrade.sol</code> enforces bilateral trade conditions atomically on-chain. Every execution is real — the contract either settles or reverts with the specific reason.</>
              : <>Three bilateral trade scenarios — conditions enforced atomically on-chain by <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 4 }}>OTCTrade.sol</code>.</>
            }
          </p>
        </div>
        {hasAnyResults && (
          <button
            onClick={resetAll}
            style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Reset All
          </button>
        )}
      </div>

      {/* Trade params */}
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 13, color: "#0369a1", marginBottom: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
        <div><b>Seller</b> — {isSandbox ? "Demo account A" : "Anvil #1"}: {SELLER.slice(0, 10)}…</div>
        <div><b>Buyer</b>  — {isSandbox ? "Demo account B" : "Anvil #2"}: {BUYER.slice(0, 10)}…</div>
        <div><b>Trade amount:</b> 500 OTCF</div>
        <div><b>NAV floor (buy-side term):</b> $2,000</div>
      </div>

      {/* Scenarios */}
      {SCENARIOS.map((s) => {
        const isBusy       = running === s.id;
        const outcome      = state.outcomes[s.id];
        const scenarioLogs = state.logs[s.id] ?? [];
        const trade        = state.trades[s.id];

        const outcomeColor = s.expectedOutcome === "success"
          ? { bg: "#dcfce7", border: "#86efac", text: "#15803d" }
          : { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" };

        return (
          <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 24, background: "white", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 4 }}>{s.title}</div>
                <p style={{ fontSize: 13, color: "#666", margin: 0 }}>{s.description}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {outcome && !isBusy && (
                  <button onClick={() => clearScenario(s.id)} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Clear
                  </button>
                )}
                <button
                  onClick={() => runScenario(s)}
                  disabled={isBusy || running !== null}
                  style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: isBusy || running !== null ? "#d1d5db" : "#111", color: "white", fontWeight: 700, fontSize: 13, cursor: isBusy || running !== null ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                >
                  {isBusy ? "Running…" : "Run"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[{ label: "Sell-side condition", value: s.sellCondition }, { label: "Buy-side condition", value: s.buyCondition }].map(({ label, value }) => (
                <div key={label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                  <div style={{ color: "#888", marginBottom: 3, fontWeight: 600 }}>{label}</div>
                  <div style={{ color: "#111" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: "8px 12px", borderRadius: 8, background: outcomeColor.bg, border: `1px solid ${outcomeColor.border}`, color: outcomeColor.text, fontSize: 12, fontWeight: 600, marginBottom: scenarioLogs.length > 0 ? 12 : 0 }}>
              Expected: {s.outcomeLabel}
            </div>

            {scenarioLogs.length > 0 && (
              <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", background: "#fafafa" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Execution log</div>
                {scenarioLogs.map((log, i) => <LogLine key={i} step={log} />)}
              </div>
            )}

            {outcome && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: outcome.ok ? "#dcfce7" : "#fee2e2", color: outcome.ok ? "#15803d" : "#b91c1c", fontWeight: 700, fontSize: 13 }}>
                {outcome.ok ? "✓ Settled" : "✗ Terminated"} — {outcome.msg}
              </div>
            )}

            {trade && <TradeCard trade={trade} />}
          </div>
        );
      })}

      {/* How it works */}
      <div style={{ padding: "16px 20px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa", fontSize: 13, color: "#555", lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: "#111", marginBottom: 8 }}>How OTCTrade.sol works</div>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li><b>propose()</b> — records seller, buyer, amount, and NAV floor on-chain as immutable trade terms.</li>
          <li><b>settle()</b> — atomically checks both conditions. If either fails, the entire transaction reverts with the specific reason. No partial execution possible.</li>
          <li>On success: <code>burnFrom(seller)</code> + <code>mint(buyer)</code> in the same transaction.</li>
          <li><b>cancel()</b> — either counterparty may cancel a pending trade at any time.</li>
        </ol>
      </div>
    </div>
  );
}
