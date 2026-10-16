# ReturnRescue — product description (for submission)

**Tagline:** Every return deserves a second chance.

**Live product:** https://<custom-domain> · **Repository:** https://github.com/<username>/returnrescue-app

## What it is

ReturnRescue is an AI-powered returns-recovery SaaS for small and mid-sized Indian D2C brands selling apparel, footwear and accessories. Returned products often still have value, but teams lack a consistent way to grade them and to compare what each item is worth if restocked, refurbished, liquidated or recycled. ReturnRescue combines AI photo inspection with a transparent financial decision engine so every return gets a consistent grade and an economically sound next step.

## Working features

1. **Marketing site** — landing page with problem, 4-step workflow, live feature previews, use cases, pricing (14-day free trial with no card, then Pro ₹999 per month), a “No black boxes” methodology & trust section, FAQ, working contact form, privacy policy, terms and refund/cancellation policy.
2. **Demo workspace** — 10 clearly labelled fictional returns, no sign-up, stored only in the visitor’s browser and separate from real accounts.
3. **Accounts** — email sign-up/sign-in/password reset; each business’s data is isolated with database row-level security and private photo storage.
4. **Add / edit returns** — only a photo, name, category and price are required; SKU, reason, notes and per-route estimates are optional, with validation.
5. **AI product inspection (Google Gemini vision, server-side)** — runs automatically after saving; observable defects, proposed grade A/B/C/Manual review, rationale, confidence, limitations, suggested physical checks, potentially eligible routes and AI-suggested recovery values (clearly labelled and editable). The user accepts or corrects the grade. If the AI is unavailable, the app shows an error rather than inventing a result.
6. **Recovery value calculator** — deterministic net value for restock, refurbish, liquidate and recycle; grade and hygiene eligibility rules; sunk costs excluded to avoid double counting; recommendation with explanation and line-by-line breakdown; manual override with reason; estimates, third-party quotes and realized proceeds kept separate.
7. **Next steps & partners** — after a decision, a pathway for that route: checklist, “find nearby” map searches, checked Indian channels (resale, liquidation, donation, recycling) and the business’s own saved partners with one-tap contact.
8. **Inventory** — search, filters, sorting, edit, delete, CSV export; changes persist.
9. **Dashboard & insights** — totals, pipeline status, estimated recoverable value, routes chosen, weekly intake, top categories, frequent defects, best-value routes, unprocessed items, plus an AI-written briefing grounded only in the computed figures.
10. **Subscriptions (Dodo Payments)** — server-side hosted checkout, signature-verified idempotent webhooks, entitlements stored server-side, Pro features unlocked only by verified payment, failure/cancel handling and a customer portal to manage or cancel.

## What evaluators should test

Open the site → explore **Try the live demo** → **Start 14-day free trial** (any email) → add a return with a real product photo → AI inspection runs automatically → accept or correct the grade → compare routes and save a decision → refresh to confirm persistence → search, edit and export the inventory → view insights. To test payments: **Plan & billing → Upgrade** → Dodo test card **4242 4242 4242 4242**, expiry **06/32**, CVV **123**.

## Access instructions

No credentials needed: the demo is public, and anyone can start the free trial in seconds (AI results require an account). Payments run in Dodo test mode — no real charges. See `docs/EVALUATOR_GUIDE.md` in the repository for a step-by-step test script.

## Technology

React, TypeScript, Vite, Tailwind CSS · Netlify (hosting + Functions) · Supabase (Auth, Postgres with RLS, Storage) · Google Gemini (vision; Anthropic Claude supported as an alternative) · Dodo Payments · Vitest and Playwright tests.
