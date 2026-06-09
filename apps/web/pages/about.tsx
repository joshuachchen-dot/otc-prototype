import Head from "next/head";
import Link from "next/link";

const VALUES = [
  {
    label: "Transparency by default",
    body: "Every NAV posting, trade proposal, and settlement is a permanent on-chain event. No reconciliation disputes. No he-said-she-said. The ledger is the source of truth.",
    icon: "◎",
  },
  {
    label: "Compliance-first architecture",
    body: "KYC, AML velocity limits, and sanctions screening are enforced at the API layer before any transaction ever reaches the chain. The smart contract enforces NAV floors and trade conditions atomically.",
    icon: "⬡",
  },
  {
    label: "Non-custodial settlement",
    body: "Tokens remain in the holder's own address until the moment of settlement. No intermediary holds your assets. No counterparty risk between proposal and execution.",
    icon: "⟡",
  },
];

const PROBLEMS = [
  {
    old: "T+2 settlement cycles — two business days of counterparty exposure on every trade",
    archon: "Atomic settlement — conditions checked and tokens transferred in a single transaction, final in ~12 seconds",
  },
  {
    old: "Reconciliation between fund admin, custodian, and broker — three different books, three sources of error",
    archon: "One source of truth — the Ethereum blockchain. Auditors read it directly, no export needed",
  },
  {
    old: "Compliance checks happen after the fact — flagged trades still settle, then get unwound",
    archon: "Compliance checks happen before the transaction — if conditions fail, the transaction reverts. Nothing settles that shouldn't",
  },
  {
    old: "OTC trade terms are negotiated verbally or via email — no enforceable on-chain record",
    archon: "Seller signs EIP-712 typed-data consent — trade terms are cryptographically bound to the transaction, verifiable by anyone",
  },
];

export default function About() {
  return (
    <>
      <Head>
        <title>About — Archon</title>
        <meta name="description" content="Archon is the on-chain settlement layer for tokenized funds. Built for institutional asset managers, prime brokers, and their investors." />
      </Head>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ padding: "96px 48px 88px", background: "linear-gradient(180deg,#fff 0%,#f5f5f7 100%)" }}
      >
        <div className="absolute rounded-full pointer-events-none animate-drift-a" style={{ width: 600, height: 600, top: -240, left: -120, background: "radial-gradient(circle,#c7d2fe,transparent)", filter: "blur(80px)", opacity: 0.3 }} />
        <div className="absolute rounded-full pointer-events-none animate-drift-b" style={{ width: 400, height: 400, bottom: -100, right: -60, background: "radial-gradient(circle,#bbf7d0,transparent)", filter: "blur(60px)", opacity: 0.3 }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-5" style={{ color: "#c0c0c8" }}>About Archon</p>
          <h1 className="font-extrabold text-[#1d1d1f] animate-fade-up" style={{ fontSize: 52, letterSpacing: -1.8, lineHeight: 1.05, marginBottom: 24 }}>
            Built for institutional finance.<br />
            <span style={{ color: "#86868b" }}>Designed for what comes next.</span>
          </h1>
          <p className="animate-fade-up text-[18px] leading-relaxed" style={{ color: "#86868b", maxWidth: 560, animationDelay: "0.1s" }}>
            Archon is the settlement layer for tokenized funds — bringing the transparency and finality of blockchain to institutional OTC trading without sacrificing compliance, auditability, or control.
          </p>
        </div>
      </section>

      {/* ── Origin ── */}
      <section style={{ background: "#0d1117", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-5" style={{ color: "#334" }}>Why we built this</p>
              <h2 className="font-extrabold text-white" style={{ fontSize: 34, letterSpacing: -1, lineHeight: 1.15, marginBottom: 20 }}>
                The institutional world deserved a better settlement layer.
              </h2>
              <p className="text-[15px] leading-relaxed" style={{ color: "#6b7280", marginBottom: 16 }}>
                Traditional OTC settlement runs on phone calls, emails, and T+2 cycles. Three separate books — fund admin, custodian, prime broker — each reconcile independently, creating friction, cost, and audit gaps that regulators are increasingly uncomfortable with.
              </p>
              <p className="text-[15px] leading-relaxed" style={{ color: "#6b7280" }}>
                The emergence of tokenized real-world assets created an opportunity: if the asset is already on-chain, the settlement should be too. Archon is the infrastructure that makes that possible — compliantly, atomically, and with a full audit trail baked in by default.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { n: "$0", label: "Reconciliation overhead between counterparties when settlement is on-chain" },
                { n: "~12s", label: "Time to final settlement on Ethereum Sepolia, versus 2 business days traditionally" },
                { n: "100%", label: "Of trade conditions enforced atomically — if any fail, the transaction reverts" },
              ].map((s) => (
                <div key={s.n} style={{ background: "#1a2332", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="font-extrabold text-white" style={{ fontSize: 36, letterSpacing: -1, marginBottom: 4 }}>{s.n}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#6b7280" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section style={{ background: "#f5f5f7", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>Our principles</p>
          <h2 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 48 }}>Three things we never compromise on.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {VALUES.map((v) => (
              <div key={v.label} style={{ background: "#fff", borderRadius: 22, padding: 32, border: "1px solid #e5e5ea" }}>
                <div className="font-bold text-[#1d1d1f]" style={{ fontSize: 28, marginBottom: 16 }}>{v.icon}</div>
                <p className="font-bold text-[#1d1d1f]" style={{ fontSize: 16, marginBottom: 10 }}>{v.label}</p>
                <p className="text-[14px] leading-relaxed" style={{ color: "#86868b" }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section style={{ background: "#fff", padding: "72px 48px" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>The problem we solve</p>
          <h2 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 48 }}>
            Traditional settlement is broken in four specific ways.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PROBLEMS.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderRadius: 16, overflow: "hidden", border: "1px solid #e5e5ea" }}>
                <div style={{ padding: "22px 24px", background: "#fafafa", borderRight: "1px solid #e5e5ea" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#f87171" }}>Before</p>
                  <p className="text-[14px] leading-relaxed" style={{ color: "#86868b" }}>{p.old}</p>
                </div>
                <div style={{ padding: "22px 24px", background: "#fff" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#34c759" }}>With Archon</p>
                  <p className="text-[14px] leading-relaxed" style={{ color: "#1d1d1f" }}>{p.archon}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#1d1d1f", padding: "72px 48px", textAlign: "center" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="font-extrabold text-white" style={{ fontSize: 38, letterSpacing: -1.2, marginBottom: 16 }}>
            Ready to see it in action?
          </h2>
          <p className="text-[16px] leading-relaxed mb-10" style={{ color: "#86868b" }}>
            Explore the live platform running on Ethereum Sepolia — real smart contracts, real on-chain settlement, real audit trail.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/platform"
              className="no-underline font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ fontSize: 15, padding: "14px 28px", borderRadius: 980, background: "#00c9a7", border: "none" }}
            >
              See how it works →
            </Link>
            <Link
              href="/contact"
              className="no-underline font-semibold"
              style={{ fontSize: 15, padding: "14px 28px", borderRadius: 980, background: "transparent", border: "1.5px solid #333", color: "#86868b" }}
            >
              Request access
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
