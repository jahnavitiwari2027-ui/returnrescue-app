import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { activePlan, aiAllowance, LAUNCH, launchOpen, packsOf, type Allowance, type PaidPlan } from '../../../src/lib/plans'
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

export async function countUsage(userId: string, kind: 'inspection' | 'insights', sinceIso?: string, untilIso?: string) {
  let q = getAdmin().from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', kind)
  if (sinceIso) q = q.gte('created_at', sinceIso)
  if (untilIso) q = q.lte('created_at', untilIso)
  const { count } = await q
  return count ?? 0
}

export async function recordUsage(userId: string, kind: 'inspection' | 'insights') {
  await getAdmin().from('ai_usage').insert({ user_id: userId, kind })
}

// ── Access: a paid plan, the launch weekend (everything free), or AI packs bought one at a time ──

export interface Access {
  /** Active paid plan, or null. */
  plan: PaidPlan | null
  /** Launch weekend: every signed-in account gets every feature free. */
  launch: boolean
  /** Can export CSV: a plan or the launch weekend. */
  exports: boolean
  /** Pro or the launch weekend: Pro-only features such as AI summaries. */
  proFeatures: boolean
  /** AI inspections left, and pack details. */
  ai: Allowance
}

export async function getAccess(user: User): Promise<Access> {
  const plan = paidPlanOf(await getEntitlement(user.id))
  const launch = launchOpen()
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [used30d, usedSinceLaunch, usedInWindow] = plan
    ? [await countUsage(user.id, 'inspection', since30), 0, 0]
    : await Promise.all([0, countUsage(user.id, 'inspection', LAUNCH.start), countUsage(user.id, 'inspection', LAUNCH.start, LAUNCH.end)])
  const ai = aiAllowance({ plan, used30d, usedSinceLaunch, usedInWindow, packs: packsOf(user.app_metadata) })
  return { plan, launch, exports: !!plan || launch, proFeatures: plan === 'pro' || launch, ai }
}
