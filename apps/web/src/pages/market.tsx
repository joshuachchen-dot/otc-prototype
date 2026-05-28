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
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 700,
        background: up ? "#dcfce7" : "#fee2e2",
        color: up ? "#15803d" : "#b91c1c",
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function AssetCard({ name, symbol, data }: { name: string; symbol: string; data: AssetData }) {
  return (
    <div
      style={{
        border: "1px solid #e6e6e6",
        borderRadius: 14,
        padding: 24,
        background: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        minWidth: 260,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 13, color: "#888", fontWeight: 600, marginBottom: 6 }}>
        {name} <span style={{ color: "#bbb" }}>({symbol})</span>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: "#111", marginBottom: 8 }}>
        ${fmt(data.usd)}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#666" }}>24h change</span>
        <ChangeChip value={data.change24h} />
      </div>
      <div style={{ fontSize: 13, color: "#888" }}>
        Market cap: <b style={{ color: "#444" }}>${fmt(data.marketCap / 1e9)}B</b>
      </div>
    </div>
  );
}

export default function Market() {
  const [prices, setPrices] = useState<Prices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function load() {
    try {
      const res = await fetch(API("/market/prices"));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setPrices(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: any) {
      // Only show hard error if we have no prices at all
      if (!prices) {
        setError(e.message ?? "Failed to load market data");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const ff = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: ff }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, color: "#111" }}>
            Market Prices
          </h1>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
            Live data via CoinGecko · auto-refreshes every 60 s
          </p>
        </div>
        {lastRefresh && (
          <span style={{ fontSize: 12, color: "#aaa" }}>
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {loading && (
        <p style={{ color: "#888" }}>Loading…</p>
      )}

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#fee2e2",
            color: "#b91c1c",
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          {error} — is the API running on port 3001?
        </div>
      )}

      {prices?.stale && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#fef9c3",
            color: "#854d0e",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          ⚠ Showing cached prices — CoinGecko unreachable, retrying in 60 s
        </div>
      )}

      {prices && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
            <AssetCard name="Ethereum" symbol="ETH" data={prices.ethereum} />
            <AssetCard name="Bitcoin"  symbol="BTC" data={prices.bitcoin}  />
          </div>

          <div
            style={{
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 12,
              background: "#fafafa",
              fontSize: 13,
              color: "#555",
            }}
          >
            <b>NAV Scheduler:</b> The API automatically posts the ETH/USD price as on-chain NAV
            every 60 seconds. View the latest posted value on the{" "}
            <a href="/manager" style={{ color: "#111", fontWeight: 700 }}>Manager Console</a>.
          </div>
        </>
      )}
    </div>
  );
}
