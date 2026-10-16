# Deployment & credentials setup

Total time: about 45–60 minutes, most of it waiting for sign-ups. Do the steps in order — later steps need values from earlier ones. **Never paste a secret key into chat, a document, or GitHub.** Secrets go only into Netlify’s environment variables.

Keep a private note open while you work; you will collect these values:

| Value | From | Netlify variable |
|---|---|---|
| Project URL | Supabase | `VITE_SUPABASE_URL` and `SUPABASE_URL` |
| anon / publishable key | Supabase | `VITE_SUPABASE_ANON_KEY` |
| service_role / secret key | Supabase | `SUPABASE_SERVICE_ROLE_KEY` 🔒 |
| API key | Anthropic | `ANTHROPIC_API_KEY` 🔒 |
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

## 3. Anthropic API key (AI inspection)

1. console.anthropic.com → sign in → **Billing** → add a small amount of credit (US$5 is plenty for testing).
2. **API Keys → Create key** → name `returnrescue-netlify` → copy it once.
3. The app uses `claude-sonnet-5-5` by default. To use a different model, set `ANTHROPIC_MODEL`.

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
ANTHROPIC_API_KEY          = <Anthropic key>             (mark as secret)
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

## 7. Custom domain

The assignment does not accept `*.netlify.app`, so a custom domain is required.

**Option A — GitHub Student Developer Pack (free, if your student status is already verified):** education.github.com/pack → *Namecheap* (free `.me` for one year) or *Name.com* (free domain). Verification of a new Pack application can take several days, so start this immediately or use option B/C.

**Option B — buy one (fastest, ~₹100–₹1,000/year):** in Netlify, **Domain management → Add a domain → Buy a new domain** (DNS and HTTPS are configured automatically), or buy a cheap `.xyz` / `.online` / `.site` at Namecheap / Hostinger / GoDaddy.

**Option C — a subdomain of a domain you already own**, e.g. `returnrescue.yourdomain.in` (check with your instructor that this counts as “your own custom domain”).

Connecting:
1. Netlify → **Domain management → Add a domain** → enter it → follow the prompt.
   - Bought in Netlify: nothing else to do.
   - Bought elsewhere: either switch the registrar’s nameservers to the four Netlify nameservers shown, **or** add the DNS records Netlify shows (an `A` / `ALIAS` record for the apex pointing to Netlify’s load balancer and a `CNAME` for `www` to `<site>.netlify.app`; for a subdomain, a single `CNAME` to `<site>.netlify.app`).
2. Wait for DNS (minutes to a few hours). Netlify provisions the Let’s Encrypt **HTTPS** certificate automatically — check **Domain management → HTTPS**.
3. Set `SITE_URL=https://<domain>` in Netlify and redeploy; update Supabase URL Configuration (step 2.4) and the Dodo webhook URL (step 6) to the custom domain.

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
| AI inspection: “not configured” | `ANTHROPIC_API_KEY` missing. “Rejected the server’s API key” → key wrong or no credit. |
| AI inspection: request rejected (model) | Set `ANTHROPIC_MODEL` to a model your Anthropic account can use. |
| Sign-up says “check your inbox” | Turn off **Confirm email** in Supabase (step 2.3) or confirm the email. |
| Paid but still Free | Dodo → Webhooks → check delivery logs. 401 = wrong `DODO_PAYMENTS_WEBHOOK_KEY`; 503 = variable missing. Check Netlify → Logs → Functions → `dodo-webhook`. |
| Checkout button error | `DODO_PAYMENTS_API_KEY` or `DODO_PRO_PRODUCT_ID` missing, or a live key used with `test_mode`. |
