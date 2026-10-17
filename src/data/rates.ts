// A business's own rate card overrides. Demo: this browser. Account: the
// signed-in user's profile metadata (no extra table needed). Only values that
// differ from the published defaults are stored, so default updates still apply.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { supabase } from '../lib/supabase'
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
  const { user } = useAuth()
  const [overrides, setOverrides] = useState<RateOverrides>(() => (mode === 'demo' ? readDemo() : {}))

  useEffect(() => {
    if (mode === 'account') setOverrides((user?.user_metadata?.rates as RateOverrides | undefined) ?? {})
  }, [mode, user])

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
      const { error } = await supabase.auth.updateUser({ data: { rates: diff } })
      if (error) throw new Error(error.message)
      setOverrides(diff)
    },
    [mode],
  )

  return { rates, customised, save }
}
