import Link from "next/link";
import { ReactNode } from "react";

export function Layout({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-zinc-900" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Archon</div>
              <div className="text-xs text-zinc-500">
                Institutional OTC Settlement
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <NavLink href="/investor" label="Investor" />
            <NavLink href="/manager" label="Manager" />
            <NavLink href="/auditor" label="Auditor" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {title ? (
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          </div>
        ) : null}
        {children}
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-zinc-500">
          Archon — Institutional OTC settlement on Ethereum Sepolia.
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
    >
      {label}
    </Link>
  );
}
