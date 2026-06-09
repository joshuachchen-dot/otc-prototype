import LiveDot from "./LiveDot";

interface NavChartProps {
  value?: string;
  subtitle?: string;
}

export default function NavChart({ value = '—', subtitle = 'Awaiting on-chain data' }: NavChartProps) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 22, padding: 32, marginBottom: 40 }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[15px] font-bold text-white">NAV / Unit</p>
          <p className="text-[12px] mt-1" style={{ color: '#445' }}>
            Live reading · posted on-chain by NAVRegistry.sol
          </p>
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

      <p className="font-extrabold text-white animate-count-up" style={{ fontSize: 52, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      <p className="text-[12px] mt-2.5" style={{ color: '#556' }}>{subtitle}</p>
    </div>
  );
}
