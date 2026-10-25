// Paid plans, shared by the site and the server functions so prices and limits can't drift.
// What a customer is actually charged is set on the matching Dodo product — keep them in sync.

export type PaidPlan = 'starter' | 'pro'
export type Interval = 'month' | 'year'

export const PLAN_NAME: Record<PaidPlan, string> = { starter: 'Starter', pro: 'Pro' }

/** Prices in INR, including applicable taxes as shown at checkout. */
export const PRICE: Record<PaidPlan, Record<Interval, number>> = {
  starter: { month: 499, year: 5388 },
  pro: { month: 999, year: 10788 },
}

/** AI photo inspections per 30 days. */
export const AI_INSPECTIONS: Record<PaidPlan, number> = { starter: 100, pro: 300 }

/** AI-written insight summaries are a Pro feature. */
export const AI_SUMMARIES: Record<PaidPlan, boolean> = { starter: false, pro: true }

export const TRIAL = { days: 14, aiInspections: 100 }
/** Returns kept on the free plan after the trial ends. */
export const FREE_ITEMS = 15

/** Saving per year when paying yearly instead of monthly. */
export const yearlySaving = (plan: PaidPlan) => PRICE[plan].month * 12 - PRICE[plan].year
/** What a yearly plan works out to per month. */
export const yearlyPerMonth = (plan: PaidPlan) => Math.round(PRICE[plan].year / 12)

export const isPaidPlan = (p: unknown): p is PaidPlan => p === 'starter' || p === 'pro'
export const isInterval = (i: unknown): i is Interval => i === 'month' || i === 'year'

/** The active paid plan on an entitlement row, or null (free, trial, cancelled, unpaid). */
export function activePlan(e: { plan?: string | null; status?: string | null } | null | undefined): PaidPlan | null {
  return e && e.status === 'active' && isPaidPlan(e.plan) ? e.plan : null
}

/** Env var holding the Dodo product ID for each plan and interval. Pro monthly keeps its original name. */
export const PRODUCT_ENV: Record<PaidPlan, Record<Interval, string>> = {
  starter: { month: 'DODO_STARTER_MONTHLY_PRODUCT_ID', year: 'DODO_STARTER_YEARLY_PRODUCT_ID' },
  pro: { month: 'DODO_PRO_PRODUCT_ID', year: 'DODO_PRO_YEARLY_PRODUCT_ID' },
}

/** Which plan and interval a Dodo product ID belongs to, given the configured IDs. */
export function planForProduct(productId: string | null | undefined, read: (name: string) => string | undefined): { plan: PaidPlan; interval: Interval } | null {
  if (!productId) return null
  for (const plan of ['starter', 'pro'] as const)
    for (const interval of ['month', 'year'] as const) if (read(PRODUCT_ENV[plan][interval]) === productId) return { plan, interval }
  return null
}

export const PLAN_FEATURES: Record<PaidPlan, string[]> = {
  starter: [
    'Unlimited returns in your workspace',
    `AI photo inspection (${AI_INSPECTIONS.starter} a month)`,
    'Automatic grading and best option, with every rupee explained',
    'Platform fees, GST and delivery worked out for you',
    'Partner directory and CSV export',
  ],
  pro: [
    'Everything in Starter',
    `AI photo inspection (fair use: ${AI_INSPECTIONS.pro} a month)`,
    'AI-written briefings on your returns and recovery',
  ],
}

export const PLAN_BLURB: Record<PaidPlan, string> = {
  starter: 'For smaller brands handling a few returns a day.',
  pro: 'For D2C teams processing returns every day.',
}

