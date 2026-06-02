const BAR_HEIGHTS = [42, 55, 48, 70, 62, 80, 74, 90, 85, 100];
const X_LABELS   = ['May 24','May 25','May 26','May 27','May 28','May 29','May 30','May 31','Jun 1','Jun 2'];
const TABS       = ['7D', '30D', 'All'];

interface NavChartProps {
  activeTab?: string;
}

export default function NavChart({ activeTab = '7D' }: NavChartProps) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 22, padding: 32, marginBottom: 40 }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[15px] font-bold text-white">NAV History</p>
          <p className="text-[12px] mt-1" style={{ color: '#445' }}>
            On-chain posted values · Last 10 entries
          </p>
        </div>
        <div className="flex gap-1">
          {TABS.map(tab => (
            <span
              key={tab}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
              style={tab === activeTab
                ? { background: '#1a2332', color: '#00c9a7' }
                : { color: '#556' }
              }
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-1.5" style={{ height: 110 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md"
            style={{
              height: `${h}%`,
              background: 'linear-gradient(180deg, #00c9a7, rgba(0,201,167,0.10))',
              transformOrigin: 'bottom',
              animation: `growBar 0.8s ${i * 0.05}s ease both`,
            }}
          />
        ))}
      </div>

      <div className="flex justify-between mt-2.5">
        {X_LABELS.map(l => (
          <span key={l} className="text-[9px]" style={{ color: '#334' }}>{l}</span>
        ))}
      </div>
    </div>
  );
}
