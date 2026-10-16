import type { ReturnItem } from '../../../src/lib/types'

const NUMERIC = [
  'original_price', 'resale_price', 'refurb_resale_price', 'selling_fee_pct', 'refurb_cost', 'handling_cost',
  'liquidation_price', 'liquidation_fee', 'recycling_value', 'recycling_cost', 'return_shipping_cost',
]

export function normalizeRow(row: Record<string, unknown>): ReturnItem {
  const r = { ...row }
  for (const k of NUMERIC) r[k] = Number(r[k] ?? 0)
  for (const k of ['decision_net', 'realized_amount']) r[k] = r[k] == null ? null : Number(r[k])
  r.photos = r.photos ?? []
  r.defects = r.defects ?? []
  r.value_basis = r.value_basis ?? {}
  return r as unknown as ReturnItem
}
