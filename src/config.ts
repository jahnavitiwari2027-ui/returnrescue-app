// Product configuration. Prices shown on the site are read from env so they can
// change without code edits; the amount actually charged is whatever the Dodo
// product (DODO_PRO_PRODUCT_ID) is set to — keep the two in sync.

const env = import.meta.env

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? '',
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  contactEmail: (env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  proPriceInr: Number(env.VITE_PRO_PRICE_INR ?? 999),
  paymentsMode: ((env.VITE_PAYMENTS_MODE as string | undefined) ?? 'test') as 'test' | 'live',
}

export const accountsEnabled = Boolean(config.supabaseUrl && config.supabaseAnonKey)

/** Mirrors limits enforced server-side (schema.sql trigger and Netlify Functions). */
export const LIMITS = {
  trialDays: Number(env.VITE_TRIAL_DAYS ?? 14),
  trialAiInspections: 100,
  freeItems: 15,
  proAiInspectionsPerMonth: 300,
  maxPhotos: 4,
}

export const PLANS = [
  {
    id: 'trial',
    name: 'Free trial',
    price: 0,
    period: `for ${LIMITS.trialDays} days`,
    blurb: 'Everything in Pro. No card required — just create an account.',
    features: [
      `Full Pro access for ${LIMITS.trialDays} days`,
      `Up to ${LIMITS.trialAiInspections} AI photo inspections`,
      'AI-suggested recovery values and grades',
      'Unlimited returns, insights and CSV export',
      'Keep your data if you don’t upgrade',
    ],
    cta: 'Start free trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: config.proPriceInr,
    period: 'per month',
    blurb: 'For D2C teams processing returns every week.',
    features: [
      'Unlimited returns in your workspace',
      `AI photo inspection (fair use: ${LIMITS.proAiInspectionsPerMonth}/month)`,
      'Recovery calculator with decision log',
      'AI-written insight summaries',
      'CSV export of your full inventory',
    ],
    cta: 'Upgrade to Pro',
  },
] as const

/** What stays available after the trial without paying. */
export const AFTER_TRIAL = `After the trial without Pro: your records stay, and you can still view them, grade manually and use the calculator (up to ${LIMITS.freeItems} returns). AI inspection, AI summaries and exports need Pro.`
