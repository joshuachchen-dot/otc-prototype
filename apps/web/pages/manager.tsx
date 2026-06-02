import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { Button, Card, Field, H2 } from "@/components/ui";

function formatNAV(raw: string): string {
  try { return `$${(Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  catch { return raw; }
}

function formatTimestamp(unix: string): string {
  try { return new Date(Number(unix) * 1000).toLocaleString(); }
  catch { return unix; }
}

export default function Manager() {
  const [navInput, setNavInput] = useState("3024180000");
  const [asOf, setAsOf] = useState(String(Math.floor(Date.now() / 1000)));
  const [latest, setLatest] = useState<{ nav: string; asOf: string; storedAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    try {
      const r = await fetch(API("/nav/latest"));
      if (r.ok) setLatest(await r.json());
    } catch {
      // API unreachable — leave latest as null
    }
  }

  async function postNAV() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(API("/nav/post"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nav: navInput, asOf: Number(asOf) }),
      });
      if (res.ok) { await load(); setMsg({ type: "ok", text: "NAV posted on-chain." }); }
      else {
        const d = await res.json();
        setMsg({ type: "err", text: `Post failed: ${d.error ?? res.statusText}` });
      }
    } catch {
      setMsg({ type: "err", text: "Post failed — API not reachable." });
    } finally { setBusy(false); }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const msgStyle = msg?.type === "ok"
    ? "bg-green-50 text-green-800 border-green-200"
    : "bg-red-50 text-red-800 border-red-200";

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", padding: "48px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>Fund Manager</p>
          <h1 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 40, letterSpacing: -1.2, lineHeight: 1.1 }}>
            Manager Console
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "#86868b", maxWidth: 480 }}>
            Post NAV on-chain and monitor fund performance. Auto-refreshes every 30 seconds.
          </p>
        </div>

        {msg && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${msgStyle}`}>{msg.text}</div>
        )}

        <div className="grid gap-6">
          <Card>
            <H2>Post NAV</H2>
            <p className="text-sm text-gray-500 mb-4">
              NAV is scaled ×1,000,000. Enter <code>3024180000</code> for $3,024.18.
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <div className="w-full">
                <label className="mb-1 block text-xs font-medium text-gray-600">NAV (scaled ×1e6)</label>
                <input
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={navInput}
                  onChange={(e) => setNavInput(e.target.value)}
                />
              </div>
              <div className="w-full">
                <label className="mb-1 block text-xs font-medium text-gray-600">As-of (Unix timestamp)</label>
                <input
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                />
              </div>
              <div className="flex items-end pb-0.5">
                <Button onClick={postNAV} disabled={busy}>{busy ? "Posting..." : "Post NAV"}</Button>
              </div>
            </div>
          </Card>

          <Card>
            <H2>Latest On-Chain NAV</H2>
            {latest ? (
              <div className="space-y-1">
                <Field label="NAV" value={<span className="font-bold text-[#1d1d1f]">{formatNAV(latest.nav)}</span>} />
                <Field label="As of" value={formatTimestamp(latest.asOf)} />
                <Field label="Stored at" value={formatTimestamp(latest.storedAt)} />
              </div>
            ) : (
              <p className="text-sm text-gray-500">No NAV posted yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
