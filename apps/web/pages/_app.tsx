import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useRouter } from "next/router";

const NAV_LINKS = [
  { href: "/",         label: "Platform" },
  { href: "/investor", label: "Investors" },
  { href: "/manager",  label: "Fund Manager" },
  { href: "/auditor",  label: "Compliance" },
];

export default function App({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter();

  return (
    <>
      <header
        className="sticky top-0 z-20 border-b border-[#f0f0f0] bg-white/90 backdrop-blur-md"
        style={{ height: 60 }}
      >
        <div className="flex h-full items-center px-12">
          <Link href="/" className="text-[17px] font-bold text-[#1d1d1f] no-underline" style={{ letterSpacing: -0.4 }}>
            Archon
          </Link>
          <nav className="flex gap-8 mx-auto">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="no-underline text-sm transition-colors"
                style={{
                  color: pathname === href ? "#1d1d1f" : "#86868b",
                  fontWeight: pathname === href ? 600 : 500,
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/investor"
            className="no-underline text-white text-sm font-semibold"
            style={{ padding: "9px 20px", borderRadius: 980, background: "#1d1d1f" }}
          >
            Access Portal
          </Link>
        </div>
      </header>
      <Component {...pageProps} />
    </>
  );
}
