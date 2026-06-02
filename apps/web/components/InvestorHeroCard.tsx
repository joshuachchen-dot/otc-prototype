import Link from "next/link";

export default function InvestorHeroCard() {
  return (
    <div
      className="relative overflow-hidden flex flex-col justify-end col-span-2 transition-transform duration-300 hover:-translate-y-1"
      style={{ borderRadius: 22, background: 'linear-gradient(135deg,#1a1a2e,#0d1117)', minHeight: 240, padding: 36 }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.04,
          backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none animate-breathe"
        style={{ background: 'radial-gradient(ellipse at top right,rgba(99,102,241,0.3),transparent 60%)' }}
      />
      {/* Mini line chart */}
      <div
        className="absolute top-7 right-7"
        style={{ animation: 'fadeUp 1s 0.6s ease both', opacity: 0 }}
      >
        <svg width={130} height={58} viewBox="0 0 130 58">
          <defs>
            <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0)" />
            </linearGradient>
          </defs>
          <polygon
            points="0,54 0,50 22,40 42,43 62,28 84,19 105,13 130,7 130,54"
            fill="url(#invGrad)"
          />
          <polyline
            points="0,50 22,40 42,43 62,28 84,19 105,13 130,7"
            fill="none"
            stroke="rgba(99,102,241,0.85)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={300}
            strokeDashoffset={300}
            style={{ animation: 'drawLine 1.8s 0.5s ease forwards' }}
          />
        </svg>
      </div>

      <div className="relative z-10">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-3"
          style={{
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 6,
            padding: '4px 11px',
            color: '#a5b4fc',
          }}
        >
          Investor Portal
        </span>
        <h3 className="text-[26px] font-extrabold text-white leading-tight tracking-tight">
          Subscribe, redeem,<br />track your exposure.
        </h3>
        <p className="text-[14px] mt-2 leading-relaxed" style={{ color: '#556', maxWidth: 360 }}>
          Real-time token balance, KYC status, and live risk overview — all on-chain.
        </p>
        <Link
          href="/investor"
          className="inline-flex items-center gap-1.5 mt-6 text-[14px] font-semibold no-underline transition-all hover:gap-2.5"
          style={{ color: '#a5b4fc' }}
        >
          Open Portal
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M1 7h12M8 2l6 5-6 5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
