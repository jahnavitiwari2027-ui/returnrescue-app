import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LIMITS } from '../config'
import { activePlan, type PaidPlan } from '../lib/plans'
import { supabase } from '../lib/supabase'

export interface Entitlement {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  dodo_customer_id: string | null
  dodo_product_id?: string | null
  billing_interval?: 'month' | 'year' | null
  updated_at: string
}

interface AuthState {
  ready: boolean
  session: Session | null
  user: User | null
  entitlement: Entitlement | null
  /** Active paid plan (verified by webhook), or null. */
  plan: PaidPlan | null
  isPro: boolean
  /** Inside the free trial (and not on a paid plan). */
  inTrial: boolean
  /** Pro or trial: Pro-only features such as AI summaries. */
  proFeatures: boolean
  trialEndsAt: Date | null
  trialDaysLeft: number
  /** Any paid plan or active trial: can use AI inspection and export. */
  hasAccess: boolean
  aiInspectionsUsed: number
  /** AI inspections in the last 30 days (paid plans are limited per 30 days). */
  aiInspections30d: number
  refresh: () => Promise<Entitlement | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase)
  const [session, setSession] = useState<Session | null>(null)
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)
  const [aiInspectionsUsed, setUsed] = useState(0)
  const [aiInspections30d, setUsed30] = useState(0)

  const refresh = useCallback(async () => {
    if (!supabase) return null
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) {
      setEntitlement(null)
      setUsed(0)
      setUsed30(0)
      return null
    }
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const [{ data }, usage, recent] = await Promise.all([
      supabase.from('entitlements').select('*').maybeSingle(),
      supabase.from('ai_usage').select('id', { count: 'exact', head: true }).eq('kind', 'inspection'),
      supabase.from('ai_usage').select('id', { count: 'exact', head: true }).eq('kind', 'inspection').gte('created_at', since),
    ])
    setEntitlement((data as Entitlement) ?? null)
    setUsed(usage.count ?? 0)
    setUsed30(recent.count ?? 0)
    return (data as Entitlement) ?? null
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) refresh()
    else {
      setEntitlement(null)
      setUsed(0)
      setUsed30(0)
    }
  }, [session?.user.id, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthState>(() => {
    const plan = activePlan(entitlement)
    const isPro = plan === 'pro'
    const created = session?.user.created_at ? new Date(session.user.created_at) : null
    const trialEndsAt = created ? new Date(created.getTime() + LIMITS.trialDays * 86_400_000) : null
    const msLeft = trialEndsAt ? trialEndsAt.getTime() - Date.now() : 0
    const inTrial = !plan && msLeft > 0
    return {
      ready,
      session,
      user: session?.user ?? null,
      entitlement,
      plan,
      isPro,
      inTrial,
      proFeatures: isPro || inTrial,
      trialEndsAt,
      trialDaysLeft: Math.max(0, Math.ceil(msLeft / 86_400_000)),
      hasAccess: !!plan || inTrial,
      aiInspectionsUsed,
      aiInspections30d,
      refresh,
      signOut: async () => {
        await supabase?.auth.signOut()
      },
    }
  }, [ready, session, entitlement, aiInspectionsUsed, aiInspections30d, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
