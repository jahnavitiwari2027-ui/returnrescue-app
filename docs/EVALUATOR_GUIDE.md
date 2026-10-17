# Evaluator guide

**Live site:** `https://<custom-domain>` · **Source:** `https://github.com/<username>/returnrescue-app`

No setup is needed. Two ways in:

- **Demo workspace — no sign-up.** Click **Try the live demo** (or **Launch app**). Ten fictional sample returns, stored only in your browser. **Reset demo data** in the sidebar restores them.
- **Your own workspace — free account (needed for AI).** Click **Start 14-day free trial**, sign up with any email and a password (8+ characters). No card. The trial includes everything in Pro (up to 100 AI inspections).

All sample products and brands are fictional. The homepage section **“No black boxes”** explains the grading rubric, how values are estimated, the exact formulas and why the product can be trusted. Sample grades in the demo were entered by hand and are labelled “graded by you”; their values come from the default rate card; only results shown under **AI inspection result** come from the AI model.

## Suggested 10-minute test

1. **Landing page** — scroll through: problem, how it works, feature previews (the recovery card is computed live by the same engine as the app), pricing, FAQ, contact form, legal pages in the footer.
2. **Dashboard** — every number is computed from stored records. Change something later and return here to see it update.
3. **Add a return (signed in)** — *Add return* → **Take photo** (live camera) or **Upload**, then product name, category and original price (estimates and SKU are optional) → **Save return**. Use 1–4 clear photos of a real garment or shoe — a phone photo is ideal.
4. **AI inspection** — starts automatically after saving (10–30 s). The result card shows the grade, a one-line summary and the **best option with its estimated value**. Tap **Confirm** to accept the grade and record the decision in one step, or **Change grade** / **Choose another option** (a reason is required). Open **What the AI saw** for defects, checks and limitations.
5. **Next steps** — after confirming, a pathway appears for the chosen route: a tick-off checklist, **Find nearby** (opens Google Maps for repairers, recyclers etc.), checked Indian channels (e.g. Excess2Sell, Goonj), and your own saved partners with Call / WhatsApp / Email buttons. Manage contacts under **Partners**.
6. **All options and the maths** — expand to see each route’s net value and its line-by-line breakdown. Every rupee shows where it came from: e.g. *Zip replacement (tailor) ₹300 · source*, *Marketplace referral fee 12% + 18% GST · source*, or an *assumption* tag. The AI never sets a price — it only reports defects and their severity; the rate card prices them.
7. **Your rates** — the sidebar (or the sliders icon on mobile) opens the rate card with every default, its source link and the list of assumptions. Change one (e.g. *Repaired items resell at* 70% → 60%), save, then **Update them** to re-price undecided returns. **Reset to defaults** restores the published rates.
8. **Persistence** — refresh the page: grade, AI result and decision are still there. Enter the **amount received** to complete the item and see the variance vs estimate.
9. **Inventory** — search (e.g. “sneaker”), **Filters** for grade/status/category/route, sort, edit, delete, **Export CSV**.
10. **Insights** — top categories, defects, best-value routes, unprocessed items; **Generate summary** for the AI briefing (signed in).
11. **Payments (test mode)** — **Plan & billing** shows the trial days left → **Upgrade with Dodo Payments**. Use test card **4242 4242 4242 4242**, expiry **06/32**, CVV **123**. You return to the billing page, which waits for the verified webhook and then shows **Pro**. To test a decline use **4000 0000 0000 0002**. No real money moves.
12. **Mobile** — open the site on a phone: landing, bottom tab bar in the app, forms, and **Take photo** to shoot product photos with the live camera (several angles in a row).

## What not to expect

- Photos can’t verify hidden defects, hygiene, odour or authenticity — the app says so on every AI result.
- Recovery values are estimates from a sourced rate card (or the user’s own prices), not offers. Quotes and realized proceeds are labelled separately. Rate-card sources were checked on 17 Oct 2026.
- Payments are in Dodo **test mode** until merchant verification is complete.

Integration status can be checked at `https://<custom-domain>/api/status`.
