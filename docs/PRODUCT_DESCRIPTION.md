# ReturnRescue — product description (for submission)

**Tagline:** Every return deserves a second chance.

**Live product:** https://returnrescue.dpdns.org · **Repository:** https://github.com/jahnavitiwari2027-ui/returnrescue-app

## What it is

ReturnRescue is an AI-powered returns-recovery SaaS for small and mid-sized Indian D2C brands selling apparel, footwear and accessories. Returned products often still have value, but teams lack a consistent way to grade them and to compare what each item is worth if restocked, refurbished, liquidated or recycled. ReturnRescue combines AI photo inspection with a transparent financial decision engine so every return gets a consistent grade and an economically sound next step.

## Working features

1. **Marketing site** — landing page with problem, 4-step workflow, live feature previews, use cases, pricing (14-day free trial with no card, then Pro ₹999 per month), a “No black boxes” methodology & trust section, FAQ, working contact form, privacy policy, terms and refund/cancellation policy.
2. **Demo workspace** — 10 clearly labelled fictional returns, no sign-up, stored only in the visitor’s browser and separate from real accounts.
3. **Accounts** — Continue with Google, or email sign-up/sign-in/password reset; each business’s data is isolated with database row-level security and private photo storage.
4. **Add / edit returns** — only a photo (upload or live camera), name, category and price are required; SKU, reason, notes and per-route overrides are optional, with validation. **Where it will sell:** pick Amazon.in, Flipkart, Meesho or your own website; GST (0/5/18% by category and price), commission, closing/fixed fees and delivery are filled in automatically, each with an override and a “save as default”.
5. **AI product inspection (Google Gemini vision, server-side)** — runs automatically after saving; lists each visible defect with its severity, proposes a grade A/B/C/Manual review with rationale, confidence, limitations and physical checks. The AI never produces a price. Deterministic rule checks then verify the grade against the defects (any visible defect rules out A; a major or unrepairable one means C; odour, unusable photos or a possible mismatch go to manual review) and record any change. The user accepts or corrects the grade. Photos of something outside apparel, footwear and accessories (e.g. medicine) are refused with no grade or value, and an item that doesn’t match its category goes to manual review; each AI result links to **Contact support** with the return reference filled in. If the AI is unavailable, the app shows an error rather than inventing a result.
6. **Sourced rate card** — every rupee estimate comes from an editable rate card, and every line is labelled as one of three kinds: **your value** (a price, rate or quote the business entered), **published rate** (linked to its source with its effective or publication date — Amazon.in referral, closing and weight-handling fees, Flipkart and Meesho fees and shipping; the 5%/18% GST slabs for clothing and footwear; courier and payment-gateway rates; Delhi minimum wage plus employer PF/ESI; real cleaner, cobbler and tailor price lists; surplus-stock and scrap rates) or **assumption** (no public source; labelled and replaceable). GST-registered sellers have the GST inside the price deducted and GST on fees treated as claimable input tax credit; unregistered sellers bear GST on fees as a cost. **From your own results:** after five completed sales on a route, the median amount actually received is offered as a suggested rate. Saved decisions keep the values they were made with when rates change; undecided returns can be re-priced in one step.
7. **Recovery value calculator** — deterministic net value for restock, refurbish, liquidate (bulk sale: commission and freight, no per-order fees) and recycle; grade and hygiene eligibility rules; sunk costs excluded to avoid double counting; recommendation with explanation and line-by-line breakdown; manual override with reason; rate-card values, the user's own prices, third-party quotes and realized proceeds kept separate.
8. **Next steps & partners** — after a decision, a pathway for that route: checklist, “find nearby” map searches, a Delhi NCR directory of 13 real, independent businesses (repair and cleaning, liquidation, donation and recycling) matched to the route and product type — each with address, services and public contact details taken from its own website — plus the business’s own saved partners with one-tap call, WhatsApp and email.
9. **Inventory** — search, filters, sorting, edit, delete, CSV export; changes persist.
10. **Dashboard & insights** — totals, pipeline status, estimated recoverable value, routes chosen, weekly intake, top categories, frequent defects, best-value routes, unprocessed items, plus an AI-written briefing grounded only in the computed figures.
11. **Subscriptions (Dodo Payments)** — server-side hosted checkout, signature-verified idempotent webhooks, entitlements stored server-side, Pro features unlocked only by verified payment, failure/cancel handling and a customer portal to manage or cancel.

## What evaluators should test

Open the site → explore **Try the live demo** → **Start 14-day free trial** (Continue with Google, or any email) → add a return with a real product photo → choose where it will sell → AI inspection runs automatically → try a non-fashion photo (e.g. a medicine strip) to see it refused → accept or correct the grade → open **All options and the maths** to see every rupee traced to its source → compare routes and save a decision → change a rate under **Your rates** and update open returns → refresh to confirm persistence → search, edit and export the inventory → view insights. To test payments: **Plan & billing → Upgrade** → Dodo test card **4242 4242 4242 4242**, expiry **06/32**, CVV **123**.

## Access instructions

No credentials needed: the demo is public, and anyone can start the free trial in seconds (AI results require an account). Payments run in Dodo test mode — no real charges. See `docs/EVALUATOR_GUIDE.md` in the repository for a step-by-step test script.

## Technology

React, TypeScript, Vite, Tailwind CSS · Netlify (hosting + Functions) · Supabase (Auth, Postgres with RLS, Storage) · Google Gemini (vision; Anthropic Claude supported as an alternative) · Dodo Payments · Vitest and Playwright tests.
