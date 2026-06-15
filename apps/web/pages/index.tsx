import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import LiveDot from "@/components/LiveDot";
import NavChart from "@/components/NavChart";
import InvestorHeroCard from "@/components/InvestorHeroCard";
import ManagerCard from "@/components/ManagerCard";
import AuditorCard from "@/components/AuditorCard";
import OTCFeed, { OTCTrade } from "@/components/OTCFeed";
import { apiFetch } from "@/lib/api";

type LiveNav   = { nav: string; asOf: string; storedAt: string };
type LiveTrade = { id: number; seller: string; buyer: string; amount: string; navFloor: string; navCeiling: string; status: string };

// NAV is stored on-chain scaled by 1e6 (e.g. "1667980000" = $1,667.98)
function formatUsdFromMicro(raw: string): string {
  return `$${(Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// AUM = total supply (18 decimals) × NAV (scaled by 1e6) → dollars, kept in BigInt to avoid precision loss
function formatAum(supply: string, navMicro: string): string {
  const dollars = Number((BigInt(supply) * BigInt(navMicro)) / 10n ** 18n) / 1e6;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000)     return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(2)}`;
}

function formatOTCF(raw: string): string {
  return `${(BigInt(raw) / 10n ** 18n).toLocaleString("en-US")} OTCF`;
}

function formatRelativeTime(unixSeconds: string): string {
  const diffMs = Date.now() - Number(unixSeconds) * 1000;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Home() {
  const [nav,    setNav]    = useState<LiveNav | null>(null);
  const [supply, setSupply] = useState<string | null>(null);
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [navRes, supplyRes, tradesRes] = await Promise.all([
          apiFetch("/nav/latest"),
          apiFetch("/token/supply"),
          apiFetch("/otc/trades"),
        ]);
        const [navData, supplyData, tradesData] = await Promise.all([
          navRes.json(), supplyRes.json(), tradesRes.json(),
        ]);
        if (cancelled) return;
        setNav(navData);
        setSupply(supplyData.supply);
        setTrades(tradesData);
      } catch {
        // Live API unreachable — sections fall back to their loading placeholders below.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pendingCount = trades.filter((t) => t.status === "Pending").length;
  const settledCount = trades.filter((t) => t.status === "Settled").length;

  const metrics = [
    {
      label: "NAV / Unit",
      value: nav ? formatUsdFromMicro(nav.nav) : "—",
      delta: nav ? `Posted on-chain ${formatRelativeTime(nav.asOf)}` : "Awaiting on-chain data",
    },
    {
      label: "Total AUM",
      value: nav && supply ? formatAum(supply, nav.nav) : "—",
      delta: supply ? `${formatOTCF(supply)} in circulation` : "Awaiting on-chain data",
    },
    {
      label: "Total OTC Trades",
      value: loaded ? String(trades.length) : "—",
      delta: loaded ? `${settledCount} settled · ${trades.length - settledCount - pendingCount} cancelled` : "Awaiting on-chain data",
    },
  ];

  const feedTrades: OTCTrade[] = trades
    .filter((t) => t.status === "Settled" || t.status === "Cancelled")
    .slice()
    .reverse()
    .slice(0, 5)
    .map((t) => ({
      id: String(t.id),
      seller: t.seller,
      buyer: t.buyer,
      amount: formatOTCF(t.amount),
      nav: formatUsdFromMicro(t.navFloor),
      status: t.status === "Settled" ? "settled" : "cancelled",
    }));

  return (
    <>
      <Head>
        <title>Archon — Institutional OTC Settlement</title>
        <meta name="description" content="Compliant tokenized fund infrastructure for asset managers, prime brokers, and auditors." />
      </Head>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden text-center"
        style={{ padding: "96px 48px 88px", background: "linear-gradient(180deg,#fff 0%,#f5f5f7 100%)" }}
      >
        <div
          className="absolute rounded-full pointer-events-none animate-drift-a"
          style={{ width: 500, height: 500, top: -200, left: -100, background: "radial-gradient(circle,#c7d2fe,transparent)", filter: "blur(60px)", opacity: 0.35 }}
        />
        <div
          className="absolute rounded-full pointer-events-none animate-drift-b"
          style={{ width: 400, height: 400, top: -100, right: -80, background: "radial-gradient(circle,#bbf7d0,transparent)", filter: "blur(60px)", opacity: 0.35 }}
        />

        <div
          className="relative z-10 inline-flex items-center gap-2 mb-9"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #ddd", backdropFilter: "blur(8px)", borderRadius: 980, padding: "6px 18px", fontSize: 11, fontWeight: 600, color: "#555", letterSpacing: "0.5px", textTransform: "uppercase" }}
        >
          <LiveDot />
          Live on Ethereum
        </div>

        <h1
          className="relative z-10 font-extrabold text-[#1d1d1f] animate-fade-up"
          style={{ fontSize: 58, letterSpacing: -2, lineHeight: 1.02, marginBottom: 24 }}
        >
          Institutional OTC<br />
          <span style={{ color: "#86868b" }}>settlement, reimagined.</span>
        </h1>

        <p
          className="relative z-10 mx-auto animate-fade-up"
          style={{ fontSize: 19, color: "#86868b", maxWidth: 540, lineHeight: 1.65, marginBottom: 44, animationDelay: "0.1s" }}
        >
          Compliant tokenized fund infrastructure for asset managers, prime brokers, and auditors — on-chain and audit-ready.
        </p>

        <div className="relative z-10 flex gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <Link
            href="/contact"
            className="no-underline font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ fontSize: 16, padding: "15px 30px", borderRadius: 980, background: "#1d1d1f" }}
          >
            Request Access
          </Link>
          <Link
            href="/platform"
            className="no-underline font-semibold text-[#1d1d1f]"
            style={{ fontSize: 16, padding: "15px 30px", borderRadius: 980, background: "transparent", border: "1.5px solid #ccc" }}
          >
            How It Works
          </Link>
        </div>
      </section>

      {/* ── Metrics Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "#f0f0f0", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0" }}>
        {metrics.map((m, i) => (
          <div key={m.label} className="relative bg-white" style={{ padding: "28px 32px" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: "#86868b" }}>{m.label}</p>
            <p
              className="font-bold text-[#1d1d1f] mt-2 animate-count-up"
              style={{ fontSize: 30, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums", animationDelay: `${i * 0.15}s` }}
            >
              {m.value}
            </p>
            <p className="text-[13px] mt-1.5" style={{ color: "#86868b" }}>{m.delta}</p>
          </div>
        ))}
        <div className="relative bg-white" style={{ padding: "28px 32px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: "#86868b" }}>Risk Status</p>
          <div className="flex items-center gap-2.5 mt-2" style={{ fontSize: 18, color: "#34c759", fontWeight: 700 }}>
            <LiveDot size={10} />
            Low Risk
          </div>
          <p className="text-[13px] mt-1.5" style={{ color: "#86868b" }}>All systems nominal</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ background: "#f5f5f7", padding: "64px 48px 72px" }}>
        <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-6" style={{ color: "#c0c0c8" }}>Performance</p>
        <NavChart
          value={nav ? formatUsdFromMicro(nav.nav) : "—"}
          subtitle={nav ? `Posted on-chain ${formatRelativeTime(nav.asOf)}` : "Awaiting first on-chain post"}
        />

        <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-6" style={{ color: "#c0c0c8" }}>Portals</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
          <InvestorHeroCard />
          <ManagerCard activeTradeCount={trades.length} />
          <AuditorCard />
          <OTCFeed trades={feedTrades} />
        </div>
      </div>
    </>
  );
}
