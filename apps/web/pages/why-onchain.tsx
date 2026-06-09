import Head from "next/head";
import Link from "next/link";

const COMPARISON = [
  {
    dimension: "Settlement finality",
    traditional: "T+2 — two business days of open counterparty exposure",
    coinbase: "Internal ledger update — fast, but off-chain and opaque",
    archon: "~12 seconds — final on Ethereum, publicly verifiable",
  },
  {
    dimension: "Trade terms enforcement",
    traditional: "Verbal / email negotiation. No automated enforcement.",
    coinbase: "Coinbase intermediates and enforces internally. You trust them.",
    archon: "EIP-712 signed by seller, verified by smart contract. Trustless.",
  },
  {
    dimension: "Audit trail",
    traditional: "Reconcile three separate books: fund admin, custodian, broker",
    coinbase: "Coinbase's internal reporting. Not independently verifiable.",
    archon: "Every event on-chain. Any auditor queries Ethereum directly.",
  },
  {
    dimension: "Compliance",
    traditional: "KYC/AML checked manually, often post-trade. Unwinding is painful.",
    coinbase: "Coinbase handles compliance. You outsource it entirely.",
    archon: "KYC/AML/sanctions enforced by API before any tx reaches the chain. NAV floor enforced by contract.",
  },
  {
    dimension: "Asset custody",
    traditional: "Custodian holds assets. Counterparty risk between proposal and settlement.",
    coinbase: "Deposit into Coinbase. They hold it. You trust their solvency.",
    archon: "Non-custodial. Tokens stay in seller's address until atomic settlement.",
  },
  {
    dimension: "Who can verify",
    traditional: "Only parties with access to each institution's internal systems",
    coinbase: "Only Coinbase — and regulators who subpoena them",
    archon: "Anyone with an Ethereum node — including LPs, regulators, auditors",
  },
];

const BENEFITS = [
  {
    title: "Atomic finality",
    body: "Either every condition passes and the trade settles, or every condition fails and nothing happens. There is no partial settlement, no unwinding, no contested state. The blockchain guarantees this mathematically.",
    color: "#6366f1",
    icon: "⚡",
  },
  {
    title: "Zero reconciliation",
    body: "There is one ledger. Every party — fund manager, investor, broker, auditor, regulator — reads the same chain. No reconciliation. No disputes about what the record says.",
    color: "#00c9a7",
    icon: "◎",
  },
  {
    title: "Programmable compliance",
    body: "Compliance rules are code, not policy documents. A trade that violates NAV floors, AML velocity limits, or KYC requirements cannot settle — not because a human blocked it, but because the transaction would revert.",
    color: "#34c759",
    icon: "⬡",
  },
  {
    title: "Permissionless auditability",
    body: "Your LP, your fund administrator, your regulator, and your external auditor can all verify your fund's complete history from any Ethereum node. No API, no export, no trust in Archon required.",
    color: "#f59e0b",
    icon: "◈",
  },
];

export default function WhyOnchain() {
  return (
    <>
      <Head>
        <title>Why On-Chain — Archon</title>
        <meta name="description" content="Why on-chain settlement is fundamentally better than Coinbase Prime-style centralized OTC for tokenized fund infrastructure." />
      </Head>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ padding: "96px 48px 80px", background: "linear-gradient(180deg,#fff 0%,#f5f5f7 100%)" }}
      >
        <div className="absolute rounded-full pointer-events-none animate-drift-a" style={{ width: 500, height: 500, top: -200, left: -60, background: "radial-gradient(circle,#bbf7d0,transparent)", filter: "blur(80px)", opacity: 0.35 }} />
        <div className="absolute rounded-full pointer-events-none animate-drift-b" style={{ width: 400, height: 400, bottom: -100, right: -60, background: "radial-gradient(circle,#c7d2fe,transparent)", filter: "blur(70px)", opacity: 0.3 }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-5" style={{ color: "#c0c0c8" }}>The case for on-chain</p>
          <h1 className="font-extrabold text-[#1d1d1f] animate-fade-up" style={{ fontSize: 52, letterSpacing: -1.8, lineHeight: 1.05, marginBottom: 24 }}>
            Centralized OTC is fast.<br />
            <span style={{ color: "#86868b" }}>It's still broken in four ways.</span>
          </h1>
          <p className="text-[17px] leading-relaxed animate-fade-up" style={{ color: "#86868b", maxWidth: 520, margin: "0 auto", animationDelay: "0.1s" }}>
            Platforms like Coinbase Prime solve the speed problem. They don't solve the trust problem, the auditability problem, or the compliance-enforcement problem. On-chain settlement does.
          </p>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section style={{ background: "#f5f5f7", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>What on-chain gives you</p>
          <h2 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 40 }}>Four guarantees no centralized platform can match.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {BENEFITS.map((b) => (
              <div key={b.title} style={{ background: "#fff", borderRadius: 22, padding: 32, border: "1px solid #e5e5ea" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: b.color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 22 }}>
                  {b.icon}
                </div>
                <p className="font-bold text-[#1d1d1f]" style={{ fontSize: 17, marginBottom: 10 }}>{b.title}</p>
                <p className="text-[14px] leading-relaxed" style={{ color: "#86868b" }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section style={{ background: "#0d1117", padding: "72px 48px" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#334" }}>Head to head</p>
          <h2 className="font-extrabold text-white" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 40 }}>Archon vs. traditional OTC vs. Coinbase Prime.</h2>

          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr", gap: 0, marginBottom: 8 }}>
            <div />
            {["Traditional OTC", "Coinbase Prime", "Archon"].map((h, i) => (
              <div key={h} style={{ padding: "10px 16px", textAlign: "center" }}>
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: i === 2 ? "#00c9a7" : "#445" }}>{h}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {COMPARISON.map((row) => (
              <div key={row.dimension} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr", gap: 0, background: "#1a2332", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="font-semibold text-[13px]" style={{ color: "#e5e7eb" }}>{row.dimension}</p>
                </div>
                <div style={{ padding: "16px 18px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#6b7280" }}>{row.traditional}</p>
                </div>
                <div style={{ padding: "16px 18px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#6b7280" }}>{row.coinbase}</p>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <p className="text-[12px] leading-relaxed font-medium" style={{ color: "#d1fae5" }}>{row.archon}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section style={{ background: "#fff", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>Who Archon is for</p>
          <h2 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 12 }}>
            A different customer than Coinbase Prime.
          </h2>
          <p className="text-[16px] mb-10 leading-relaxed" style={{ color: "#86868b", maxWidth: 600 }}>
            Coinbase Prime serves institutions that already hold crypto and want to trade it. Archon serves institutions building <em>fund infrastructure</em> around tokenized assets — a fundamentally different need.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: "Asset managers launching tokenized funds", body: "Need a compliant subscription/redemption flow, auditable NAV attestation, and a settlement mechanism their LPs and administrators can independently verify." },
              { title: "Prime brokers for tokenized RWAs", body: "Facilitating OTC bilateral transfers between institutional investors in tokenized fund shares — requiring the same compliance stack as traditional securities but at blockchain speed." },
              { title: "Fund administrators & compliance officers", body: "Need a real-time, audit-ready record of all fund activity — NAV history, investor registry, trade log — without reconciling three separate internal systems." },
              { title: "Family offices & institutional LPs", body: "Investing in tokenized funds and wanting verifiable, non-custodial exposure — seeing their holdings and transaction history directly on-chain, not in a counterparty's database." },
            ].map((card) => (
              <div key={card.title} style={{ background: "#fafafa", borderRadius: 18, padding: "24px 26px", border: "1px solid #e5e5ea" }}>
                <p className="font-bold text-[#1d1d1f]" style={{ fontSize: 15, marginBottom: 8 }}>{card.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "#86868b" }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#1d1d1f", padding: "64px 48px", textAlign: "center" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="font-extrabold text-white" style={{ fontSize: 36, letterSpacing: -1.2, marginBottom: 14 }}>
            Convinced? See it running.
          </h2>
          <p className="text-[15px] mb-8" style={{ color: "#86868b" }}>
            The live platform is running on Ethereum Sepolia. Real contracts. Real settlement. Real audit trail.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/platform" className="no-underline font-semibold text-white transition-transform hover:-translate-y-0.5" style={{ fontSize: 15, padding: "14px 28px", borderRadius: 980, background: "#00c9a7" }}>
              How it works →
            </Link>
            <Link href="/contact" className="no-underline font-semibold" style={{ fontSize: 15, padding: "14px 28px", borderRadius: 980, background: "transparent", border: "1.5px solid #333", color: "#86868b" }}>
              Request access
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
