# UI Redesign — Design Spec
> Date: 2026-06-02
> Project: otc-prototype_final
> Status: Approved for implementation

---

## 1. Design Direction

**Theme:** B-Editorial base with A-style dark data panels.

- White/light Apple-style shell (nav, hero, section wrappers)
- Dark data panels (`#0d1117`) embedded for the NAV chart, Investor hero card, and OTC activity feed
- B-style editorial cards (bold numbers as visual centrepiece) for Manager Console and Auditor View
- No emoji anywhere — SVG icons only
- No references to "prototype", "simulate", or "sandbox" in visible copy

---

## 2. Global Design Tokens

| Token | Value |
|---|---|
| Background (page) | `#f0f0f5` |
| Background (site) | `#ffffff` |
| Background (content wrap) | `#f5f5f7` |
| Background (dark panel) | `#0d1117` |
| Background (dark card) | `#1d1d1f` |
| Text primary | `#1d1d1f` |
| Text secondary | `#86868b` |
| Text muted | `#445` / `#556` |
| Accent green | `#34c759` |
| Accent teal (chart) | `#00c9a7` |
| Accent indigo (investor) | `#6366f1` / `#a5b4fc` |
| Accent amber (pending) | `#ff9f0a` |
| Border light | `#e5e5ea` |
| Border subtle | `#f0f0f0` |
| Border radius (cards) | `22px` |
| Border radius (pills) | `980px` |
| Font | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif` |
| Monospace font | `'SF Mono', ui-monospace, monospace` |

---

## 3. Layout Structure

```
┌─ Nav (sticky, 60px, blur backdrop) ────────────────────────────┐
├─ Hero (96px/88px padding, gradient fade to #f5f5f7) ───────────┤
├─ Metrics Bar (4 columns, 1px dividers) ────────────────────────┤
├─ Content Wrap (64px top / 72px bottom, 48px horizontal) ───────┤
│  ├─ Section Label: "Performance"                               │
│  ├─ NAV Chart Panel (dark, full width, 32px padding)           │
│  ├─ Section Label: "Portals"                                   │
│  └─ Portal Grid (3 cols, 22px gap)                             │
│     ├─ Investor Hero (dark, 2-col span)  │ Manager (dark 1-col)│
│     ├─ Auditor (light, 1-col)            │ OTC Feed (dark 2-col)│
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Components

### 4.1 Nav
- Height: `60px`, padding `0 48px`
- Logo: `17px`, weight `700`, `letter-spacing: -0.4px`
- Links: `14px`, `32px` gap, colour `#86868b`, active `#1d1d1f`
- CTA button: `9px/20px` padding, `border-radius: 980px`, bg `#1d1d1f`
- Sticky, `backdrop-filter: blur(16px)`, `z-index: 20`

### 4.2 Hero
- Padding: `96px 48px 88px`
- Two animated background orbs (indigo + green, `blur(60px)`, CSS keyframe `driftA`/`driftB`)
- Live tag with pulsing ring animation (`livePulse` keyframe, 2s infinite)
- `h1`: `58px`, weight `800`, `letter-spacing: -2px`, secondary colour `#86868b`
- Body copy: `19px`, max-width `540px`, `line-height: 1.65`
- CTA row: Primary pill (black), Secondary pill (outline), `gap: 16px`
- Entrance animation: `fadeUp` (opacity 0→1, translateY 18px→0), staggered 100ms per element

### 4.3 Metrics Bar
- 4 equal columns, `1px` gap on `#f0f0f0` background
- Cell padding: `28px 32px`
- Value: `30px`, weight `700`, `font-variant-numeric: tabular-nums`
- Sparkline: SVG `64×32`, animated draw (`stroke-dasharray/dashoffset` → 0), staggered 150ms
- Delta: `13px`, green `#34c759` for positive, `#86868b` for neutral
- Risk Status: live dot with `livePulse` ring, colour `#34c759`

### 4.4 NAV Chart Panel
- Background `#0d1117`, `border-radius: 22px`, padding `32px`, `margin-bottom: 40px`
- Header: title `16px/700`, subtitle `12px/#445`, tab pills (`7D` / `30D` / `All`)
- Active tab: `background: #1a2332`, colour `#00c9a7`
- Bars: `height: 110px`, `gap: 7px`, `border-radius: 5px 5px 0 0`
- Bar fill: `linear-gradient(180deg, #00c9a7, rgba(0,201,167,0.10))`
- Bar animation: `growBar` (scaleY 0→1), staggered 50ms per bar, `transform-origin: bottom`
- Bar hover: brighter teal, pointer cursor
- X-axis labels: `9px`, colour `#334`

### 4.5 Investor Hero Card (A-style, 2-col span)
- Background: `linear-gradient(135deg, #1a1a2e, #0d1117)`
- Radial glow overlay: `rgba(99,102,241,0.3)` top-right, animated `breathe` (opacity 0.7→1.0, 6s)
- Grid texture: `opacity: 0.04`, `28×28px` lines
- Mini line chart (top-right): SVG polygon fill + polyline, animated `drawLine` with 0.5s delay
- Tag pill: `rgba(99,102,241,0.2)` bg, `rgba(99,102,241,0.4)` border, colour `#a5b4fc`
- `h3`: `26px`, weight `800`, colour `#fff`
- Body: `14px`, colour `#556`, max-width `360px`
- Go link: `14px/600`, colour `#a5b4fc`, arrow gap widens on hover (`0.2s` transition)
- Card hover: `translateY(-4px)` + shadow

### 4.6 Manager Card (B-editorial, 1-col)
- Background: `#1d1d1f`
- Rotating conic glow ring (top-right, `spin` 20s linear infinite)
- Label: `11px/600`, colour `#555`, uppercase
- Number: `56px`, weight `800`, `letter-spacing: -2px`, colour `#fff`
- Body: `13px`, colour `#555`
- Go link: `14px/600`, colour `#fff`, arrow gap on hover
- Card hover: `translateY(-4px)` + shadow

### 4.7 Auditor Card (B-editorial, 1-col)
- Background: `#fff`, border `1px solid #e5e5ea`
- Label: `11px/600`, colour `#86868b`, uppercase
- Headline: `32px`, weight `800`, `letter-spacing: -1px`, colour `#1d1d1f`, `line-height: 1.12`
- Body: `13px`, colour `#86868b`
- Go link: `14px/600`, colour `#1d1d1f`, arrow gap on hover
- Card hover: `translateY(-4px)` + `box-shadow: 0 16px 40px rgba(0,0,0,0.08)`

### 4.8 OTC Activity Feed (A-style, 2-col span)
- Background: `#0d1117`, padding `32px`
- Header: title `16px/700/#fff`, subtitle `12px/#445`
- Live badge: teal pill with animated pulse dot, text "Live"
- Trade rows: padding `16px 0`, `border-bottom: 1px solid rgba(255,255,255,0.05)`, `fadeUp` staggered 100ms
- Status dot: `9px` circle — green `#34c759` (settled), amber `#ff9f0a` (pending)
- Pending dot: `pendingPulse` animation (opacity 1→0.4→1, 2s)
- Address: `11px`, monospace, colour `#445`
- Amount: `14px/700/#fff`, `font-variant-numeric: tabular-nums`
- NAV sub-label: `10px/#445`
- Footer link: `13px/600`, colour `#00c9a7`, arrow gap on hover

---

## 5. Animations Summary

| Animation | Element | Keyframe | Duration | Trigger |
|---|---|---|---|---|
| `driftA` / `driftB` | Hero orbs | translate + scale | 14s / 18s | On load, infinite alternate |
| `livePulse` | Live dot ring | scale + opacity | 2s | On load, infinite |
| `fadeUp` | Hero h1, p, actions | translateY + opacity | 0.8s | On load, staggered |
| `countUp` | Metric values | translateY + opacity | 1.2s | On load |
| `drawLine` | Sparklines | stroke-dashoffset | 1.5s | On load, staggered |
| `growBar` | Chart bars | scaleY | 0.8s | On load, 50ms stagger |
| `drawLine` | Investor mini chart | stroke-dashoffset | 1.8s | On load, 0.5s delay |
| `breathe` | Investor glow | opacity | 6s | On load, infinite alternate |
| `spin` | Manager glow ring | rotate | 20s | On load, infinite |
| `pendingPulse` | Pending trade dot | opacity | 2s | On load, infinite |
| Hover lift | All cards | translateY(-4px) | 0.3s | On hover |
| Arrow nudge | All go-links | gap widen | 0.2s | On hover |

---

## 6. Pages in Scope

The redesign applies to all web pages. The home page (`index.tsx`) is the reference implementation. Other pages follow the same nav, spacing, and token system:

- `/` — Home (full treatment as designed)
- `/investor` — Investor Portal
- `/manager` — Fund Manager Console
- `/auditor` — Auditor View
- `/otc` — OTC Trade Simulator
- `/market` — Market

Each portal page gets the same nav and global spacing. Internal page content adapts the card/panel components to page-specific data.

---

## 7. What Is Not Changing

- Routing and Next.js page structure (pages directory resolution to be fixed separately)
- API endpoints and data contracts
- Tailwind config (will be extended, not replaced)
- Smart contract layer

---

## 8. Copy Changes

| Location | Before | After |
|---|---|---|
| Home `h1` | OTC Fund Prototype | Institutional OTC settlement, reimagined. |
| Home subtitle | Choose a portal to simulate the fund workflow | Compliant tokenized fund infrastructure for asset managers… |
| Hero tag | — | Live on Ethereum |
| CTA | Open → | Request Access / Watch Demo |
| OTC card | Run live trade scenarios on-chain against a throwaway test chain | (removed, replaced by OTC feed panel) |
