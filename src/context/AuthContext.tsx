import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { activePlan, aiAllowance, LAUNCH, launchOpen, packsOf, type Allowance, type PaidPlan } from '../lib/plans'
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
  /** Launch weekend: every feature is free for every signed-in account. */
  launch: boolean
  /** Pro or the launch weekend: Pro-only features such as AI summaries. */
  proFeatures: boolean
  /** A plan or the launch weekend: CSV export. */
  exports: boolean
  /** AI inspections left (and pack details). */
  ai: Allowance
  /** Has AI inspections left right now. */
  hasAccess: boolean
  refresh: () => Promise<Entitlement | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase)
  const [session, setSession] = useState<Session | null>(null)
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)
  const [usage, setUsage] = useState({ used30d: 0, usedSinceLaunch: 0, usedInWindow: 0 })
  const [appMeta, setAppMeta] = useState<Record<string, unknown> | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) return null
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) {
      setEntitlement(null)
      setUsage({ used30d: 0, usedSinceLaunch: 0, usedInWindow: 0 })
      setAppMeta(null)
      return null
    }
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const count = () => supabase!.from('ai_usage').select('id', { count: 'exact', head: true }).eq('kind', 'inspection')
    // getUser reads the account fresh, so a pack bought a moment ago shows up straight away.
    const [{ data }, recent, sinceLaunch, inWindow, fresh] = await Promise.all([
      supabase.from('entitlements').select('*').maybeSingle(),
      count().gte('created_at', since),
      count().gte('created_at', LAUNCH.start),
      count().gte('created_at', LAUNCH.start).lte('created_at', LAUNCH.end),
      supabase.auth.getUser(),
    ])
    setEntitlement((data as Entitlement) ?? null)
    setUsage({ used30d: recent.count ?? 0, usedSinceLaunch: sinceLaunch.count ?? 0, usedInWindow: inWindow.count ?? 0 })
    setAppMeta(fresh.data.user?.app_metadata ?? s.session.user.app_metadata ?? null)
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
      setUsage({ used30d: 0, usedSinceLaunch: 0, usedInWindow: 0 })
      setAppMeta(null)
    }
  }, [session?.user.id, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthState>(() => {
    const plan = activePlan(entitlement)
    const isPro = plan === 'pro'
    const launch = launchOpen()
    const ai = aiAllowance({ plan, ...usage, packs: packsOf(appMeta ?? session?.user.app_metadata) })
    return {
      ready,
      session,
      user: session?.user ?? null,
      entitlement,
      plan,
      isPro,
      launch,
      proFeatures: isPro || launch,
      exports: !!plan || launch,
      ai,
      hasAccess: !!session && ai.remaining > 0,
      refresh,
      signOut: async () => {
        await supabase?.auth.signOut()
      },
    }
  }, [ready, session, entitlement, usage, appMeta, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
