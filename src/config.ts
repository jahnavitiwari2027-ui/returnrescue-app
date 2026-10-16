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
  freeItems: 15,
  freeAiInspections: 3,
  proAiInspectionsPerMonth: 300,
  demoAiPerDay: 3,
  maxPhotos: 4,
}

export const PLANS = [
  {
    id: 'demo',
    name: 'Free',
    price: 0,
    blurb: 'Explore the workflow and try it on your own returns.',
    features: [
      'Interactive demo with 10 sample returns',
      `Your own workspace with up to ${LIMITS.freeItems} returns`,
      `${LIMITS.freeAiInspections} AI photo inspections to try`,
      'Recovery value calculator',
      'Dashboard and data insights',
    ],
    cta: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: config.proPriceInr,
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
