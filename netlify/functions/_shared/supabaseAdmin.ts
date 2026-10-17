import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
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
}

export async function getEntitlement(userId: string): Promise<EntitlementRow | null> {
  const { data } = await getAdmin().from('entitlements').select('*').eq('user_id', userId).maybeSingle()
  return (data as EntitlementRow) ?? null
}

export const isProRow = (e: EntitlementRow | null) => !!e && e.plan === 'pro' && e.status === 'active'

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
export const trialDays = () => Number(process.env.TRIAL_DAYS) || 14
export const trialAiLimit = () => Number(process.env.TRIAL_AI_LIMIT) || 100

export function trialEndsAt(user: User) {
  return new Date(new Date(user.created_at).getTime() + trialDays() * 86_400_000)
}

export interface Access {
  pro: boolean
  trial: boolean
  allowed: boolean
  trialEndsAt: string
}

/** Paid Pro (verified by webhook) or an active free trial. */
export async function getAccess(user: User): Promise<Access> {
  const pro = isProRow(await getEntitlement(user.id))
  const ends = trialEndsAt(user)
  const trial = !pro && ends.getTime() > Date.now()
  return { pro, trial, allowed: pro || trial, trialEndsAt: ends.toISOString() }
}

export interface Workspace {
  /** Whose returns, products, plan and AI allowance this request uses. */
  ownerId: string
  owner: User
  role: 'owner' | 'staff' | 'pending'
}

/** The brand workspace a signed-in user works in: their own, or the brand they joined as staff. */
export async function workspaceFor(user: User): Promise<Workspace> {
  const { data, error } = await getAdmin().from('team_members').select('owner_id,status').eq('member_id', user.id).maybeSingle()
  // No row (or the team update not run yet): their own workspace.
  if (error || !data) return { ownerId: user.id, owner: user, role: 'owner' }
  const row = data as { owner_id: string; status: string }
  if (row.status !== 'active') return { ownerId: row.owner_id, owner: user, role: 'pending' }
  const { data: o } = await getAdmin().auth.admin.getUserById(row.owner_id)
  if (!o?.user) return { ownerId: user.id, owner: user, role: 'owner' }
  return { ownerId: row.owner_id, owner: o.user, role: 'staff' }
}
