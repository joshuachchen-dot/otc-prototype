import { useEffect, useState } from "react";
import { API } from "@/lib/api";

type AssetData = { usd: number; change24h: number; marketCap: number };
type Prices = { ethereum: AssetData; bitcoin: AssetData; fetchedAt: number; stale?: boolean };

const REFRESH_INTERVAL = 60_000;

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function ChangeChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: up ? "#dcfce7" : "#fee2e2", color: up ? "#15803d" : "#b91c1c" }}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function AssetCard({ name, symbol, data }: { name: string; symbol: string; data: AssetData }) {
  return (
    <div style={{ border: "1px solid #e5e5ea", borderRadius: 22, padding: 32, background: "white", flex: 1, minWidth: 260 }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.8px] mb-4" style={{ color: "#86868b" }}>
        {name} <span style={{ color: "#c0c0c8" }}>({symbol})</span>
      </p>
      <div className="font-extrabold text-[#1d1d1f] mb-4" style={{ fontSize: 40, letterSpacing: -1.2 }}>
        ${fmt(data.usd)}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm" style={{ color: "#86868b" }}>24h</span>
        <ChangeChip value={data.change24h} />
      </div>
      <p className="text-sm" style={{ color: "#86868b" }}>
        Market cap: <b className="text-[#1d1d1f]">${fmt(data.marketCap / 1e9)}B</b>
      </p>
    </div>
  );
}

export default function Market() {
  const [prices,      setPrices]      = useState<Prices | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function load() {
    try {
      const res = await fetch(API("/market/prices"));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setPrices(data); setError(null); setLastRefresh(new Date());
    } catch (e: any) {
      if (!prices) setError(e.message ?? "Failed to load market data");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", padding: "48px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: "#c0c0c8" }}>Live Data</p>
            <h1 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 40, letterSpacing: -1.2, lineHeight: 1.1 }}>
              Market Prices
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "#86868b" }}>
              Live data via CoinGecko · auto-refreshes every 60 seconds
            </p>
          </div>
          {lastRefresh && (
            <span className="text-sm" style={{ color: "#86868b", marginTop: 8 }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {loading && <p style={{ color: "#86868b" }}>Loading…</p>}

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontSize: 14, marginBottom: 20 }}>
            {error} — is the API running on port 3001?
          </div>
        )}

        {prices?.stale && (
          <div style={{ padding: "10px 16px", borderRadius: 12, background: "#fef9c3", color: "#854d0e", fontSize: 13, marginBottom: 20 }}>
            Showing cached prices — CoinGecko unreachable, retrying in 60 s
          </div>
        )}

        {prices && (
          <>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 32 }}>
              <AssetCard name="Ethereum" symbol="ETH" data={prices.ethereum} />
              <AssetCard name="Bitcoin"  symbol="BTC" data={prices.bitcoin}  />
            </div>

            <div style={{ padding: "18px 22px", border: "1px solid #e5e5ea", borderRadius: 14, background: "#fff", fontSize: 13, color: "#555", lineHeight: 1.7 }}>
              <b style={{ color: "#1d1d1f" }}>NAV Scheduler:</b> The API automatically posts the ETH/USD price as on-chain NAV
              every 60 seconds. View the latest posted value on the{" "}
              <a href="/manager" style={{ color: "#1d1d1f", fontWeight: 700 }}>Manager Console</a>.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
