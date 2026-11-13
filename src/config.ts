// Site configuration. Plans and prices live in src/lib/plans.ts (shared with the server);
// the amount actually charged is whatever each Dodo product is set to — keep them in sync.

import { FREE_ITEMS, LAUNCH, launchOpen, PACK } from './lib/plans'

const env = import.meta.env

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? '',
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  contactEmail: (env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  paymentsMode: ((env.VITE_LIVE_PAYMENTS_MODE as string | undefined) ?? (env.VITE_PAYMENTS_MODE as string | undefined) ?? 'test') as 'test' | 'live',
}

export const accountsEnabled = Boolean(config.supabaseUrl && config.supabaseAnonKey)

/** Mirrors limits enforced server-side (schema.sql trigger and Netlify Functions). */
export const LIMITS = {
  freeItems: FREE_ITEMS,
  maxPhotos: 4,
}

/** "₹69 for 15 AI inspections" */
export const PACK_LINE = `₹${PACK.price} for ${PACK.inspections} AI inspections`

/** Launch-weekend wording while it runs; the paid-pack wording once it ends (checked when shown). */
export const offer = () =>
  launchOpen()
    ? {
        open: true,
        cta: 'Try it free',
        short: `Free for everyone until ${LAUNCH.endLabel}`,
        detail: `Every feature free for everyone until ${LAUNCH.endLabel}, with ${LAUNCH.freeInspections} AI inspections each. No card needed.`,
      }
    : {
        open: false,
        cta: 'Get started',
        short: `Start for ${PACK_LINE}`,
        detail: `Create an account free; AI inspection starts at ${PACK_LINE}, one-time. No subscription needed.`,
      }

/** What the launch weekend includes. */
export const LAUNCH_FEATURES = [
  'Every feature, including AI summaries and CSV export',
  `${LAUNCH.freeInspections} AI photo inspections each`,
  'Unlimited returns',
  'No card needed',
]

/** What an account without a plan gets, outside the launch weekend. */
export const WITHOUT_PLAN = `Without a plan you can keep and view your records, grade by hand and use the calculator (up to ${LIMITS.freeItems} returns). AI inspection is ${PACK_LINE} (one-time, up to ${PACK.maxPer30Days} packs a month) or included in Starter and Pro. CSV export needs a plan; AI summaries need Pro.`
