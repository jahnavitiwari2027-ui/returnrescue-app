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

/** The caller's brand workspace: their own, or the brand they joined as staff. */
export interface TeamInfo {
  role: 'owner' | 'staff' | 'pending'
  /** Whose returns, products and settings this workspace holds. */
  ownerId: string
  brandName: string
  /** Owner only. */
  joinCode: string | null
  /** Shared rate-card overrides and partners (null = none saved on the team yet). */
  rates: unknown
  partners: unknown
  /** False until the team update has been run on the database: the app then works as a single-user workspace. */
  available: boolean
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
  /** Null until loaded (or when signed out). */
  team: TeamInfo | null
  /** Set when the workspace couldn't be loaded (e.g. offline); never guessed. */
  teamError: string | null
  refresh: () => Promise<Entitlement | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase)
  const [session, setSession] = useState<Session | null>(null)
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)
  const [aiInspectionsUsed, setUsed] = useState(0)
  const [team, setTeam] = useState<TeamInfo | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  // For staff, the plan and trial are the brand owner's.
  const [ownerPlan, setOwnerPlan] = useState<{ pro: boolean; createdAt: string | null; aiUsed: number } | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) return null
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) {
      setEntitlement(null)
      setUsed(0)
      setTeam(null)
      setTeamError(null)
      setOwnerPlan(null)
      return null
    }
    const uid = s.session.user.id
    const [{ data }, usage, teamRes] = await Promise.all([
      supabase.from('entitlements').select('*').maybeSingle(),
      supabase.from('ai_usage').select('id', { count: 'exact', head: true }).eq('kind', 'inspection'),
      supabase.rpc('my_team'),
    ])
    setEntitlement((data as Entitlement) ?? null)
    setUsed(usage.count ?? 0)
    const row = Array.isArray(teamRes.data) ? (teamRes.data[0] as Record<string, unknown> | undefined) : undefined
    const e = teamRes.error
    // Only "the function doesn't exist yet" means a single-user workspace. Any other failure
    // (offline, timeout) must not drop a staff member into an empty workspace of their own.
    const notInstalled = !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function|my_team/i.test(e.message))
    if (e && !notInstalled) {
      setTeamError(e.message || 'Couldn’t load your workspace.')
      return (data as Entitlement) ?? null
    }
    setTeamError(null)
    if (e || !row) {
      // Database not updated for teams yet: behave as a single-user workspace.
      setTeam({ role: 'owner', ownerId: uid, brandName: '', joinCode: null, rates: null, partners: null, available: false })
      setOwnerPlan(null)
    } else {
      const role = row.role === 'staff' || row.role === 'pending' ? row.role : 'owner'
      setTeam({
        role,
        ownerId: (row.owner_id as string) || uid,
        brandName: (row.brand_name as string) ?? '',
        joinCode: (row.join_code as string | null) ?? null,
        rates: row.rates ?? null,
        partners: row.partners ?? null,
        available: true,
      })
      setOwnerPlan(role === 'owner' ? null : { pro: !!row.owner_pro, createdAt: (row.owner_created_at as string | null) ?? null, aiUsed: Number(row.owner_ai_used ?? 0) })
      // Older accounts kept rates and partners on the owner's profile. Copy them to the
      // team once, so staff who join later price returns with the same rate card.
      const meta = s.session.user.user_metadata ?? {}
      const move: Record<string, unknown> = {}
      if (role === 'owner' && row.rates == null && meta.rates && typeof meta.rates === 'object') move.rates = meta.rates
      if (role === 'owner' && row.partners == null && Array.isArray(meta.partners) && meta.partners.length) move.partners = meta.partners
      if (Object.keys(move).length) {
        const { error: e1 } = await supabase.rpc('ensure_team', { p_brand: (meta.business_name as string | undefined) ?? null })
        if (!e1) {
          const { error: e2 } = await supabase.from('teams').update(move).eq('owner_id', uid)
          if (!e2) setTeam((t) => (t ? { ...t, ...move } : t))
        }
      }
    }
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
      setTeam(null)
      setOwnerPlan(null)
    }
  }, [session?.user.id, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthState>(() => {
    const staff = !!ownerPlan
    const isPro = staff ? ownerPlan.pro : entitlement?.plan === 'pro' && entitlement.status === 'active'
    const createdIso = staff ? ownerPlan.createdAt : session?.user.created_at
    const created = createdIso ? new Date(createdIso) : null
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
      hasAccess: (isPro || inTrial) && team?.role !== 'pending',
      aiInspectionsUsed: staff ? ownerPlan.aiUsed : aiInspectionsUsed,
      team,
      teamError,
      refresh,
      signOut: async () => {
        await supabase?.auth.signOut()
      },
    }
  }, [ready, session, entitlement, aiInspectionsUsed, team, teamError, ownerPlan, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
