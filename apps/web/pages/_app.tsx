import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import type { SessionUser } from "@/lib/auth-client";
import { ROLE_COLOR, ROLE_LABEL, ROLE_HOME } from "@/lib/auth-client";

const PUBLIC_NAV = [
  { href: "/",            label: "Home" },
  { href: "/about",       label: "About" },
  { href: "/why-onchain", label: "Why On-Chain" },
  { href: "/platform",    label: "How It Works" },
  { href: "/contact",     label: "Contact" },
];


export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { pathname } = router;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => { setUser(d.user ?? null); setAuthChecked(true); })
      .catch(() => { setUser(null); setAuthChecked(true); });
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  }

  const isPublicPage = PUBLIC_NAV.some(n => n.href === pathname) || pathname === '/login';

  return (
    <SessionProvider session={(pageProps as any).session}>
      <header
        className="sticky top-0 z-20 border-b border-[#f0f0f0] bg-white/90 backdrop-blur-md"
        style={{ height: 60 }}
      >
        <div className="flex h-full items-center px-12">
          {/* Logo — always links to role home or / */}
          <Link
            href={user ? ROLE_HOME[user.role] : "/"}
            className="text-[17px] font-bold text-[#1d1d1f] no-underline"
            style={{ letterSpacing: -0.4, flexShrink: 0 }}
          >
            Archon
          </Link>

          {/* Nav links — public pages always visible */}
          <nav className="flex gap-7 mx-auto">
            {PUBLIC_NAV.map(({ href, label }) => (
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
            {user && (
              <Link
                href={ROLE_HOME[user.role]}
                className="no-underline text-sm transition-colors"
                style={{
                  color: ROLE_COLOR[user.role],
                  fontWeight: 600,
                }}
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* Right side */}
          {authChecked && (
            user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* Role badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 14px',
                    borderRadius: 980,
                    background: `${ROLE_COLOR[user.role]}18`,
                    border: `1px solid ${ROLE_COLOR[user.role]}44`,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: ROLE_COLOR[user.role],
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[user.role] }}>
                    {user.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#86868b' }}>
                    · {ROLE_LABEL[user.role]}
                  </span>
                </div>

                {/* Logout */}
                <button
                  onClick={logout}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#86868b',
                    background: 'none',
                    border: '1.5px solid #e5e5ea',
                    borderRadius: 980,
                    padding: '7px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              !isPublicPage ? null : (
                <Link
                  href="/login"
                  className="no-underline text-[#1d1d1f] text-sm font-semibold"
                  style={{ padding: "9px 20px", borderRadius: 980, background: "#1d1d1f", color: "#fff", flexShrink: 0 }}
                >
                  Sign In
                </Link>
              )
            )
          )}
        </div>
      </header>

      <Component {...pageProps} />
    </SessionProvider>
  );
}
