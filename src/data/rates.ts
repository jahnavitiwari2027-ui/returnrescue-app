// A brand's own rate card overrides. Demo: this browser. Account: the brand's
// team row, shared with its staff (older accounts: the owner's profile metadata,
// used until the first save). Only values that differ from the published
// defaults are stored, so default updates still apply.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { supabase } from '../lib/supabase'
import type { TeamInfo } from '../context/AuthContext'
import { diffRates, resolveRates, type RateCard, type RateOverrides } from '../lib/rates'

const DEMO_KEY = 'returnrescue.demo.rates.v1'

function readDemo(): RateOverrides {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return JSON.parse(raw) as RateOverrides
  } catch {
    /* ignore */
  }
  return {}
}

export function useRates() {
  const { mode } = useWorkspace()
  const { user, team, refresh } = useAuth()
  const [overrides, setOverrides] = useState<RateOverrides>(() => (mode === 'demo' ? readDemo() : {}))

  useEffect(() => {
    // Staff always use their brand's rate card, never anything on their own profile.
    if (mode === 'account') setOverrides(((team?.role === 'staff' ? team.rates : team?.rates ?? user?.user_metadata?.rates) as RateOverrides | undefined) ?? {})
  }, [mode, user, team])

  const rates = useMemo(() => resolveRates(overrides), [overrides])
  const customised = Object.keys(overrides).length > 0

  const save = useCallback(
    async (next: RateCard | null) => {
      const diff = next ? diffRates(resolveRates(next)) : {}
      if (mode === 'demo') {
        try {
          localStorage.setItem(DEMO_KEY, JSON.stringify(diff))
        } catch {
          throw new Error('Browser storage is full.')
        }
        setOverrides(diff)
        return
      }
      if (!supabase) throw new Error('Accounts are not configured.')
      await saveTeamSetting('rates', diff, team)
      setOverrides(diff)
      if (team?.available) await refresh()
    },
    [mode, team, refresh],
  )

  return { rates, customised, save }
}

/** Save a shared setting on the brand's team row (owner only), or on the profile before teams exist. */
export async function saveTeamSetting(key: 'rates' | 'partners', value: unknown, team: TeamInfo | null) {
  if (!supabase) throw new Error('Accounts are not configured.')
  if (team?.role === 'staff') throw new Error('Only the brand owner or ops can change this.')
  if (team?.available) {
    const { error: e1 } = await supabase.rpc('ensure_team', { p_brand: null })
    if (e1) throw new Error(e1.message.replace(/^.*?(TEAM|AUTH):\s*/, ''))
    const { error } = await supabase.from('teams').update({ [key]: value }).eq('owner_id', team.ownerId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.auth.updateUser({ data: { [key]: value } })
  if (error) throw new Error(error.message)
}
