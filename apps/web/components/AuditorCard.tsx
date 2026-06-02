import Link from "next/link";

export default function AuditorCard() {
  return (
    <div
      className="flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1"
      style={{ borderRadius: 22, background: '#fff', border: '1px solid #e5e5ea', padding: 36, minHeight: 210 }}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#86868b' }}>
          Auditor View
        </p>
        <h3
          className="font-extrabold text-[#1d1d1f] leading-tight mb-3"
          style={{ fontSize: 32, letterSpacing: -1, lineHeight: 1.12 }}
        >
          Immutable<br />audit trail.
        </h3>
        <p className="text-[13px] leading-relaxed" style={{ color: '#86868b' }}>
          Download complete on-chain CSV exports for full regulatory review.
        </p>
      </div>
      <Link
        href="/auditor"
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#1d1d1f] no-underline transition-all hover:gap-2.5 mt-5"
      >
        Export Audit
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M1 7h12M8 2l6 5-6 5" />
        </svg>
      </Link>
    </div>
  );
}
