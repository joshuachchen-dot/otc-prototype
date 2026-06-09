import Head from "next/head";
import Link from "next/link";
import LiveDot from "@/components/LiveDot";

const STEPS = [
  {
    n: "01",
    title: "Fund Setup & NAV Registration",
    who: "Fund Manager",
    color: "#6366f1",
    body: "The fund manager deploys a FundToken (ERC-20) representing shares in the fund, and registers it with the NAVRegistry contract. NAV is posted on-chain at regular intervals — cryptographically signed and permanently recorded. Investors and auditors can verify NAV history independently at any time.",
    details: ["FundToken deployed with SUBSCRIPTION_ROLE and REDEMPTION_ROLE access control", "NAVRegistry accepts authenticated NAV posts with a timestamp reference", "NAV scheduler posts real-time ETH/USD-indexed values every 60 seconds on-chain"],
  },
  {
    n: "02",
    title: "Investor Onboarding & KYC",
    who: "Compliance Officer",
    color: "#00c9a7",
    body: "Before any investor can hold or trade fund tokens, they must pass KYC verification and be whitelisted on-chain. The FundToken contract enforces this at the ERC-20 transfer hook level — no whitelist, no transfer. An AML velocity limit and sanctions screening layer sit in front of every subscription and redemption.",
    details: ["KYC eligibility recorded both in API database and on-chain whitelist", "AML: per-transaction size limit (10,000 OTCF) and 24-hour velocity cap (50,000 OTCF)", "Sanctions screening checked against blocklist before every mint, transfer, or trade"],
  },
  {
    n: "03",
    title: "OTC Trade Proposal",
    who: "Settlement Agent",
    color: "#f59e0b",
    body: "When a seller wants to transfer fund tokens to a buyer, they sign an EIP-712 typed-data message expressing consent to the exact trade terms: seller, buyer, amount, NAV floor, nonce, and expiry. This signature is verified on-chain by the OTCTrade contract via ecrecover — no signature, no trade. The settlement agent submits the proposal through the API.",
    details: ["EIP-712 typed-data signature binds seller to exact trade terms cryptographically", "Nonce prevents replay attacks — each seller signature is valid exactly once", "Proposal deadline enforced on-chain — expired proposals cannot be settled"],
  },
  {
    n: "04",
    title: "Atomic Settlement",
    who: "Smart Contract",
    color: "#34c759",
    body: "Settlement is a single atomic transaction. The OTCTrade contract verifies: seller holds sufficient tokens, the current on-chain NAV is at or above the trade's floor, the trade is not expired, and the seller's EIP-712 consent is valid. If every condition passes, tokens burn from the seller and mint to the buyer in the same transaction. If any condition fails, the entire transaction reverts — nothing partial ever settles.",
    details: ["Seller balance checked at settlement time, not at proposal time", "NAV floor enforced against the live on-chain NAVRegistry reading", "burnFrom(seller) + mint(buyer) in a single atomic call — no intermediate custody"],
  },
  {
    n: "05",
    title: "Audit Trail & Reporting",
    who: "Auditor",
    color: "#a78bfa",
    body: "Every action emits a permanent on-chain event: TradeProposed, TradeSettled, TradeCancelled, NavPosted, Transfer. The Auditor portal exports a full chronological record of all events, cross-referenced with block timestamps. Any regulator or LP can independently verify the entire fund history — no need to trust Archon's records because the blockchain is the record.",
    details: ["All events queryable from any Ethereum node — no API dependency for audit", "Audit export endpoint produces a signed, timestamped CSV of all on-chain activity", "Block explorer links provided for every transaction in the settlement log"],
  },
];

const CONTRACTS = [
  { name: "FundToken.sol", role: "ERC-20 representing fund shares", notes: "Whitelist-gated transfers, subscription/redemption roles, pause circuit breaker" },
  { name: "NAVRegistry.sol", role: "On-chain NAV price oracle", notes: "Authenticated NAV posts with timestamp, queryable by OTCTrade at settlement" },
  { name: "OTCTrade.sol", role: "Bilateral settlement engine", notes: "EIP-712 consent verification, atomic settle/cancel, MAX_TRADE_AGE expiry" },
];

export default function Platform() {
  return (
    <>
      <Head>
        <title>How It Works — Archon</title>
        <meta name="description" content="A step-by-step walkthrough of Archon's on-chain OTC settlement flow — from fund setup to atomic settlement and audit trail." />
      </Head>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ padding: "96px 48px 80px", background: "linear-gradient(180deg,#fff 0%,#f5f5f7 100%)" }}
      >
        <div className="absolute rounded-full pointer-events-none animate-drift-a" style={{ width: 500, height: 500, top: -200, right: -100, background: "radial-gradient(circle,#a5b4fc,transparent)", filter: "blur(80px)", opacity: 0.3 }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-7" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #ddd", backdropFilter: "blur(8px)", borderRadius: 980, padding: "6px 18px", fontSize: 11, fontWeight: 600, color: "#555", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            <LiveDot />
            Live on Ethereum Sepolia
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-4" style={{ color: "#c0c0c8" }}>How it works</p>
          <h1 className="font-extrabold text-[#1d1d1f] animate-fade-up" style={{ fontSize: 52, letterSpacing: -1.8, lineHeight: 1.05, marginBottom: 20 }}>
            Five steps from fund setup<br />
            <span style={{ color: "#86868b" }}>to audited settlement.</span>
          </h1>
          <p className="text-[17px] leading-relaxed animate-fade-up" style={{ color: "#86868b", maxWidth: 500, margin: "0 auto", animationDelay: "0.1s" }}>
            Every step enforced by smart contracts. Every action permanently recorded on-chain. No manual reconciliation. No trust required.
          </p>
        </div>
      </section>

      {/* ── Steps ── */}
      <section style={{ background: "#f5f5f7", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="animate-fade-up"
              style={{ background: "#fff", borderRadius: 22, padding: "36px 40px", border: "1px solid #e5e5ea", animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0" style={{ width: 52, height: 52, borderRadius: 14, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="font-black text-[13px]" style={{ color: s.color }}>{s.n}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-[#1d1d1f]" style={{ fontSize: 18 }}>{s.title}</h3>
                    <span className="text-[11px] font-semibold" style={{ background: s.color + "18", color: s.color, padding: "3px 10px", borderRadius: 20 }}>{s.who}</span>
                  </div>
                  <p className="text-[14px] leading-relaxed mb-4" style={{ color: "#86868b" }}>{s.body}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {s.details.map((d) => (
                      <div key={d} className="flex items-start gap-2.5 text-[13px]" style={{ color: "#555" }}>
                        <span style={{ color: s.color, marginTop: 1, flexShrink: 0 }}>→</span>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Smart Contracts ── */}
      <section style={{ background: "#0d1117", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#334" }}>Under the hood</p>
          <h2 className="font-extrabold text-white" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 8 }}>Three contracts. No intermediaries.</h2>
          <p className="text-[15px] mb-10" style={{ color: "#6b7280" }}>All deployed and verified on Ethereum Sepolia.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CONTRACTS.map((c) => (
              <div key={c.name} style={{ background: "#1a2332", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "180px 1fr 1fr", gap: 16, alignItems: "center" }}>
                <code className="font-bold" style={{ fontSize: 14, color: "#00c9a7" }}>{c.name}</code>
                <p style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 600 }}>{c.role}</p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>{c.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flow diagram (text) ── */}
      <section style={{ background: "#fff", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>Settlement flow</p>
          <h2 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 40 }}>What happens in a single settlement transaction.</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { actor: "Seller", action: "Signs EIP-712 typed-data consent off-chain (no gas)", color: "#f59e0b" },
              { actor: "Settlement Agent", action: "Calls OTCTrade.propose() — records trade terms on-chain", color: "#6366f1" },
              { actor: "Settlement Agent", action: "Calls OTCTrade.settle() — triggers atomic validation", color: "#6366f1" },
              { actor: "OTCTrade.sol", action: "Checks: seller balance ≥ amount, latestNAV ≥ navFloor, not expired, signature valid", color: "#1d1d1f" },
              { actor: "FundToken.sol", action: "burnFrom(seller, amount) — seller balance decreases", color: "#ef4444" },
              { actor: "FundToken.sol", action: "mint(buyer, amount) — buyer receives tokens", color: "#34c759" },
              { actor: "Ethereum", action: "TradeSettled event emitted — permanent, public, immutable", color: "#86868b" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 20, paddingTop: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, flexShrink: 0, marginTop: 4 }} />
                  {i < 6 && <div style={{ width: 2, flex: 1, background: "#f0f0f0", margin: "4px 0" }} />}
                </div>
                <div style={{ paddingBottom: i < 6 ? 20 : 0 }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: row.color }}>{row.actor}</span>
                  <p className="text-[14px] mt-0.5" style={{ color: "#1d1d1f" }}>{row.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#f5f5f7", padding: "64px 48px", textAlign: "center" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 14 }}>See it running live.</h2>
          <p className="text-[15px] mb-8" style={{ color: "#86868b" }}>
            The homepage shows real NAV, real token supply, and real OTC trades — all pulled live from Sepolia. The OTC page lets you trigger all three settlement scenarios against the actual deployed contracts.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/" className="no-underline font-semibold text-white transition-transform hover:-translate-y-0.5" style={{ fontSize: 15, padding: "14px 28px", borderRadius: 980, background: "#1d1d1f" }}>
              View live dashboard
            </Link>
            <Link href="/contact" className="no-underline font-semibold text-[#1d1d1f]" style={{ fontSize: 15, padding: "14px 28px", borderRadius: 980, background: "transparent", border: "1.5px solid #ccc" }}>
              Request access
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
