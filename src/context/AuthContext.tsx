import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LIMITS } from '../config'
import { supabase } from '../lib/supabase'

export interface Entitlement {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  dodo_customer_id: string | null
  updated_at: string
}

interface AuthState {
  ready: boolean
  session: Session | null
  user: User | null
  entitlement: Entitlement | null
  isPro: boolean
  /** Inside the free trial (and not on paid Pro). */
  inTrial: boolean
  trialEndsAt: Date | null
  trialDaysLeft: number
  /** Pro or active trial: can use AI, summaries and export. */
  hasAccess: boolean
  aiInspectionsUsed: number
  refresh: () => Promise<Entitlement | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase)
  const [session, setSession] = useState<Session | null>(null)
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)
  const [aiInspectionsUsed, setUsed] = useState(0)

  const refresh = useCallback(async () => {
    if (!supabase) return null
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) {
      setEntitlement(null)
      setUsed(0)
      return null
    }
    const [{ data }, usage] = await Promise.all([
      supabase.from('entitlements').select('*').maybeSingle(),
      supabase.from('ai_usage').select('id', { count: 'exact', head: true }).eq('kind', 'inspection'),
    ])
    setEntitlement((data as Entitlement) ?? null)
    setUsed(usage.count ?? 0)
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
    }
  }, [session?.user.id, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthState>(() => {
    const isPro = entitlement?.plan === 'pro' && entitlement.status === 'active'
    const created = session?.user.created_at ? new Date(session.user.created_at) : null
    const trialEndsAt = created ? new Date(created.getTime() + LIMITS.trialDays * 86_400_000) : null
    const msLeft = trialEndsAt ? trialEndsAt.getTime() - Date.now() : 0
    const inTrial = !isPro && msLeft > 0
    return {
      ready,
      session,
      user: session?.user ?? null,
      entitlement,
      isPro,
      inTrial,
      trialEndsAt,
      trialDaysLeft: Math.max(0, Math.ceil(msLeft / 86_400_000)),
      hasAccess: isPro || inTrial,
      aiInspectionsUsed,
      refresh,
      signOut: async () => {
        await supabase?.auth.signOut()
      },
    }
  }, [ready, session, entitlement, aiInspectionsUsed, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
