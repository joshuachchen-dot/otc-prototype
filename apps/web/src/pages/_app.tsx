import "@/styles/globals.css";
import type { AppProps } from "next/app";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/investor", label: "Investor" },
  { href: "/manager", label: "Manager" },
  { href: "/auditor", label: "Auditor" },
  { href: "/market", label: "Market" },
  { href: "/otc", label: "OTC" },
];

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <header style={{ borderBottom: "1px solid #e6e6e6", background: "white" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
            OTC Fund Prototype
          </div>
          <nav style={{ display: "flex", gap: 8 }}>
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "#111",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <Component {...pageProps} />
    </>
  );
}