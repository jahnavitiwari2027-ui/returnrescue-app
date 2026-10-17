# ReturnRescue

**Every return deserves a second chance.**

ReturnRescue is an AI-assisted returns-recovery SaaS for Indian D2C apparel, footwear and accessories brands. A team logs a returned product with photos and cost estimates; an image-capable AI model inspects the photos and proposes a condition grade; a deterministic calculator compares the net value of restocking, refurbishing, liquidating and recycling; the team records a decision and, later, the realized proceeds. Dashboards and insights are computed from the stored records.

> Built for the Masters’ Union *AI in Business* assignment (PGP TBM). Monetized with a ₹999/month Pro subscription through Dodo Payments.

---

## What works

| Area | What it does |
|---|---|
| **Landing page** | Hero, problem, 4-step how-it-works, feature previews driven by the real calculator, benefits & use cases, demo entry, pricing, FAQ, contact form (Netlify Forms), privacy / terms / refund pages, Log in and Launch app buttons. |
| **Demo workspace** (`/demo`) | 10 clearly labelled fictional returns, stored only in the visitor’s browser and fully separate from real accounts. Browse, add, grade manually, calculate and export sample data. AI results require a free account. Resettable. |
| **Accounts** (`/app`) | Continue with Google, or email + password sign-up / sign-in / reset (Supabase Auth). Each workspace is isolated by Postgres Row Level Security; photos live in a private Storage bucket served via short-lived signed URLs. |
| **Dashboard** | Totals, awaiting inspection, inspected, estimated recoverable value, realized proceeds, pipeline status, routes selected, weekly intake, next-up list, top findings — all calculated from stored records. |
| **Add / edit a return** | Name, SKU, category, original price, reason, condition notes, up to 4 photos, sunk return shipping, and per-route estimates (resale, refurb resale & cost, channel fee %, handling, liquidation price & fee, recycling value & cost) with “estimate vs third-party quote” labels. Inline validation. |
| **AI inspection** | Photos + notes are sent server-side to a vision AI model — Google Gemini (free tier) by default, or Anthropic Claude if configured. Returns observable defects, proposed grade (A / B / C / Manual review), rationale, confidence, limitations, recommended physical checks and potentially eligible routes. The user accepts or corrects the grade (correction requires a reason). If the AI is unavailable the request fails visibly — nothing is fabricated. |
| **Recovery calculator** | Deterministic per-route net = proceeds − fees − costs; sunk return shipping excluded; grade and hygiene rules decide eligibility; highest eligible net is recommended with a plain-English explanation and an expandable line-by-line breakdown. Manual override with mandatory reason; decision snapshot recorded; realized proceeds recorded separately from estimates. |
| **Inventory** | Thumbnails, SKU, grade, route, est. net, status; search; filters by status / grade / category / route; sort; edit; delete; CSV export (server-side and Pro-gated for accounts). |
| **Insights** | Top categories, return reasons, grade mix, most frequent defects, best-value routes, overrides, unprocessed items — plus an optional AI-written briefing grounded only in those computed figures. |
| **Next steps & partners** | After a decision, a route-specific pathway: checklist, Google Maps “find nearby” links (no API, no scraping), hand-checked Indian channels, and the business’s own saved partners with one-tap Call / WhatsApp / Email. |
| **Billing** | Dodo Payments hosted checkout created server-side; Standard-Webhooks signature verification; idempotent event log; out-of-order protection; entitlement written only by the webhook; success page waits for the verified entitlement (visiting the return URL never unlocks anything); failure/cancel handling; Dodo customer portal for manage/cancel. |

### Plans

| | Demo (no sign-up) | 14-day free trial (no card) | Pro (₹999 / month, configurable) |
|---|---|---|---|
| Sample workspace, calculator, manual grading | ✓ | ✓ | ✓ |
| AI photo inspection (defects + grade) | — (sign in required) | up to 100 | fair use 300 / 30 days |
| Returns stored | in browser only | unlimited | unlimited |
| AI insight summary, CSV export | — | ✓ | ✓ |

After the trial without Pro, records stay; manual grading and the calculator keep working (up to 15 returns); AI and exports need Pro. The trial length is `TRIAL_DAYS` (server) / `VITE_TRIAL_DAYS` (display) — keep the 14-day value in `supabase/schema.sql` in sync if you change it.

---|---|---|
| Demo workspace | ✓ | ✓ |
| Own workspace | up to 15 returns (enforced by a DB trigger) | unlimited |
| AI inspection | 3 trial inspections | fair use 300 / 30 days |
| AI insight summary | — | ✓ |
| CSV export | demo only | ✓ |

---

## Architecture

```
Browser (React + TypeScript + Vite + Tailwind)
 ├─ /            landing + legal pages
 ├─ /demo/*      demo workspace → localStorage repository
 └─ /app/*       account workspace → Supabase (Auth, Postgres + RLS, private Storage)
        │
        └─ /api/*  Netlify Functions (server-only secrets)
              inspect            → Gemini / Claude vision, usage metering, demo rate limit (Netlify Blobs)
              insights-summary   → Claude, grounded on stats recomputed server-side
              create-checkout    → Dodo Payments checkout session
              dodo-webhook       → signature-verified, idempotent entitlement updates
              customer-portal    → Dodo customer portal link
              export-csv         → Pro-gated export
              status             → which integrations are configured (no secrets)
```

Key files:

- `src/lib/recovery.ts` — the decision engine (pure, unit-tested)
- `src/lib/insights.ts` — all dashboard / insight aggregations (pure, unit-tested, also used server-side)
- `netlify/functions/*.mts` — server endpoints
- `supabase/schema.sql` — tables, RLS policies, free-plan limit trigger, storage bucket & policies
- `src/data/demoSeed.ts` — the fictional demo records

## Run locally

```bash
npm install
cp .env.example .env      # fill in what you have; everything is optional for the demo
npm run dev:full          # app + /api functions on http://localhost:5173
npm test                  # unit tests (calculator, insights, webhook signatures)
npm run typecheck
npm run build
npx playwright install chromium && npm run e2e   # browser journey test against dev:full
```

Without any keys, the landing page and the full demo workspace work; the AI endpoints return a clear “not configured” error and accounts/payments show setup notices.

## Deploy

Step-by-step instructions (Supabase, Google AI Studio, Dodo Payments, Netlify, custom domain, webhooks): **[docs/SETUP.md](docs/SETUP.md)**.

## Security notes

- No secret is ever bundled into the browser: only `VITE_*` variables (Supabase URL, anon key, display price) reach the client.
- Service-role, AI provider and Dodo keys are read only inside Netlify Functions.
- Every table has RLS. Users can read but never write their entitlement; usage counters are server-written.
- Return ownership cannot be changed by an update (trigger), and photo paths are namespaced by user id with matching Storage policies.
- Webhooks are verified on the raw body (HMAC-SHA256, timestamp tolerance) before any processing and deduplicated by `webhook-id`.
- CSP, HSTS, frame-deny and other headers are set in `netlify.toml`. CSV export neutralises spreadsheet formula injection.

## Documentation

- [docs/SETUP.md](docs/SETUP.md) — deployment and credentials
- [docs/EVALUATOR_GUIDE.md](docs/EVALUATOR_GUIDE.md) — what to test and how
- [docs/PRODUCT_DESCRIPTION.md](docs/PRODUCT_DESCRIPTION.md) — submission-ready description
- [docs/STATUS.md](docs/STATUS.md) — features, tests run, open items
