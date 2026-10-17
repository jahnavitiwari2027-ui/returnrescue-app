# Build status — 17 October 2026

## Done and verified in the build environment

| Check | How | Result |
|---|---|---|
| Production build | `npm run build` (TypeScript + Vite) | ✅ passes |
| Type checks (app + functions) | `npm run typecheck` | ✅ passes |
| Calculator & insights logic | `npm test` — net values per route, grade/hygiene eligibility, missing estimates, least-loss case, provisional mode, dashboard aggregates | ✅ 8 tests |
| Gemini integration | `npm test` — request format (images, JSON schema), structured-output parsing, schema-rejection fallback, quota / auth / safety-block error mapping | ✅ 4 tests |
| Rate card, tax & grade rules | `npm test` (tests/rates.test.ts) — lines add up to each value; every line is classified (your value / published / assumption), published lines cite a dated source, task-time lines are never called published; business overrides labelled as such; GST slabs; registered vs unregistered GST treatment; labour on-costs; each cost counted once; bulk liquidation without per-order fees; unrepairable damage excluded; negative recycling shown; quotes and own prices never overwritten; decided/completed returns never repriced; rate changes update only undecided returns; malformed overrides rejected; grade guardrails | ✅ 28 tests |
| Dodo webhook verification | `npm test` — valid signature accepted; tampered body, missing signature and replayed (stale) timestamp rejected | ✅ 4 tests |
| Database schema | Ran `supabase/schema.sql` twice (idempotent) in an embedded Postgres with Supabase auth/storage stubs: free-plan limit at 15, Pro bypass, users can’t see others’ rows, can’t insert for another user, can’t grant themselves Pro, can’t change a row’s owner | ✅ |
| End-to-end browser journey (Chromium, desktop) | `npm run e2e`: landing → demo → validation errors → add return with photo upload → demo asks for an account instead of showing an AI result (none is ever fabricated) → manual grade B → restock blocked, refurbish recommended at ₹1,620 → override requires reason → decision saved → survives reload → realized proceeds → search/filter → CSV export contents → edit → insights → delete | ✅ |
| Rate card in the browser | `e2e/rates.spec.ts`: sample return shows labelled lines with source links; changing a rate and **Update them** re-prices undecided returns while a saved decision stays at ₹1,373 and says its values are frozen; reset restores defaults (desktop + mobile) | ✅ |
| Homepage | `e2e/demo-journey.spec.ts`: all sections present; hero example switches products, expands an option and shows assumption labels; grade picker works | ✅ |
| Live camera capture | `e2e/camera.spec.ts` with a simulated camera: several shots in a row, saved with the return (desktop + mobile) | ✅ |
| Mobile layout (Pixel 7 viewport) | landing, dashboard with bottom tab bar, return detail | ✅ |
| API endpoints without credentials | `/api/status`, `/api/inspect`, `/api/create-checkout`, `/api/dodo-webhook` return clear “not configured” errors | ✅ |

## Needs your accounts — cannot be verified from the build environment

The build environment can reach GitHub but not Netlify, Supabase, Google AI or Dodo, and has no API keys. These are implemented and wired, and must be verified after setup (checklist in `SETUP.md` §8):

1. Genuine AI inspection & AI summary (needs `GEMINI_API_KEY`; the Gemini request/response handling is unit-tested with a stubbed network, but a live call could not be made from the build environment).
2. Sign-up / sign-in, cloud persistence, photo storage (needs Supabase project + schema).
3. Dodo test checkout → webhook → Pro unlock; customer portal (needs Dodo test account, product, webhook).
4. Netlify deploy, Netlify Forms contact submissions, Netlify Blobs demo rate limit.
5. Custom domain + HTTPS.

## Known limitations / open items

- Payments are in **test mode** until Dodo merchant verification is approved.
- Free AI trial and demo limits are counters, not hard quotas against concurrent bursts (acceptable as cost guard-rails).
- Account deletion is by request (contact form), not self-service.
- Sample products use illustrations, so AI inspection on them will usually return *Manual review* — by design.
- Contact email is optional (`VITE_CONTACT_EMAIL`); without it the site uses the Netlify contact form.
