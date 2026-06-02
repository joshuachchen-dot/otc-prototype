import Link from "next/link";
import LiveDot from "./LiveDot";

export interface OTCTrade {
  id: string;
  seller: string;
  buyer: string;
  amount: string;
  nav: string;
  status: "settled" | "pending";
}

interface OTCFeedProps {
  trades: OTCTrade[];
}

export default function OTCFeed({ trades }: OTCFeedProps) {
  return (
    <div
      className="col-span-2 flex flex-col transition-transform duration-300 hover:-translate-y-1"
      style={{ borderRadius: 22, background: '#0d1117', padding: 32 }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[16px] font-bold text-white">Recent OTC Activity</p>
          <p className="text-[12px] mt-1" style={{ color: '#445' }}>Live settlement feed</p>
        </div>
        <span
          className="flex items-center gap-1.5 text-[10px] font-semibold"
          style={{
            background: 'rgba(0,201,167,0.1)',
            border: '1px solid rgba(0,201,167,0.25)',
            borderRadius: 20,
            padding: '5px 14px',
            color: '#00c9a7',
          }}
        >
          <LiveDot size={6} />
          Live
        </span>
      </div>

      {trades.map((t, i) => (
        <div
          key={t.id}
          className="flex items-center gap-3.5"
          style={{
            padding: '16px 0',
            borderBottom: i < trades.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            animation: `fadeUp 0.5s ${i * 0.1}s ease both`,
          }}
        >
          <span
            className="rounded-full flex-shrink-0"
            style={{
              width: 9,
              height: 9,
              background: t.status === 'settled' ? '#34c759' : '#ff9f0a',
              animation: t.status === 'pending' ? 'pendingPulse 2s ease-in-out infinite' : undefined,
            }}
          />
          <div className="flex-1">
            <p className="text-[11px]" style={{ color: '#445', fontFamily: "'SF Mono',ui-monospace,monospace" }}>
              {t.seller.slice(0, 10)}... ↔ {t.buyer.slice(0, 10)}...
            </p>
            <p
              className="text-[10px] font-semibold mt-1"
              style={{ color: t.status === 'settled' ? '#34c759' : '#ff9f0a' }}
            >
              {t.status === 'settled' ? 'Settled' : 'Pending Settlement'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[14px] font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {t.amount}
            </p>
            <p className="text-[10px] mt-1" style={{ color: '#445' }}>NAV {t.nav}</p>
          </div>
        </div>
      ))}

      <div className="flex justify-end mt-5">
        <Link
          href="/otc"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline transition-all hover:gap-2.5"
          style={{ color: '#00c9a7' }}
        >
          View all trades
          <svg width={13} height={13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M1 6.5h11M7 2l5 4.5L7 11" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
