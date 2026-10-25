import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { activePlan, TRIAL, type PaidPlan } from '../../../src/lib/plans'
import { env } from './http'

let admin: SupabaseClient | null = null

export function supabaseConfigured() {
  return Boolean((env('SUPABASE_URL') || env('VITE_SUPABASE_URL')) && env('SUPABASE_SERVICE_ROLE_KEY'))
}

/** Service-role client. Server-side only — bypasses RLS, so every query must filter by user. */
export function getAdmin(): SupabaseClient {
  if (!admin) {
    const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
    const key = env('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) throw new Error('Supabase is not configured')
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return admin
}

/** Verify the caller's Supabase access token. Returns null when missing or invalid. */
export async function getUser(req: Request): Promise<User | null> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token || !supabaseConfigured()) return null
  const { data, error } = await getAdmin().auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export interface EntitlementRow {
  user_id: string
  plan: string
  status: string
  dodo_subscription_id: string | null
  dodo_customer_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  last_event_at: string | null
  /** Which Dodo product (plan and interval) the subscription is on. Older rows may not have it. */
  dodo_product_id?: string | null
  billing_interval?: 'month' | 'year' | null
}

export async function getEntitlement(userId: string): Promise<EntitlementRow | null> {
  const { data } = await getAdmin().from('entitlements').select('*').eq('user_id', userId).maybeSingle()
  return (data as EntitlementRow) ?? null
}

/** The active paid plan (Starter or Pro), verified by webhook. */
export const paidPlanOf = (e: EntitlementRow | null): PaidPlan | null => activePlan(e)

export async function countUsage(userId: string, kind: 'inspection' | 'insights', sinceIso?: string) {
  let q = getAdmin().from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', kind)
  if (sinceIso) q = q.gte('created_at', sinceIso)
  const { count } = await q
  return count ?? 0
}

export async function recordUsage(userId: string, kind: 'inspection' | 'insights') {
  await getAdmin().from('ai_usage').insert({ user_id: userId, kind })
}

// ── Free trial: every new account gets TRIAL_DAYS of full Pro access, no card ──
export const trialDays = () => Number(process.env.TRIAL_DAYS) || TRIAL.days
export const trialAiLimit = () => Number(process.env.TRIAL_AI_LIMIT) || TRIAL.aiInspections

export function trialEndsAt(user: User) {
  return new Date(new Date(user.created_at).getTime() + trialDays() * 86_400_000)
}

export interface Access {
  /** Active paid plan, or null. */
  plan: PaidPlan | null
  /** Inside the free trial with no paid plan: every Pro feature is included. */
  trial: boolean
  /** Paid (any plan) or in the trial: can use AI inspection and export. */
  allowed: boolean
  /** Pro or trial: can use Pro-only features such as AI summaries. */
  proFeatures: boolean
  trialEndsAt: string
}

/** A paid plan (verified by webhook) or an active free trial. */
export async function getAccess(user: User): Promise<Access> {
  const plan = paidPlanOf(await getEntitlement(user.id))
  const ends = trialEndsAt(user)
  const trial = !plan && ends.getTime() > Date.now()
  return { plan, trial, allowed: !!plan || trial, proFeatures: plan === 'pro' || trial, trialEndsAt: ends.toISOString() }
}
