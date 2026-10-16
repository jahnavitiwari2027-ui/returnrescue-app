import type { ReturnInput, ReturnItem, RouteKey, SuggestedEstimates } from './types'

type NumField = keyof Omit<SuggestedEstimates, 'rationale'>

const FIELDS: { field: NumField; route: RouteKey | null }[] = [
  { field: 'resale_price', route: 'restock' },
  { field: 'refurb_resale_price', route: 'refurbish' },
  { field: 'refurb_cost', route: 'refurbish' },
  { field: 'liquidation_price', route: 'liquidate' },
  { field: 'liquidation_fee', route: 'liquidate' },
  { field: 'recycling_value', route: 'recycle' },
  { field: 'recycling_cost', route: 'recycle' },
  { field: 'selling_fee_pct', route: null },
  { field: 'handling_cost', route: null },
]

/** True when the user hasn't entered any route values yet. */
export function hasNoEstimates(item: Pick<ReturnItem, 'resale_price' | 'refurb_resale_price' | 'liquidation_price' | 'recycling_value' | 'recycling_cost'>) {
  return !item.resale_price && !item.refurb_resale_price && !item.liquidation_price && !item.recycling_value && !item.recycling_cost
}

/**
 * Patch that fills recovery inputs from AI suggestions.
 * overwrite=false only fills fields that are still 0 and never touches a route the user marked as a third-party quote.
 * Routes filled this way are labelled 'ai' so the UI and calculator say they are AI estimates.
 */
export function aiEstimatePatch(item: ReturnItem, s: SuggestedEstimates, overwrite: boolean): Partial<ReturnInput> {
  const patch: Partial<ReturnInput> = {}
  const basis = { ...(item.value_basis ?? {}) }
  for (const { field, route } of FIELDS) {
    if (route && basis[route] === 'quote') continue
    const current = item[field] as number
    if (overwrite || !current) {
      ;(patch as Record<string, number>)[field] = s[field]
      if (route) basis[route] = 'ai'
    }
  }
  patch.value_basis = basis
  return patch
}

export const BASIS_LABEL = { estimate: 'Your estimate', quote: 'Third-party quote', ai: 'AI estimate' } as const
