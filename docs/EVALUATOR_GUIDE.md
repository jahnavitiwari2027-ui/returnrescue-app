# Evaluator guide

**Live site:** `https://<custom-domain>` · **Source:** `https://github.com/<username>/returnrescue-app`

No setup is needed. Two ways in:

- **Demo workspace — no sign-up.** Click **Try the live demo** (or **Launch app**). Ten fictional sample returns, stored only in your browser. **Reset demo data** in the sidebar restores them.
- **Your own workspace — free account.** Click **Start free**, sign up with any email and a password (8+ characters). Includes 3 trial AI inspections and up to 15 returns.

All sample products and brands are fictional. Sample grades in the demo were entered by hand and are labelled “Graded manually”; only results shown under **AI inspection result** come from the AI model.

## Suggested 10-minute test

1. **Landing page** — scroll through: problem, how it works, feature previews (the recovery card is computed live by the same engine as the app), pricing, FAQ, contact form, legal pages in the footer.
2. **Dashboard** — every number is computed from stored records. Change something later and return here to see it update.
3. **Add a return** — *Add return* → submit empty to see validation → fill in a product, upload 1–4 clear photos of a real garment or shoe (a phone photo is ideal), add estimates, e.g. resale ₹2,800, refurbished resale ₹2,400, refurb cost ₹200, fee 20%, handling ₹100, liquidation ₹900 / fee ₹50, recycling ₹40 / cost ₹20 → **Save return**.
4. **AI inspection** — **Run AI inspection** (10–30 s). Review defects, proposed grade, rationale, limitations and suggested physical checks. Then **Accept** or **Correct grade** (a reason is required for a correction).
   - The demo allows 3 AI inspections per day per visitor; a free account adds 3 more.
   - Sample items use illustrations, so the AI should (correctly) ask for manual review on those — use a real photo for a meaningful result.
5. **Recovery comparison** — see which routes the grade allows, expand a route for its line-by-line maths, read the recommendation. Choose a different route to see that an override requires a reason → **Save decision**.
6. **Persistence** — refresh the page: grade, AI result and decision are still there. Record **Realized net proceeds** to complete the item and see the variance vs estimate.
7. **Inventory** — search (e.g. “sneaker”), filter by grade/status/category/route, sort, edit, delete, **Export CSV**.
8. **Insights** — top categories, defects, best-value routes, unprocessed items; **Generate summary** for the AI briefing (demo: 3/day).
9. **Payments (test mode)** — sign in → **Plan & billing → Upgrade with Dodo Payments**. Use test card **4242 4242 4242 4242**, expiry **06/32**, CVV **123**. You return to the billing page, which waits for the verified webhook and then shows **Pro**; CSV export and AI summaries unlock. To test a decline use **4000 0000 0000 0002**. No real money moves.
10. **Mobile** — open the site on a phone: landing, bottom tab bar in the app, forms and photo upload from the camera.

## What not to expect

- Photos can’t verify hidden defects, hygiene, odour or authenticity — the app says so on every AI result.
- Recovery values are estimates entered by the user, not offers. Quotes and realized proceeds are labelled separately.
- Payments are in Dodo **test mode** until merchant verification is complete.

Integration status can be checked at `https://<custom-domain>/api/status`.
