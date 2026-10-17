// Learn from your own results: once enough returns have been sold through a
// route, the amounts actually received suggest rate-card values. Suggestions
// only — nothing changes until the business applies one and saves.

import type { RateCard } from './rates'
import { GRADE_LABEL, type Grade, type ReturnItem } from './types'

/** Completed sales needed before a suggestion is shown. */
export const MIN_RESULTS = 5

export interface LearnedRate {
  /** Rate-card path the suggestion would set, e.g. ['liquidation_pct', 'B']. */
  path: string[]
  label: string
  /** Completed, non-sample sales behind it. */
  n: number
  /** Median % of the original price; null until there are MIN_RESULTS sales. */
  suggested: number | null
  current: number
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const half = (n: number) => Math.round(n * 2) / 2
const clampPct = (n: number) => Math.min(100, Math.max(0, n))

/** % of the original price each completed sale implies, worked back from the amount received. */
function impliedPct(i: ReturnItem): { key: string; pct: number } | null {
  if (i.is_sample || i.status !== 'completed' || i.realized_amount == null || !(i.original_price > 0)) return null
  if (i.decision_route === 'liquidate' && i.grade) {
    // Received = buyer's price − commission & freight, so add those back.
    return { key: `liq_${i.grade}`, pct: clampPct(((i.realized_amount + i.liquidation_fee) / i.original_price) * 100) }
  }
  if (i.decision_route === 'refurbish' && i.selling_fee_pct < 100) {
    // Received = resale × (1 − fees%) − repairs − handling, so solve for the resale price.
    const resale = (i.realized_amount + i.refurb_cost + i.handling_cost) / (1 - i.selling_fee_pct / 100)
    return { key: 'refurb', pct: clampPct((resale / i.original_price) * 100) }
  }
  return null
}

export function learnFromResults(items: ReturnItem[], rates: RateCard): LearnedRate[] {
  const groups = new Map<string, number[]>()
  for (const i of items) {
    const r = impliedPct(i)
    if (r) groups.set(r.key, [...(groups.get(r.key) ?? []), r.pct])
  }
  const out: LearnedRate[] = []
  const push = (key: string, path: string[], label: string, current: number) => {
    const xs = groups.get(key)
    if (!xs?.length) return
    out.push({ path, label, n: xs.length, suggested: xs.length >= MIN_RESULTS ? half(median(xs)) : null, current })
  }
  push('refurb', ['refurb_resale_pct'], 'Repaired items resell at', rates.refurb_resale_pct)
  for (const g of ['A', 'B', 'C', 'MANUAL_REVIEW'] as Grade[]) {
    push(`liq_${g}`, ['liquidation_pct', g], `Liquidation, ${GRADE_LABEL[g]}`, rates.liquidation_pct[g])
  }
  return out
}
