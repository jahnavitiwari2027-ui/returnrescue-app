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

/**
 * Launch weekend: every signed-in account gets the full product free, with a few AI inspections,
 * until the end date. There is no time-limited trial any more.
 */
export const LAUNCH = {
  /** Inspections before this moment (old trial usage) don't count against anyone. */
  start: '2026-11-14T00:00:00+05:30',
  end: '2026-11-15T23:59:59+05:30',
  /** Shown on the site. */
  endLabel: 'Sun 15 Nov, 11:59 PM IST',
  freeInspections: 10,
}
export const launchOpen = (now = Date.now()) => now < Date.parse(LAUNCH.end)

/** One-time top-up of AI inspections, for anyone without a plan. Capped so the AI quota lasts. */
export const PACK = { price: 69, inspections: 15, maxPer30Days: 2 }
/** Env var holding the Dodo product ID of the one-time pack. */
export const PACK_ENV = 'DODO_PACK_PRODUCT_ID'

/** A pack purchase, recorded on the account (app_metadata.ai_packs) by the verified webhook. */
export interface PackRecord {
  id: string
  at: string
}
export function packsOf(appMetadata: Record<string, unknown> | null | undefined): PackRecord[] {
  const raw = appMetadata?.ai_packs
  return Array.isArray(raw) ? raw.filter((p): p is PackRecord => !!p && typeof p.id === 'string' && typeof p.at === 'string') : []
}

export interface Allowance {
  /** AI inspections this account can still run (plans: in the current 30 days). */
  remaining: number
  /** The limit `remaining` counts down from. */
  limit: number
  /** Packs bought in the last 30 days, and how many more can be bought now. */
  packsRecent: number
  packsLeft: number
}

/**
 * How many AI inspections an account has left.
 * - Plans: a monthly allowance (counted over the last 30 days).
 * - Everyone else: the launch-weekend free inspections (only those actually used once it ends)
 *   plus 15 per pack bought, against everything used since the launch started.
 */
export function aiAllowance(opts: { plan: PaidPlan | null; used30d: number; usedSinceLaunch: number; usedInWindow: number; packs: PackRecord[]; now?: number }): Allowance {
  const now = opts.now ?? Date.now()
  const packsRecent = opts.packs.filter((p) => now - Date.parse(p.at) < 30 * 86_400_000).length
  const packsLeft = Math.max(0, PACK.maxPer30Days - packsRecent)
  if (opts.plan) {
    const limit = AI_INSPECTIONS[opts.plan]
    return { remaining: Math.max(0, limit - opts.used30d), limit, packsRecent, packsLeft }
  }
  const free = launchOpen(now) ? LAUNCH.freeInspections : Math.min(LAUNCH.freeInspections, opts.usedInWindow)
  const limit = free + PACK.inspections * opts.packs.length
  return { remaining: Math.max(0, limit - opts.usedSinceLaunch), limit, packsRecent, packsLeft }
}

/** Returns kept without a plan once the launch weekend is over. */
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

