import Link from "next/link";

interface ManagerCardProps {
  activeTradeCount: number;
}

export default function ManagerCard({ activeTradeCount }: ManagerCardProps) {
  return (
    <div
      className="relative overflow-hidden flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1"
      style={{ borderRadius: 22, background: '#1d1d1f', padding: 36, minHeight: 240 }}
    >
      {/* Rotating glow ring */}
      <div
        className="absolute pointer-events-none animate-spin-slow"
        style={{
          right: -60, top: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'conic-gradient(from 0deg,rgba(255,255,255,0.06) 0%,transparent 40%)',
        }}
      />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#555' }}>
          Fund Manager
        </p>
        <p
          className="font-extrabold text-white leading-none mb-3 animate-count-up"
          style={{ fontSize: 56, letterSpacing: -2 }}
        >
          {activeTradeCount}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: '#555' }}>
          Active OTC trades in flight. Post NAV on-chain, manage whitelisting, monitor fund controls.
        </p>
      </div>
      <Link
        href="/manager"
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-white no-underline transition-all hover:gap-2.5 mt-5"
      >
        Open Console
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M1 7h12M8 2l6 5-6 5" />
        </svg>
      </Link>
    </div>
  );
}
