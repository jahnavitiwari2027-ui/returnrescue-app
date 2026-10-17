# Deployment & credentials setup

Total time: about 45–60 minutes, most of it waiting for sign-ups. **Everything in this guide is free** — no card is needed anywhere except where marked optional. Do the steps in order — later steps need values from earlier ones. **Never paste a secret key into chat, a document, or GitHub.** Secrets go only into Netlify’s environment variables.

Keep a private note open while you work; you will collect these values:

| Value | From | Netlify variable |
|---|---|---|
| Project URL | Supabase | `VITE_SUPABASE_URL` and `SUPABASE_URL` |
| anon / publishable key | Supabase | `VITE_SUPABASE_ANON_KEY` |
| service_role / secret key | Supabase | `SUPABASE_SERVICE_ROLE_KEY` 🔒 |
| API key | Google AI Studio | `GEMINI_API_KEY` 🔒 |
| Test API key | Dodo | `DODO_PAYMENTS_API_KEY` 🔒 |
| Product id (`pdt_…`) | Dodo | `DODO_PRO_PRODUCT_ID` |
| Webhook secret (`whsec_…`) | Dodo | `DODO_PAYMENTS_WEBHOOK_KEY` 🔒 |

---

## 1. GitHub repository

1. github.com → **New repository** → name `returnrescue-app` → **Public** → do *not* add a README → **Create**.
2. The code is pushed there from the build session. (If you’re doing it yourself: `git remote add origin https://github.com/<you>/returnrescue-app.git && git push -u origin main`.)

## 2. Supabase (login, database, photo storage)

1. supabase.com → **New project**. Name `returnrescue`, region **Mumbai (ap-south-1)**, set a strong database password (save it). Wait ~2 minutes.
2. Left sidebar → **SQL Editor** → **New query** → open `supabase/schema.sql` from the repo, copy everything, paste, **Run**. You should see “Success. No rows returned”.
3. **Authentication → Sign In / Providers → Email**: keep Email enabled. For the assignment, turn **Confirm email OFF** so evaluators can sign up instantly (Supabase’s built-in email sender is limited to a few emails per hour).
4. **Authentication → URL Configuration**: set **Site URL** to your final domain (e.g. `https://returnrescue.me`) and add Redirect URLs `https://returnrescue.me/**` and your Netlify URL `https://<site>.netlify.app/**`.
5. **Project Settings → API Keys** (or **Data API**): copy the **Project URL**, the **anon / publishable** key, and the **service_role / secret** key.

### 2b. Database update (17 Oct 2026 — free trial)
If you ran `schema.sql` before 17 Oct 2026 02:30 IST, also run `supabase/update-2026-10-17-trial.sql` once in the SQL Editor (it removes the 15-return limit during the 14-day trial). New projects don’t need it — `schema.sql` already includes it.

If you ran `schema.sql` before 18 Oct 2026, also run `supabase/update-2026-10-18-platforms.sql` once (it adds the optional `sale_setup` column that remembers which platform each return sells on). Until you do, the app still saves returns — just without the platform.

### 2c. Sign in with Google (optional, free)
1. console.cloud.google.com → create (or pick) a project → **APIs & Services → OAuth consent screen** → External → app name *ReturnRescue*, your email as support and developer contact → save. Scopes: leave the defaults (email, profile). Then **Publish app** so anyone can sign in (basic scopes need no Google review).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID** → *Web application*. Under **Authorised redirect URIs** add `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase shows this exact URL on its Google provider page). Create, then copy the **Client ID** and **Client secret**.
3. Supabase → **Authentication → Sign In / Providers → Google** → enable, paste the Client ID and secret → **Save**.
4. The **Continue with Google** button on the login and sign-up pages then works. Until it’s set up, the button explains that Google sign-in isn’t switched on yet.

## 3. Google Gemini API key (AI inspection) — free

1. Go to aistudio.google.com and sign in with a Google account (a personal one is fine; no card needed).
2. Click **Get API key → Create API key** (let it create a new Google Cloud project if asked). Copy the key.
3. Leave billing **off**. The free tier has per-minute and per-day request limits — plenty for a demo and grading. If the limit is hit, the app shows “busy / at its free-tier limit” and never invents a result.
4. The app uses `gemini-3.8-flash` by default; change it with `GEMINI_MODEL` if Google retires that model.
5. Note: on the free tier Google may use submitted content to improve its products — the privacy policy already says this. Use product photos only, never photos of people.

(Optional, paid: set `ANTHROPIC_API_KEY` and `AI_PROVIDER=anthropic` to use Claude instead.)

## 4. Dodo Payments (subscription billing — test mode)

1. Sign up at dodopayments.com. Make sure the dashboard toggle shows **Test mode**.
2. **Products → Create product**: name `ReturnRescue Pro`, type **Subscription**, price **₹999**, billing **monthly**, currency **INR**. Save and copy the product id (`pdt_…`).
3. **Developer → API Keys → Create** (test mode) → copy the key.
4. Webhooks are set up in step 6, once you have the site URL.

## 5. Netlify (hosting + server functions)

1. app.netlify.com → **Add new project → Import an existing project → GitHub** → authorise → pick `returnrescue-app`.
2. Build settings are read from `netlify.toml` automatically (build `npm run build`, publish `dist`). Don’t deploy yet — first open **Advanced / Add environment variables** (or after creation: **Project configuration → Environment variables**) and add:

```
VITE_SUPABASE_URL          = <Supabase project URL>
VITE_SUPABASE_ANON_KEY     = <anon / publishable key>
SUPABASE_URL               = <Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY  = <service_role key>          (mark as secret)
GEMINI_API_KEY             = <Google AI Studio key>      (mark as secret)
DODO_PAYMENTS_API_KEY      = <Dodo test API key>         (mark as secret)
DODO_PAYMENTS_ENVIRONMENT  = test_mode
DODO_PRO_PRODUCT_ID        = <pdt_…>
VITE_PRO_PRICE_INR         = 999
VITE_PAYMENTS_MODE         = test
SITE_URL                   = https://<your custom domain>   (add after step 7; until then leave unset)
VITE_CONTACT_EMAIL         = <optional public email>
```

3. **Deploy**. When it finishes, open the `*.netlify.app` URL and check `https://<site>.netlify.app/api/status` — it should show `"ai": true, "accounts": true`. `payments` becomes true after step 6.

> `VITE_*` values are baked in at build time — after changing one, trigger **Deploys → Trigger deploy → Deploy site**.

## 6. Dodo webhook

1. Dodo dashboard (Test mode) → **Developer → Webhooks → Add endpoint**.
2. URL: `https://<your domain or site>.netlify.app/api/dodo-webhook` (update it to the custom domain later).
3. Events: select all **subscription.*** events (at minimum active, renewed, updated, plan_changed, on_hold, failed, cancelled, expired, past_due, paused). Payment events are optional.
4. Save → copy the **signing secret** (`whsec_…`) → add to Netlify as `DODO_PAYMENTS_WEBHOOK_KEY` (secret) → redeploy.
5. `…/api/status` should now show `"payments": true`.

## 7. Custom domain (free options)

The assignment does not accept `*.netlify.app`, so a custom domain is required. Free routes, best first:

**Option A — a teammate’s GitHub Student Developer Pack.** Only one submission is needed per team, so any teammate whose Pack is already verified can claim the free domain (education.github.com/pack → *Namecheap* free `.me` for a year, or *Name.com* / *.TECH* offers) and point it at the Netlify site. This gives a normal, credible domain at no cost.

**Option B — your own Pack, once approved.** Same as A. Deploy on the `netlify.app` URL now and attach the domain the moment approval arrives (deadline 22 Oct).

**Option C — DigitalPlat FreeDomain (free, no Pack needed).** domain.digitalplat.org → create an account → register e.g. `returnrescue.qzz.io` or `returnrescue.dpdns.org` → choose **custom nameservers**. Caveats: it is a free community registry (no guarantees on longevity), and some instructors may view a free second-level name as less “own” than a purchased one — confirm with your instructor if unsure.

Connecting the domain in Netlify (all options):
1. Netlify → **Domain management → Add a domain** → enter it → choose **Set up Netlify DNS** (free). Netlify shows four nameservers (`dns1.p0X.nsone.net` …).
2. At the registrar (Namecheap / Name.com / DigitalPlat), replace the nameservers with Netlify’s four. (Alternative: keep the registrar’s DNS and add the `A`/`ALIAS` + `CNAME` records Netlify shows.)
3. Wait for DNS (minutes to a few hours). Netlify provisions the free Let’s Encrypt **HTTPS** certificate automatically — check **Domain management → HTTPS**.
4. Set `SITE_URL=https://<domain>` in Netlify and redeploy; update Supabase URL Configuration (step 2.4) and the Dodo webhook URL (step 6) to the custom domain.

## 8. Verify production (10 minutes)

1. `https://<domain>/api/status` → all true, `paymentsMode: "test_mode"`.
2. Landing → **Try the live demo** → open a sample → it loads.
3. Demo → **Add return** with a real product photo → **Run AI inspection** → a genuine result appears.
4. **Start free** → sign up → add a return with a photo → run AI inspection → accept → save a decision → refresh.
5. **Plan & billing → Upgrade** → Dodo test checkout with card `4242 4242 4242 4242`, expiry `06/32`, CVV `123` → you return to billing, which shows “Confirming…” and then **Pro**. In Supabase → Table editor → `entitlements` you’ll see the row written by the webhook; `webhook_events` shows the verified events.
6. Inventory → **Export CSV** now works; Insights → **Generate summary** works.
7. Optional decline test: card `4000 0000 0000 0002` → billing stays on Free.

## 9. Going live later (not needed for the assignment)

Complete Dodo merchant verification, create the same product in Live mode, swap `DODO_PAYMENTS_API_KEY`, `DODO_PRO_PRODUCT_ID`, `DODO_PAYMENTS_WEBHOOK_KEY` for live values, set `DODO_PAYMENTS_ENVIRONMENT=live_mode` and `VITE_PAYMENTS_MODE=live`, and redeploy.

## Troubleshooting

| Symptom | Fix |
|---|---|
| “Accounts aren’t switched on for this deployment” | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing — add and redeploy. |
| AI inspection: “not configured” | `GEMINI_API_KEY` missing. “Rejected the server’s API key” → key copied wrongly. |
| AI inspection: “model is not available” | Set `GEMINI_MODEL` to a current free-tier Flash model listed at ai.google.dev/gemini-api/docs/models. |
| AI inspection: “busy or at its free-tier limit” | Wait a minute (per-minute limit) or until tomorrow (daily limit). |
| Sign-up says “check your inbox” | Turn off **Confirm email** in Supabase (step 2.3) or confirm the email. |
| Paid but still Free | Dodo → Webhooks → check delivery logs. 401 = wrong `DODO_PAYMENTS_WEBHOOK_KEY`; 503 = variable missing. Check Netlify → Logs → Functions → `dodo-webhook`. |
| Checkout button error | `DODO_PAYMENTS_API_KEY` or `DODO_PRO_PRODUCT_ID` missing, or a live key used with `test_mode`. |
