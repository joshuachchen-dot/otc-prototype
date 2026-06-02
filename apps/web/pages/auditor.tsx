import { useState } from "react";
import { API } from "@/lib/api";

export default function Auditor() {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  async function doExport() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(API("/audit/export"));
      if (!res.ok) { setErr(`Export failed: ${res.statusText}`); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `archon-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Export failed — API not reachable.");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", padding: "48px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>Compliance</p>
          <h1 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 40, letterSpacing: -1.2, lineHeight: 1.1 }}>
            Audit Export
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "#86868b", maxWidth: 480 }}>
            Download an immutable on-chain record of all NAV posts, subscriptions, and redemptions.
          </p>
        </div>

        {err && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        )}

        <div style={{ background: "#fff", borderRadius: 22, border: "1px solid #e5e5ea", padding: 40 }}>
          <p className="text-[32px] font-extrabold text-[#1d1d1f] mb-3 leading-tight" style={{ letterSpacing: -1 }}>
            Immutable<br />audit trail.
          </p>
          <p className="text-[14px] leading-relaxed mb-8" style={{ color: "#86868b", maxWidth: 400 }}>
            The CSV export contains every on-chain mint, burn, and NAV event with block timestamps — suitable for regulatory submission.
          </p>
          <button
            onClick={doExport}
            disabled={busy}
            className="inline-flex items-center gap-2 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            style={{ fontSize: 15, padding: "13px 26px", borderRadius: 980, background: "#1d1d1f", border: "none", cursor: busy ? "default" : "pointer" }}
          >
            {busy ? "Exporting…" : "Download CSV"}
            {!busy && (
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M7 1v8M3 6l4 4 4-4M1 13h12" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
