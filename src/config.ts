// Site configuration. Plans and prices live in src/lib/plans.ts (shared with the server);
// the amount actually charged is whatever each Dodo product is set to — keep them in sync.

import { FREE_ITEMS, TRIAL } from './lib/plans'

const env = import.meta.env

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? '',
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  contactEmail: (env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  paymentsMode: ((env.VITE_PAYMENTS_MODE as string | undefined) ?? 'test') as 'test' | 'live',
}

export const accountsEnabled = Boolean(config.supabaseUrl && config.supabaseAnonKey)

/** Mirrors limits enforced server-side (schema.sql trigger and Netlify Functions). */
export const LIMITS = {
  trialDays: Number(env.VITE_TRIAL_DAYS ?? TRIAL.days),
  trialAiInspections: TRIAL.aiInspections,
  freeItems: FREE_ITEMS,
  maxPhotos: 4,
}

/** What the free trial includes. */
export const TRIAL_FEATURES = [
  `Everything in Pro for ${LIMITS.trialDays} days`,
  `Up to ${LIMITS.trialAiInspections} AI photo inspections`,
  'AI summaries and CSV export included',
  'Keep your data if you don’t choose a plan',
]

/** What stays available after the trial without paying. */
export const AFTER_TRIAL = `After the trial without a plan: your records stay, and you can still view them, grade manually and use the calculator (up to ${LIMITS.freeItems} returns). AI inspection and exports need Starter or Pro; AI summaries need Pro.`
