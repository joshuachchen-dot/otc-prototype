import Link from "next/link";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { Badge, Button, Card, Field, H2 } from "@/components/ui";
import LiveDot from "@/components/LiveDot";

const DEFAULT_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

function formatOTCF(wei: string): string {
  try { return (BigInt(wei) / BigInt(1e18)).toLocaleString() + " OTCF"; }
  catch { return "0 OTCF"; }
}

export default function Investor() {
  const [addr, setAddr]   = useState<string>(DEFAULT_ADDR);
  const [risk, setRisk]   = useState<"green" | "yellow" | "red">("green");
  const [balance, setBalance] = useState<string>("0");
  const [amountOTCF, setAmountOTCF] = useState("1");
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);

  const amountWei = (BigInt(Math.max(0, Number(amountOTCF) || 0)) * BigInt(1e18)).toString();

  async function refresh() {
    try {
      const riskRes = await fetch(API("/risk"));
      if (riskRes.ok) {
        const { status } = await riskRes.json();
        setRisk((status as "green" | "yellow" | "red") ?? "green");
      }
      if (addr) {
        const balRes = await fetch(API(`/token/balance/${addr}`));
        if (balRes.ok) {
          const { balance: b } = await balRes.json();
          setBalance(String(b));
        }
      }
    } catch {
      setMsg({ type: "err", text: "API not reachable. Is the API server running on port 3001?" });
    }
  }

  async function subscribe() {
    if (!addr) return setMsg({ type: "err", text: "Enter a wallet address first." });
    setBusy(true); setMsg({ type: "info", text: "Submitting subscription..." });
    try {
      const res = await fetch(API("/token/subscribe"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: addr, amount: amountWei }),
      });
      const data = await res.json();
      if (res.ok) { await refresh(); setMsg({ type: "ok", text: `Subscribed. Tx: ${data.tx}` }); }
      else setMsg({ type: "err", text: `Subscription failed: ${JSON.stringify(data.error)}` });
    } catch {
      setMsg({ type: "err", text: "Subscription failed (network/API error)." });
    } finally { setBusy(false); }
  }

  async function redeem() {
    if (!addr) return setMsg({ type: "err", text: "Enter a wallet address first." });
    setBusy(true); setMsg({ type: "info", text: "Submitting redemption..." });
    try {
      const res = await fetch(API("/token/redeem"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: addr, amount: amountWei }),
      });
      const data = await res.json();
      if (res.ok) { await refresh(); setMsg({ type: "ok", text: `Redeemed. Tx: ${data.tx}` }); }
      else setMsg({ type: "err", text: `Redeem failed: ${JSON.stringify(data.error)}` });
    } catch {
      setMsg({ type: "err", text: "Redeem failed (network/API error)." });
    } finally { setBusy(false); }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [addr]);

  const msgStyle =
    msg?.type === "ok"  ? "bg-green-50 text-green-800 border-green-200" :
    msg?.type === "err" ? "bg-red-50 text-red-800 border-red-200"       :
                          "bg-gray-50 text-gray-800 border-gray-200";

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", padding: "48px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>Investor Portal</p>
          <h1 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 40, letterSpacing: -1.2, lineHeight: 1.1 }}>
            Your fund position.
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "#86868b", maxWidth: 480 }}>
            Subscribe to the fund, redeem tokens, and monitor your real-time balance.
          </p>
        </div>

        {/* Status message */}
        {msg && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${msgStyle}`}>{msg.text}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Account card */}
          <div className="lg:col-span-1">
            <Card>
              <H2>Account</H2>
              <div className="space-y-2">
                <Field label="Risk" value={<Badge tone={risk}>{risk}</Badge>} />
                <Field
                  label="Balance (OTCF)"
                  value={<span className="font-semibold">{formatOTCF(balance)}</span>}
                />
              </div>
              <div className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-gray-600">Wallet Address</label>
                <input
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="mt-3">
                <Button variant="ghost" onClick={refresh} disabled={busy}>Refresh</Button>
              </div>
            </Card>
          </div>

          {/* Action card */}
          <div className="lg:col-span-2">
            <Card>
              <H2>Subscribe / Redeem</H2>
              <p className="text-sm text-gray-600">Enter the amount in <b>OTCF tokens</b>.</p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Amount (OTCF)</label>
                  <input
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={amountOTCF}
                    onChange={(e) => setAmountOTCF(e.target.value)}
                    placeholder="e.g. 100"
                    type="number"
                    min="0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={subscribe} disabled={busy}>{busy ? "Working..." : "Subscribe"}</Button>
                  <Button variant="ghost" onClick={redeem} disabled={busy}>{busy ? "Working..." : "Redeem"}</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Risk indicator */}
        <div className="mt-6 flex items-center gap-3" style={{ padding: "16px 20px", borderRadius: 14, background: "#fff", border: "1px solid #e5e5ea" }}>
          <LiveDot size={10} />
          <span className="text-sm font-semibold" style={{ color: "#34c759" }}>Low Risk</span>
          <span className="text-sm" style={{ color: "#86868b" }}>— All fund systems operating normally</span>
        </div>
      </div>
    </div>
  );
}
