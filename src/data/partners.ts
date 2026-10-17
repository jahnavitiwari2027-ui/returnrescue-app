// "My partners": a business's own refurbishers, liquidation buyers, recyclers.
// Demo: stored in this browser. Account: stored on the signed-in user's
// profile (Supabase user metadata), so no extra database table is needed.

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { RouteKey } from '../lib/types'
import type { WorkspaceMode } from './repo'

export interface Partner {
  id: string
  name: string
  kind: RouteKey
  city: string
  phone: string
  email: string
  website: string
  note: string
}

export const MAX_PARTNERS = 30
const DEMO_KEY = 'returnrescue.demo.partners.v1'

// The demo starts empty: real businesses are in the Delhi NCR directory (data/directory.ts).
const DEMO_PARTNERS: Partner[] = []

function readDemo(): Partner[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return JSON.parse(raw) as Partner[]
  } catch {
    /* ignore */
  }
  return DEMO_PARTNERS
}

export function usePartners(mode: WorkspaceMode) {
  const { user } = useAuth()
  const [partners, setPartners] = useState<Partner[]>(() => (mode === 'demo' ? readDemo() : []))

  useEffect(() => {
    if (mode === 'account') setPartners(((user?.user_metadata?.partners as Partner[] | undefined) ?? []).slice(0, MAX_PARTNERS))
  }, [mode, user])

  const save = useCallback(
    async (next: Partner[]) => {
      if (mode === 'demo') {
        try {
          localStorage.setItem(DEMO_KEY, JSON.stringify(next))
        } catch {
          throw new Error('Browser storage is full.')
        }
        setPartners(next)
        return
      }
      if (!supabase) throw new Error('Accounts are not configured.')
      const { error } = await supabase.auth.updateUser({ data: { partners: next } })
      if (error) throw new Error(error.message)
      setPartners(next)
    },
    [mode],
  )

  return {
    partners,
    upsert: (p: Partner) => {
      const exists = partners.some((x) => x.id === p.id)
      if (!exists && partners.length >= MAX_PARTNERS) throw new Error(`You can save up to ${MAX_PARTNERS} partners.`)
      return save(exists ? partners.map((x) => (x.id === p.id ? p : x)) : [...partners, p])
    },
    remove: (id: string) => save(partners.filter((x) => x.id !== id)),
  }
}

export const newPartner = (kind: RouteKey = 'refurbish'): Partner => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
  name: '',
  kind,
  city: '',
  phone: '',
  email: '',
  website: '',
  note: '',
})

export const PARTNER_KIND_LABEL: Record<RouteKey, string> = {
  restock: 'Resale / marketplace',
  refurbish: 'Repair & refurbish',
  liquidate: 'Liquidation buyer',
  recycle: 'Donation & recycling',
}
