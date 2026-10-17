// Groups a route's calculator lines into money in / fees / repair / shipping,
// so the UI can show a one-line summary and a proportional bar.

import type { RouteResult } from '../../lib/recovery'

export type GroupKey = 'in' | 'fees' | 'repair' | 'ship'

export const GROUP_META: Record<GroupKey, { label: string; short: string; bar: string; dot: string }> = {
  in: { label: 'Money in', short: 'sale', bar: '', dot: 'bg-brand-600' },
  fees: { label: 'Fees & GST', short: 'fees & GST', bar: 'bg-amber-400', dot: 'bg-amber-400' },
  repair: { label: 'Repair & repackaging', short: 'repair', bar: 'bg-sky-400', dot: 'bg-sky-400' },
  ship: { label: 'Shipping & handling', short: 'shipping', bar: 'bg-slate-400', dot: 'bg-slate-400' },
}

const FIELD_GROUP: Record<string, GroupKey> = {
  resale_price: 'in',
  refurb_resale_price: 'in',
  liquidation_price: 'in',
  recycling_value: 'in',
  selling_fee_pct: 'fees',
  liquidation_fee: 'fees',
  refurb_cost: 'repair',
  handling_cost: 'ship',
  recycling_cost: 'ship',
}

export function groupLabel(route: RouteResult['route'], g: GroupKey) {
  if (route === 'liquidate' && g === 'fees') return 'Commission & bulk freight'
  if (route === 'recycle' && g === 'ship') return 'Sorting & transport'
  if (route === 'recycle' && g === 'in') return 'Scrap value'
  return GROUP_META[g].label
}

export interface Grouped {
  gross: number
  groups: { key: GroupKey; total: number; lines: RouteResult['lines'] }[]
  net: number
}

export function groupRoute(r: RouteResult): Grouped {
  const order: GroupKey[] = ['in', 'fees', 'repair', 'ship']
  const groups = order
    .map((key) => {
      const lines = r.lines.filter((l) => (l.field ? FIELD_GROUP[l.field] : 'in') === key)
      return { key, lines, total: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100 }
    })
    .filter((g) => g.lines.length)
  return { gross: r.gross, groups, net: r.net }
}

/** "₹2,449 sale − ₹347 fees & GST − ₹307 repair − ₹169 shipping" */
export function summaryParts(r: RouteResult): { key: GroupKey; amount: number; label: string }[] {
  return groupRoute(r).groups.map((g) => ({
    key: g.key,
    amount: g.total,
    label: r.route === 'liquidate' && g.key === 'fees' ? 'commission & freight' : r.route === 'recycle' && g.key === 'ship' ? 'sorting & transport' : r.route === 'recycle' && g.key === 'in' ? 'scrap' : GROUP_META[g.key].short,
  }))
}
