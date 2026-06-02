import { useState } from "react";
import { API, apiFetch } from "@/lib/api";

const SELLER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const BUYER  = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

const TRADE_AMOUNT = (500n * 10n ** 18n).toString();
const NAV_FLOOR    = "2000000000";

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
      "Both conditions are satisfied — trade settles.",
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
      "sell-side term is not met — SELLER_INSUFFICIENT_BALANCE.",
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
      "$2,000 floor in the buy-side contract terms. The contract rejects — NAV_BELOW_FLOOR.",
    sellCondition: "Seller balance = 1,000 OTCF ≥ 500 OTCF required ✓",
    buyCondition:  "NAV = $1,500 < $2,000 floor ✗",
    expectedOutcome: "buy-fail",
    outcomeLabel: "Terminated — NAV_BELOW_FLOOR",
  },
];

type TradeResult = { id: number; seller: string; buyer: string; amount: string; navFloor: string; status: string };
type StepLog     = { label: string; value: string; ok: boolean };

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
  const [running,  setRunning]  = useState<1 | 2 | 3 | null>(null);
  const [logs,     setLogs]     = useState<Record<number, StepLog[]>>({});
  const [trades,   setTrades]   = useState<Record<number, TradeResult>>({});
  const [outcomes, setOutcomes] = useState<Record<number, { ok: boolean; msg: string }>>({});

  const hasAnyResults = Object.keys(logs).length > 0 || Object.keys(outcomes).length > 0;

  function resetAll() { setLogs({}); setTrades({}); setOutcomes({}); }

  function clearScenario(id: number) {
    const drop = (p: Record<number, unknown>) => Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) !== id));
    setLogs(drop as any); setTrades(drop as any); setOutcomes(drop as any);
  }

  function addLog(scenario: number, log: StepLog) {
    setLogs((p) => ({ ...p, [scenario]: [...(p[scenario] ?? []), log] }));
  }

  async function runScenario(s: ScenarioDef) {
    setRunning(s.id);
    setLogs((p) => ({ ...p, [s.id]: [] }));
    setTrades((p) => Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) !== s.id)));
    setOutcomes((p) => Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) !== s.id)));

    try {
      const setupRes  = await apiFetch("/otc/setup-scenario", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario: s.id, seller: SELLER, buyer: BUYER }) });
      const setupData = await setupRes.json();
      if (!setupRes.ok) throw new Error(setupData.error ?? "Setup failed");
      for (const step of setupData.steps as string[]) addLog(s.id, { label: "Setup", value: step, ok: true });

      const proposeRes  = await apiFetch("/otc/propose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seller: SELLER, buyer: BUYER, amount: TRADE_AMOUNT, navFloor: NAV_FLOOR }) });
      const proposeData = await proposeRes.json();
      if (!proposeRes.ok) throw new Error(proposeData.error ?? "Propose failed");
      const tradeId: number = proposeData.id;
      addLog(s.id, { label: `Proposed trade #${tradeId}`, value: `tx: ${proposeData.tx}`, ok: true });

      const settleRes  = await apiFetch("/otc/settle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: tradeId }) });
      const settleData = await settleRes.json();
      if (settleRes.ok) {
        addLog(s.id, { label: "Settlement", value: `tx: ${settleData.tx}`, ok: true });
        setOutcomes((p) => ({ ...p, [s.id]: { ok: true, msg: "Trade settled successfully" } }));
      } else {
        const reason = settleData.error ?? "unknown";
        addLog(s.id, { label: "Settlement rejected", value: reason, ok: false });
        setOutcomes((p) => ({ ...p, [s.id]: { ok: false, msg: reason } }));
      }

      const tradeRes  = await fetch(API(`/otc/trade/${tradeId}`));
      const tradeData = await tradeRes.json();
      setTrades((p) => ({ ...p, [s.id]: { id: tradeId, ...tradeData } }));
    } catch (err: any) {
      addLog(s.id, { label: "Error", value: err.message ?? String(err), ok: false });
      setOutcomes((p) => ({ ...p, [s.id]: { ok: false, msg: err.message ?? "Unexpected error" } }));
    } finally { setRunning(null); }
  }

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", padding: "48px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>OTC Settlement</p>
            <h1 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 40, letterSpacing: -1.2, lineHeight: 1.1 }}>
              OTC Trade Settlement
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "#86868b", maxWidth: 520 }}>
              Three bilateral trade scenarios — conditions enforced atomically on-chain by{" "}
              <code style={{ background: "#e8e8ed", padding: "1px 5px", borderRadius: 4 }}>OTCTrade.sol</code>.
            </p>
          </div>
          {hasAnyResults && (
            <button onClick={resetAll} style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Reset All
            </button>
          )}
        </div>

        {/* Trade params */}
        <div style={{ padding: "14px 18px", borderRadius: 14, background: "#fff", border: "1px solid #e5e5ea", fontSize: 13, color: "#555", marginBottom: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
          <div><b>Seller</b> — Account #1: {SELLER.slice(0, 10)}…</div>
          <div><b>Buyer</b> — Account #2: {BUYER.slice(0, 10)}…</div>
          <div><b>Trade amount:</b> 500 OTCF</div>
          <div><b>NAV floor (buy-side term):</b> $2,000</div>
        </div>

        {/* Scenarios */}
        {SCENARIOS.map((s) => {
          const isBusy       = running === s.id;
          const outcome      = outcomes[s.id];
          const scenarioLogs = logs[s.id] ?? [];
          const trade        = trades[s.id];
          const outcomeColor = s.expectedOutcome === "success"
            ? { bg: "#dcfce7", border: "#86efac", text: "#15803d" }
            : { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" };

          return (
            <div key={s.id} style={{ border: "1px solid #e5e5ea", borderRadius: 20, padding: 28, background: "white", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#1d1d1f", marginBottom: 5 }}>{s.title}</div>
                  <p style={{ fontSize: 13, color: "#86868b", margin: 0, lineHeight: 1.6 }}>{s.description}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {outcome && !isBusy && (
                    <button onClick={() => clearScenario(s.id)} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => runScenario(s)}
                    disabled={isBusy || running !== null}
                    style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: isBusy || running !== null ? "#d1d5db" : "#1d1d1f", color: "white", fontWeight: 700, fontSize: 13, cursor: isBusy || running !== null ? "not-allowed" : "pointer" }}
                  >
                    {isBusy ? "Running…" : "Run"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[{ label: "Sell-side condition", value: s.sellCondition }, { label: "Buy-side condition", value: s.buyCondition }].map(({ label, value }) => (
                  <div key={label} style={{ background: "#f5f5f7", border: "1px solid #e5e5ea", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                    <div style={{ color: "#86868b", marginBottom: 3, fontWeight: 600 }}>{label}</div>
                    <div style={{ color: "#1d1d1f" }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "8px 14px", borderRadius: 8, background: outcomeColor.bg, border: `1px solid ${outcomeColor.border}`, color: outcomeColor.text, fontSize: 12, fontWeight: 600, marginBottom: scenarioLogs.length > 0 ? 14 : 0 }}>
                Expected: {s.outcomeLabel}
              </div>

              {scenarioLogs.length > 0 && (
                <div style={{ marginTop: 14, border: "1px solid #e5e5ea", borderRadius: 10, padding: "12px 14px", background: "#fafafa" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Execution log</div>
                  {scenarioLogs.map((log, i) => <LogLine key={i} step={log} />)}
                </div>
              )}

              {outcome && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: outcome.ok ? "#dcfce7" : "#fee2e2", color: outcome.ok ? "#15803d" : "#b91c1c", fontWeight: 700, fontSize: 13 }}>
                  {outcome.ok ? "Settled" : "Terminated"} — {outcome.msg}
                </div>
              )}

              {trade && <TradeCard trade={trade} />}
            </div>
          );
        })}

        {/* How it works */}
        <div style={{ padding: "20px 24px", border: "1px solid #e5e5ea", borderRadius: 14, background: "#fff", fontSize: 13, color: "#555", lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: "#1d1d1f", marginBottom: 10, fontSize: 15 }}>How OTCTrade.sol works</div>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li><b>propose()</b> — records seller, buyer, amount, and NAV floor on-chain as immutable trade terms.</li>
            <li><b>settle()</b> — atomically checks both conditions. If either fails, the entire transaction reverts with the specific reason. No partial execution possible.</li>
            <li>On success: <code>burnFrom(seller)</code> + <code>mint(buyer)</code> in the same transaction.</li>
            <li><b>cancel()</b> — either counterparty may cancel a pending trade at any time.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
