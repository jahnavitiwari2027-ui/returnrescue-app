# Evaluator guide

**Live site:** `https://returnrescue.dpdns.org` · **Source:** `https://github.com/jahnavitiwari2027-ui/returnrescue-app`

No setup is needed. Two ways in:

- **Demo workspace — no sign-up.** Click **Try the live demo** (or **Launch app**). Ten fictional sample returns, stored only in your browser. **Reset demo data** in the sidebar restores them.
- **Your own workspace — free account (needed for AI).** Click **Start 14-day free trial**, sign up with **Continue with Google** or any email and a password (8+ characters). No card. The trial includes everything in Pro (up to 100 AI inspections). You don’t need to pay for anything to evaluate the product.

All sample products and brands are fictional. The **Features** page’s **“No black boxes”** section explains the grading rubric, how values are estimated, the exact formulas and why the product can be trusted. Sample grades in the demo were entered by hand and are labelled “graded by you”; their values come from the default rate card; only results shown under **AI inspection result** come from the AI model.

## Suggested 10-minute test

1. **Website** — the menu has separate pages: **Home** (what it does, with a recovery card computed live by the same engine as the app), **Features** (every feature in detail, the grades and the methodology), **Pricing** (switch **Monthly / Yearly** to see the saving), **FAQ** and **Contact**; legal pages are in the footer.
2. **Dashboard** — every number is computed from stored records. Change something later and return here to see it update.
3. **Add a return (signed in)** — *Add return* → **Take photo** (live camera) or **Upload**, then product name, category and original price (estimates and SKU are optional). Under **Where it will sell**, pick **Amazon.in, Flipkart, Meesho or Your own website** — each shows its approximate fees and delivery on this item. GST (5%/18% by category and price), commission and closing or fixed fees, and delivery (presets by packed weight or zone, or a custom amount) are worked out automatically; tick **Set GST myself** or **Enter fees myself** to override, and **Save as my default** to reuse the choice → **Save return**. Use 1–4 clear photos of a real garment or shoe — a phone photo is ideal.
4. **AI inspection** — starts automatically after saving (10–30 s). The result card shows the grade, a one-line summary and the **best option with its estimated value**. The grade and the best option are saved automatically — no confirm step. To correct it, use **Re-run inspection**, **Change grade** (the best option is picked again) or **Choose another option** (a reason is required). Open **What the AI saw** for defects, checks and limitations. Photos of something other than clothing, footwear or a bag (e.g. medicine) are refused with no grade or value; a shirt filed under Footwear goes to manual review with the reason. Each AI result links to **Contact support**, which opens the contact form with the topic and return reference filled in.
5. **Next steps** — a pathway for the chosen route appears straight away: numbered steps, then **Who can help** — your saved contacts, **Find nearby** (opens Google Maps for repairers, recyclers etc.), a **Delhi NCR directory** of real businesses for that route and product type (e.g. Doctor Uncle and Kicks Rewash for shoe repair, IndiaLot for liquidation, Goonj and Respun for donation and recycling), each with its address, services and public contact details, and your own saved partners with Call / WhatsApp / Email buttons. Manage contacts under **Partners**, which also has the full directory with type and location filters and a **Save** button. Listings were taken from each business’s own website (checked 17 Oct 2026); ReturnRescue has no partnership with them.
6. **All options and the maths** — expand to see each route’s net value and its line-by-line breakdown. Every rupee shows where it came from: e.g. *Zip replacement (tailor) ₹500 · source*, *Amazon referral fee for footwear 8% · source*, or an *assumption* tag. The AI never sets a price — it only reports defects and their severity; the rate card prices them.
7. **Your rates** — the sidebar (or the sliders icon on mobile) opens the rate card with every default, its source link and the list of assumptions. There’s also a GST-registration switch, a section per platform, and **From your own results**: after five completed sales on a route (samples excluded), the median amount you actually received is offered as a suggested rate. Change a rate (e.g. *Repaired items resell at* 50% → 60%), save, then **Update them** to re-price returns without a decision — saved decisions keep the values they were made with. **Reset to defaults** restores the published rates.
8. **Persistence** — refresh the page: grade, AI result and decision are still there. Enter the **amount received** to complete the item and see the variance vs estimate.
9. **Inventory** — search (e.g. “sneaker”), **Filters** for grade/status/category/route, sort, edit, delete, **Export CSV**.
10. **Insights** — top categories, defects, best-value routes, unprocessed items; **Generate summary** for the AI briefing (signed in).
11. **Plans & payments** — **Plan & billing** shows the trial days left and the two plans, with a **Monthly / Yearly** switch that shows the yearly saving. **Choose Starter** or **Choose Pro** opens Dodo Payments’ hosted checkout. Payments are **live** — real charges — so you can open the checkout to see it and close it without paying; nothing changes unless a payment succeeds. After a real payment the billing page waits for the verified webhook before unlocking the plan; existing subscribers switch plans from the same page.
12. **Mobile** — open the site on a phone: landing, bottom tab bar in the app, forms, and **Take photo** to shoot product photos with the live camera (several angles in a row).

## What not to expect

- Photos can’t verify hidden defects, hygiene, odour or authenticity — the app says so on every AI result.
- Recovery values are estimates from a sourced rate card (or the user’s own prices), not offers. Quotes and realized proceeds are labelled separately. Rate-card sources were checked on 17 Oct 2026.
- Payments are live through Dodo Payments; the free trial covers everything needed to evaluate the product.

Integration status can be checked at `https://returnrescue.dpdns.org/api/status`.
