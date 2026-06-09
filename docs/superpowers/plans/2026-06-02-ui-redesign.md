# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the OTC platform web UI to a premium Apple/editorial style with animated graphics, dark data panels, and no prototype/simulation language.

**Architecture:** All pages share a new global design token layer (CSS custom properties + keyframes in `globals.css`) and a redesigned `_app.tsx` nav. The home page uses a grid of specialised panel components. Each portal page is updated independently to use the same token system. The duplicate `src/pages/` directory is removed to fix the routing conflict identified in the governance report.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS (extended), inline SVG, CSS keyframe animations.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `apps/web/styles/globals.css` | CSS custom properties + all keyframe animations |
| Modify | `apps/web/tailwind.config.js` | Extended colour/shadow tokens matching design spec |
| Modify | `apps/web/pages/_app.tsx` | New sticky nav with Archon branding |
| Modify | `apps/web/pages/index.tsx` | Full home page redesign |
| Create | `apps/web/components/LiveDot.tsx` | Reusable animated pulse dot |
| Create | `apps/web/components/Sparkline.tsx` | Animated SVG sparkline |
| Create | `apps/web/components/NavChart.tsx` | Dark animated bar chart panel |
| Create | `apps/web/components/InvestorHeroCard.tsx` | Dark 2-col investor card with line chart |
| Create | `apps/web/components/ManagerCard.tsx` | Editorial dark manager card |
| Create | `apps/web/components/AuditorCard.tsx` | Editorial light auditor card |
| Create | `apps/web/components/OTCFeed.tsx` | Dark live OTC activity feed |
| Modify | `apps/web/pages/investor.tsx` | Apply design system |
| Modify | `apps/web/pages/manager.tsx` | Apply design system |
| Modify | `apps/web/pages/auditor.tsx` | Apply design system |
| Modify | `apps/web/pages/otc.tsx` | Apply design system |
| Modify | `apps/web/pages/market.tsx` | Apply design system |
| Delete | `apps/web/src/pages/` (entire directory) | Remove routing conflict |

---

## Task 1: Fix Routing Conflict

**Files:**
- Delete: `apps/web/src/pages/` (entire directory — contains stale duplicate pages)
- Keep: `apps/web/pages/` (canonical router)

- [ ] **Step 1: Verify pages/ has all routes**

```bash
ls apps/web/pages/
```
Expected output includes: `_app.tsx  auditor.tsx  index.tsx  investor.tsx  manager.tsx  market.tsx  otc.tsx`

- [ ] **Step 2: Remove the conflicting src/pages directory**

```bash
rm -rf apps/web/src/pages
```

- [ ] **Step 3: Verify Next.js still resolves pages correctly**

```bash
cd apps/web && pnpm dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: `200`

Kill the dev server: `pkill -f "next dev"`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: remove duplicate src/pages to resolve Next.js routing conflict"
```

---

## Task 2: CSS Foundation — Tokens and Keyframes

**Files:**
- Modify: `apps/web/styles/globals.css`
- Modify: `apps/web/tailwind.config.js`

- [ ] **Step 1: Replace globals.css with full token + animation layer**

```css
/* apps/web/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg-page:        #f0f0f5;
  --color-bg-site:        #ffffff;
  --color-bg-content:     #f5f5f7;
  --color-bg-dark:        #0d1117;
  --color-bg-dark-card:   #1d1d1f;
  --color-text-primary:   #1d1d1f;
  --color-text-secondary: #86868b;
  --color-text-muted:     #445;
  --color-green:          #34c759;
  --color-teal:           #00c9a7;
  --color-indigo:         #6366f1;
  --color-indigo-light:   #a5b4fc;
  --color-amber:          #ff9f0a;
  --color-border-light:   #e5e5ea;
  --color-border-subtle:  #f0f0f0;
  --radius-card:          22px;
  --radius-pill:          980px;

  color-scheme: light;
}

body {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Animations ── */
@keyframes driftA {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(60px, 40px) scale(1.1); }
}
@keyframes driftB {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(-40px, 60px) scale(1.08); }
}
@keyframes livePulse {
  0%   { opacity: 0.6; transform: scale(1); }
  100% { opacity: 0;   transform: scale(2.4); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}
@keyframes growBar {
  from { transform: scaleY(0); opacity: 0; }
  to   { transform: scaleY(1); opacity: 1; }
}
@keyframes breathe {
  from { opacity: 0.7; }
  to   { opacity: 1.0; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pendingPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

- [ ] **Step 2: Extend tailwind.config.js with design tokens**

```js
// apps/web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark:    { DEFAULT: '#0d1117', card: '#1d1d1f' },
        brand:   { DEFAULT: '#6366f1', light: '#a5b4fc' },
        teal:    { DEFAULT: '#00c9a7' },
        success: { DEFAULT: '#34c759' },
        warning: { DEFAULT: '#ff9f0a' },
      },
      borderRadius: {
        card: '22px',
        pill: '980px',
      },
      boxShadow: {
        soft:  '0 8px 30px rgba(0,0,0,0.06)',
        card:  '0 16px 40px rgba(0,0,0,0.08)',
        'card-dark': '0 20px 48px rgba(0,0,0,0.3)',
      },
      animation: {
        'drift-a':      'driftA 14s ease-in-out infinite alternate',
        'drift-b':      'driftB 18s ease-in-out infinite alternate',
        'live-pulse':   'livePulse 2s ease-out infinite',
        'fade-up':      'fadeUp 0.8s ease both',
        'count-up':     'countUp 1.2s ease both',
        'breathe':      'breathe 6s ease-in-out infinite alternate',
        'spin-slow':    'spin 20s linear infinite',
        'pending':      'pendingPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Verify Tailwind compiles without errors**

```bash
cd apps/web && pnpm build 2>&1 | grep -E "error|Error|✓|✗" | head -20
```
Expected: No TypeScript or Tailwind errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/styles/globals.css apps/web/tailwind.config.js
git commit -m "feat: add design token CSS properties and animation keyframes"
```

---

## Task 3: Redesign Global Nav

**Files:**
- Modify: `apps/web/pages/_app.tsx`
- Create: `apps/web/components/LiveDot.tsx`

- [ ] **Step 1: Create LiveDot component**

```tsx
// apps/web/components/LiveDot.tsx
export default function LiveDot({ size = 8 }: { size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full bg-success animate-live-pulse"
        style={{ inset: -3 }}
      />
      <span
        className="relative rounded-full bg-success"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
```

- [ ] **Step 2: Replace _app.tsx with redesigned nav**

```tsx
// apps/web/pages/_app.tsx
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
          <Link href="/" className="text-[17px] font-bold tracking-tight text-[#1d1d1f] no-underline">
            Archon
          </Link>
          <nav className="flex gap-8 mx-auto">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="no-underline text-sm font-medium transition-colors"
                style={{ color: pathname === href ? '#1d1d1f' : '#86868b', fontWeight: pathname === href ? 600 : 500 }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/investor"
            className="rounded-pill bg-[#1d1d1f] text-white text-sm font-semibold no-underline"
            style={{ padding: '9px 20px', borderRadius: 980 }}
          >
            Access Portal
          </Link>
        </div>
      </header>
      <Component {...pageProps} />
    </>
  );
}
```

- [ ] **Step 3: Start dev server and verify nav renders**

```bash
cd apps/web && pnpm dev &
sleep 6
curl -s http://localhost:3000 | grep -i "Archon"
```
Expected: `Archon` appears in the HTML.

Kill dev server: `pkill -f "next dev"`

- [ ] **Step 4: Commit**

```bash
git add apps/web/pages/_app.tsx apps/web/components/LiveDot.tsx
git commit -m "feat: redesign global nav with Archon branding and sticky blur"
```

---

## Task 4: Sparkline and NavChart Components

**Files:**
- Create: `apps/web/components/Sparkline.tsx`
- Create: `apps/web/components/NavChart.tsx`

- [ ] **Step 1: Create Sparkline component**

```tsx
// apps/web/components/Sparkline.tsx
interface SparklineProps {
  points: string;   // SVG polyline points string e.g. "0,26 10,20 20,14"
  color?: string;
  delay?: string;   // CSS animation delay e.g. "0.15s"
  width?: number;
  height?: number;
}

export default function Sparkline({
  points,
  color = '#34c759',
  delay = '0s',
  width = 64,
  height = 32,
}: SparklineProps) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={300}
        strokeDashoffset={300}
        style={{ animation: `drawLine 1.5s ${delay} ease forwards` }}
      />
    </svg>
  );
}
```

- [ ] **Step 2: Create NavChart component**

```tsx
// apps/web/components/NavChart.tsx
const BAR_HEIGHTS = [42, 55, 48, 70, 62, 80, 74, 90, 85, 100];
const X_LABELS   = ['May 24','May 25','May 26','May 27','May 28','May 29','May 30','May 31','Jun 1','Jun 2'];
const TABS       = ['7D', '30D', 'All'];

interface NavChartProps {
  activeTab?: string;
}

export default function NavChart({ activeTab = '7D' }: NavChartProps) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 22, padding: 32, marginBottom: 40 }}>
      {/* Header */}
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

      {/* Bars */}
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

      {/* X-axis */}
      <div className="flex justify-between mt-2.5">
        {X_LABELS.map(l => (
          <span key={l} className="text-[9px]" style={{ color: '#334' }}>{l}</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/Sparkline.tsx apps/web/components/NavChart.tsx
git commit -m "feat: add Sparkline and NavChart components with CSS animations"
```

---

## Task 5: Portal Card Components

**Files:**
- Create: `apps/web/components/InvestorHeroCard.tsx`
- Create: `apps/web/components/ManagerCard.tsx`
- Create: `apps/web/components/AuditorCard.tsx`
- Create: `apps/web/components/OTCFeed.tsx`

- [ ] **Step 1: Create InvestorHeroCard**

```tsx
// apps/web/components/InvestorHeroCard.tsx
import Link from "next/link";

export default function InvestorHeroCard() {
  return (
    <div
      className="relative overflow-hidden flex flex-col justify-end col-span-2 transition-transform duration-300 hover:-translate-y-1"
      style={{ borderRadius: 22, background: 'linear-gradient(135deg,#1a1a2e,#0d1117)', minHeight: 240, padding: 36 }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.04,
          backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none animate-breathe"
        style={{ background: 'radial-gradient(ellipse at top right,rgba(99,102,241,0.3),transparent 60%)' }}
      />
      {/* Mini line chart */}
      <div className="absolute top-7 right-7" style={{ animation: 'fadeUp 1s 0.6s ease both', opacity: 0 }}>
        <svg width={130} height={58} viewBox="0 0 130 58">
          <defs>
            <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0)" />
            </linearGradient>
          </defs>
          <polygon
            points="0,54 0,50 22,40 42,43 62,28 84,19 105,13 130,7 130,54"
            fill="url(#invGrad)"
          />
          <polyline
            points="0,50 22,40 42,43 62,28 84,19 105,13 130,7"
            fill="none"
            stroke="rgba(99,102,241,0.85)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={300}
            strokeDashoffset={300}
            style={{ animation: 'drawLine 1.8s 0.5s ease forwards' }}
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-3"
          style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, padding: '4px 11px', color: '#a5b4fc' }}
        >
          Investor Portal
        </span>
        <h3 className="text-[26px] font-extrabold text-white leading-tight tracking-tight">
          Subscribe, redeem,<br />track your exposure.
        </h3>
        <p className="text-[14px] mt-2 leading-relaxed" style={{ color: '#556', maxWidth: 360 }}>
          Real-time token balance, KYC status, and live risk overview — all on-chain.
        </p>
        <Link
          href="/investor"
          className="inline-flex items-center gap-1.5 mt-6 text-[14px] font-semibold no-underline transition-all hover:gap-2.5"
          style={{ color: '#a5b4fc' }}
        >
          Open Portal
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M1 7h12M8 2l6 5-6 5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ManagerCard**

```tsx
// apps/web/components/ManagerCard.tsx
import Link from "next/link";

interface ManagerCardProps {
  activeTradeCount: number;
}

export default function ManagerCard({ activeTradeCount }: ManagerCardProps) {
  return (
    <div
      className="relative overflow-hidden flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1"
      style={{ borderRadius: 22, background: '#1d1d1f', padding: 36, minHeight: 240 }}
    >
      {/* Rotating glow ring */}
      <div
        className="absolute pointer-events-none animate-spin-slow"
        style={{ right: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(255,255,255,0.06) 0%,transparent 40%)' }}
      />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#555' }}>
          Fund Manager
        </p>
        <p
          className="font-extrabold text-white leading-none mb-3 animate-count-up"
          style={{ fontSize: 56, letterSpacing: -2 }}
        >
          {activeTradeCount}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: '#555' }}>
          Active OTC trades in flight. Post NAV on-chain, manage whitelisting, monitor fund controls.
        </p>
      </div>
      <Link
        href="/manager"
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-white no-underline transition-all hover:gap-2.5 mt-5"
      >
        Open Console
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M1 7h12M8 2l6 5-6 5" />
        </svg>
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create AuditorCard**

```tsx
// apps/web/components/AuditorCard.tsx
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
```

- [ ] **Step 4: Create OTCFeed**

```tsx
// apps/web/components/OTCFeed.tsx
import Link from "next/link";
import LiveDot from "./LiveDot";

export interface OTCTrade {
  id: string;
  seller: string;
  buyer: string;
  amount: string;       // human-readable e.g. "50,000 OTCF"
  nav: string;          // human-readable e.g. "$3,021.40"
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
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[16px] font-bold text-white">Recent OTC Activity</p>
          <p className="text-[12px] mt-1" style={{ color: '#445' }}>Live settlement feed</p>
        </div>
        <span
          className="flex items-center gap-1.5 text-[10px] font-semibold"
          style={{ background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.25)', borderRadius: 20, padding: '5px 14px', color: '#00c9a7' }}
        >
          <LiveDot size={6} />
          Live
        </span>
      </div>

      {/* Trade rows */}
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
              width: 9, height: 9,
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
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/InvestorHeroCard.tsx apps/web/components/ManagerCard.tsx apps/web/components/AuditorCard.tsx apps/web/components/OTCFeed.tsx
git commit -m "feat: add portal card components (InvestorHero, Manager, Auditor, OTCFeed)"
```

---

## Task 6: Home Page Redesign

**Files:**
- Modify: `apps/web/pages/index.tsx`

- [ ] **Step 1: Replace index.tsx with the full redesigned home page**

```tsx
// apps/web/pages/index.tsx
import Head from "next/head";
import LiveDot from "@/components/LiveDot";
import Sparkline from "@/components/Sparkline";
import NavChart from "@/components/NavChart";
import InvestorHeroCard from "@/components/InvestorHeroCard";
import ManagerCard from "@/components/ManagerCard";
import AuditorCard from "@/components/AuditorCard";
import OTCFeed, { OTCTrade } from "@/components/OTCFeed";

const METRICS = [
  {
    label: "NAV / Unit",
    value: "$3,024.18",
    delta: "↑ 2.1% today",
    up: true,
    sparkPoints: "0,30 10,23 22,25 34,16 46,10 64,4",
    delay: "0s",
  },
  {
    label: "Total AUM",
    value: "$48.2M",
    delta: "↑ $1.4M this week",
    up: true,
    sparkPoints: "0,26 12,21 24,18 36,14 48,16 64,6",
    delay: "0.15s",
  },
  {
    label: "Active OTC Trades",
    value: "12",
    delta: "3 pending settlement",
    up: false,
    sparkPoints: "0,22 12,19 24,24 36,15 48,12 64,9",
    delay: "0.3s",
  },
];

const MOCK_TRADES: OTCTrade[] = [
  { id: "1", seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", buyer: "0x3C44CddB6a900fa2b585dd299e03d12FA4293BC", amount: "50,000 OTCF", nav: "$3,021.40", status: "settled" },
  { id: "2", seller: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", buyer: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", amount: "12,500 OTCF", nav: "$3,024.18", status: "pending" },
  { id: "3", seller: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", buyer: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", amount: "80,000 OTCF", nav: "$3,018.75", status: "settled" },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Archon — Institutional OTC Settlement</title>
        <meta name="description" content="Compliant tokenized fund infrastructure for asset managers, prime brokers, and auditors." />
      </Head>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden text-center"
        style={{ padding: '96px 48px 88px', background: 'linear-gradient(180deg,#fff 0%,#f5f5f7 100%)' }}
      >
        {/* Animated background orbs */}
        <div
          className="absolute rounded-full pointer-events-none animate-drift-a"
          style={{ width: 500, height: 500, top: -200, left: -100, background: 'radial-gradient(circle,#c7d2fe,transparent)', filter: 'blur(60px)', opacity: 0.35 }}
        />
        <div
          className="absolute rounded-full pointer-events-none animate-drift-b"
          style={{ width: 400, height: 400, top: -100, right: -80, background: 'radial-gradient(circle,#bbf7d0,transparent)', filter: 'blur(60px)', opacity: 0.35 }}
        />

        {/* Live tag */}
        <div className="relative z-10 inline-flex items-center gap-2 mb-9"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #ddd', backdropFilter: 'blur(8px)', borderRadius: 980, padding: '6px 18px', fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          <LiveDot />
          Live on Ethereum
        </div>

        <h1
          className="relative z-10 font-extrabold text-[#1d1d1f] animate-fade-up"
          style={{ fontSize: 58, letterSpacing: -2, lineHeight: 1.02, marginBottom: 24 }}
        >
          Institutional OTC<br />
          <span style={{ color: '#86868b' }}>settlement, reimagined.</span>
        </h1>

        <p
          className="relative z-10 mx-auto animate-fade-up"
          style={{ fontSize: 19, color: '#86868b', maxWidth: 540, lineHeight: 1.65, marginBottom: 44, animationDelay: '0.1s' }}
        >
          Compliant tokenized fund infrastructure for asset managers, prime brokers, and auditors — on-chain and audit-ready.
        </p>

        <div className="relative z-10 flex gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <button
            className="font-semibold text-white text-[16px] transition-transform hover:-translate-y-0.5"
            style={{ padding: '15px 30px', borderRadius: 980, background: '#1d1d1f', border: 'none', cursor: 'pointer' }}
          >
            Request Access
          </button>
          <button
            className="font-semibold text-[#1d1d1f] text-[16px] transition-colors"
            style={{ padding: '15px 30px', borderRadius: 980, background: 'transparent', border: '1.5px solid #ccc', cursor: 'pointer' }}
          >
            Watch Demo
          </button>
        </div>
      </section>

      {/* ── Metrics Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#f0f0f0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        {METRICS.map((m, i) => (
          <div key={m.label} className="relative bg-white" style={{ padding: '28px 32px' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: '#86868b' }}>{m.label}</p>
            <p className="font-bold text-[#1d1d1f] mt-2 animate-count-up" style={{ fontSize: 30, letterSpacing: -0.6, fontVariantNumeric: 'tabular-nums', animationDelay: `${i * 0.15}s` }}>
              {m.value}
            </p>
            <p className="text-[13px] mt-1.5" style={{ color: m.up ? '#34c759' : '#86868b' }}>{m.delta}</p>
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
              <Sparkline points={m.sparkPoints} color={m.up ? '#34c759' : '#86868b'} delay={m.delay} />
            </div>
          </div>
        ))}

        {/* Risk Status cell */}
        <div className="relative bg-white" style={{ padding: '28px 32px' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: '#86868b' }}>Risk Status</p>
          <div className="flex items-center gap-2.5 mt-2" style={{ fontSize: 18, color: '#34c759', fontWeight: 700 }}>
            <LiveDot size={10} />
            Low Risk
          </div>
          <p className="text-[13px] mt-1.5" style={{ color: '#86868b' }}>All systems nominal</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ background: '#f5f5f7', padding: '64px 48px 72px' }}>

        {/* Section: Performance */}
        <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-6" style={{ color: '#c0c0c8' }}>Performance</p>
        <NavChart />

        {/* Section: Portals */}
        <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-6" style={{ color: '#c0c0c8' }}>Portals</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          <InvestorHeroCard />
          <ManagerCard activeTradeCount={12} />
          <AuditorCard />
          <OTCFeed trades={MOCK_TRADES} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Start dev server and verify home page loads**

```bash
cd apps/web && pnpm dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: `200`

Open `http://localhost:3000` in a browser. Verify:
- Hero section visible with animated orbs and live dot
- Metrics bar shows 4 cells with sparklines
- Dark NAV chart visible with animated bars
- Investor hero card (dark, 2-col), Manager card (dark), Auditor card (white)
- OTC feed panel (dark, 2-col) with 3 trade rows

Kill dev server: `pkill -f "next dev"`

- [ ] **Step 3: Commit**

```bash
git add apps/web/pages/index.tsx
git commit -m "feat: redesign home page with hero, metrics bar, NAV chart, and portal grid"
```

---

## Task 7: Investor Portal Page

**Files:**
- Modify: `apps/web/pages/investor.tsx`

- [ ] **Step 1: Add shared page wrapper styles to the top of investor.tsx**

Read the current file first, then wrap the existing content in a styled shell. The goal is to apply the nav spacing and card styling without breaking existing functionality.

Add this import at the top of the file (after existing imports):
```tsx
import LiveDot from "@/components/LiveDot";
```

Wrap the return value's outermost div with:
```tsx
<div style={{ background: '#f5f5f7', minHeight: '100vh', padding: '48px' }}>
  <div style={{ maxWidth: 900, margin: '0 auto' }}>
    {/* Page header */}
    <div style={{ marginBottom: 40 }}>
      <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-3" style={{ color: '#c0c0c8' }}>Investor Portal</p>
      <h1 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 40, letterSpacing: -1.2, lineHeight: 1.1 }}>
        Your fund position.
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed" style={{ color: '#86868b', maxWidth: 480 }}>
        Subscribe to the fund, redeem tokens, and monitor your real-time balance.
      </p>
    </div>
    {/* Existing page content goes here */}
    ...existing content...
  </div>
</div>
```

Ensure all existing cards use `borderRadius: 22` and `background: '#fff'` with `border: '1px solid #e5e5ea'`.

Replace any raw wei display (e.g. `Balance (wei)`) label with `Balance (OTCF)` and divide the value by `1e18` before display:
```tsx
// Before:
<Field label="Balance (wei)" value={balance} />

// After:
<Field label="Balance (OTCF)" value={balance ? (BigInt(balance) / BigInt(1e18)).toString() : '—'} />
```

- [ ] **Step 2: Verify investor page renders**

```bash
cd apps/web && pnpm dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/investor
```
Expected: `200`. Open in browser, verify page header visible and no raw wei label.

Kill dev server: `pkill -f "next dev"`

- [ ] **Step 3: Commit**

```bash
git add apps/web/pages/investor.tsx
git commit -m "feat: apply design system to investor portal, fix wei display"
```

---

## Task 8: Manager Portal Page

**Files:**
- Modify: `apps/web/pages/manager.tsx`

- [ ] **Step 1: Apply page wrapper and fix NAV display**

Apply the same page wrapper pattern from Task 7 with the heading "Fund Manager Console" and subheading "Post NAV on-chain and monitor fund performance."

Fix the NAV display — the raw integer stored on-chain is scaled ×1e6. Convert before rendering:
```tsx
// After fetching latest NAV (e.g. latest.nav is a string like "3024180000"):
const navDisplay = latest?.nav
  ? `$${(Number(latest.nav) / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : '—';

const asOfDisplay = latest?.asOf
  ? new Date(Number(latest.asOf) * 1000).toLocaleString()
  : '—';
```

Add a 30-second polling interval so the page reflects automated NAV updates:
```tsx
useEffect(() => {
  load();
  const interval = setInterval(load, 30_000);
  return () => clearInterval(interval);
}, []);
```

- [ ] **Step 2: Verify manager page renders**

```bash
cd apps/web && pnpm dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/manager
```
Expected: `200`.

Kill dev server: `pkill -f "next dev"`

- [ ] **Step 3: Commit**

```bash
git add apps/web/pages/manager.tsx
git commit -m "feat: apply design system to manager console, fix NAV display, add 30s polling"
```

---

## Task 9: Auditor Page

**Files:**
- Modify: `apps/web/pages/auditor.tsx`

- [ ] **Step 1: Apply page wrapper**

Apply the same page wrapper with heading "Audit Export" and subheading "Download an immutable on-chain record of all NAV posts, subscriptions, and redemptions."

Ensure the export button uses the primary button style:
```tsx
<button
  onClick={doExport}
  disabled={busy}
  className="font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
  style={{ padding: '13px 26px', borderRadius: 980, background: '#1d1d1f', border: 'none', cursor: busy ? 'default' : 'pointer', fontSize: 15 }}
>
  {busy ? 'Exporting…' : 'Download CSV'}
</button>
```

- [ ] **Step 2: Verify and commit**

```bash
cd apps/web && pnpm dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auditor
pkill -f "next dev"
git add apps/web/pages/auditor.tsx
git commit -m "feat: apply design system to auditor page"
```

---

## Task 10: OTC and Market Pages

**Files:**
- Modify: `apps/web/pages/otc.tsx`
- Modify: `apps/web/pages/market.tsx`

- [ ] **Step 1: Apply page wrapper to otc.tsx**

Apply the page wrapper with heading "OTC Trade Settlement" and subheading "Propose and settle bilateral fund token trades between counterparties."

Remove the SANDBOX banner entirely.

Remove the hardcoded "throwaway test chain" language from any visible copy.

- [ ] **Step 2: Apply page wrapper to market.tsx**

Apply the page wrapper with heading "Market" and appropriate subheading matching the existing page purpose.

- [ ] **Step 3: Verify both pages and commit**

```bash
cd apps/web && pnpm dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/otc
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/market
pkill -f "next dev"
git add apps/web/pages/otc.tsx apps/web/pages/market.tsx
git commit -m "feat: apply design system to OTC and market pages, remove sandbox language"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Start full dev server and check all routes**

```bash
cd apps/web && pnpm dev &
sleep 8
for path in "/" "/investor" "/manager" "/auditor" "/otc" "/market"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path → $code"
done
```
Expected: All routes return `200`.

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd apps/web && pnpm exec tsc --noEmit 2>&1 | head -30
```
Expected: No errors.

- [ ] **Step 3: Kill dev server and run CI checks**

```bash
pkill -f "next dev"
cd ../.. && pnpm --filter web exec tsc --noEmit
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete UI redesign — Archon design system applied across all pages"
```
