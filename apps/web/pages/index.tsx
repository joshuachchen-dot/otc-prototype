import Head from "next/head";
import LiveDot from "@/components/LiveDot";
import Sparkline from "@/components/Sparkline";
import NavChart from "@/components/NavChart";
import InvestorHeroCard from "@/components/InvestorHeroCard";
import ManagerCard from "@/components/ManagerCard";
import AuditorCard from "@/components/AuditorCard";
import OTCFeed, { OTCTrade } from "@/components/OTCFeed";

const METRICS = [
  {
    label: "NAV / Unit",
    value: "$3,024.18",
    delta: "↑ 2.1% today",
    up: true,
    sparkPoints: "0,30 10,23 22,25 34,16 46,10 64,4",
    delay: "0s",
  },
  {
    label: "Total AUM",
    value: "$48.2M",
    delta: "↑ $1.4M this week",
    up: true,
    sparkPoints: "0,26 12,21 24,18 36,14 48,16 64,6",
    delay: "0.15s",
  },
  {
    label: "Active OTC Trades",
    value: "12",
    delta: "3 pending settlement",
    up: false,
    sparkPoints: "0,22 12,19 24,24 36,15 48,12 64,9",
    delay: "0.3s",
  },
];

const MOCK_TRADES: OTCTrade[] = [
  {
    id: "1",
    seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    buyer:  "0x3C44CddB6a900fa2b585dd299e03d12FA4293BC",
    amount: "50,000 OTCF",
    nav:    "$3,021.40",
    status: "settled",
  },
  {
    id: "2",
    seller: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    buyer:  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    amount: "12,500 OTCF",
    nav:    "$3,024.18",
    status: "pending",
  },
  {
    id: "3",
    seller: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    buyer:  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    amount: "80,000 OTCF",
    nav:    "$3,018.75",
    status: "settled",
  },
];

export default function Home() {
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
          <button
            className="font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ fontSize: 16, padding: "15px 30px", borderRadius: 980, background: "#1d1d1f", border: "none", cursor: "pointer" }}
          >
            Request Access
          </button>
          <button
            className="font-semibold text-[#1d1d1f]"
            style={{ fontSize: 16, padding: "15px 30px", borderRadius: 980, background: "transparent", border: "1.5px solid #ccc", cursor: "pointer" }}
          >
            Watch Demo
          </button>
        </div>
      </section>

      {/* ── Metrics Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "#f0f0f0", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0" }}>
        {METRICS.map((m, i) => (
          <div key={m.label} className="relative bg-white" style={{ padding: "28px 32px" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: "#86868b" }}>{m.label}</p>
            <p
              className="font-bold text-[#1d1d1f] mt-2 animate-count-up"
              style={{ fontSize: 30, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums", animationDelay: `${i * 0.15}s` }}
            >
              {m.value}
            </p>
            <p className="text-[13px] mt-1.5" style={{ color: m.up ? "#34c759" : "#86868b" }}>{m.delta}</p>
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
              <Sparkline points={m.sparkPoints} color={m.up ? "#34c759" : "#86868b"} delay={m.delay} />
            </div>
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
        <NavChart />

        <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-6" style={{ color: "#c0c0c8" }}>Portals</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
          <InvestorHeroCard />
          <ManagerCard activeTradeCount={12} />
          <AuditorCard />
          <OTCFeed trades={MOCK_TRADES} />
        </div>
      </div>
    </>
  );
}
