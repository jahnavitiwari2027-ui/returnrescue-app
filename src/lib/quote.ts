// Prices a hypothetical return with the real engine and the published default rate card.
// Used by the public calculator and the returns-cost report, so both match the product exactly.

import { DEFAULT_RATES, estimateFromRates, estimateInputFor, ratesPatch, type PlatformKey, type SaleSetup } from './rates'
import { calculateRecovery, type RecoveryResult } from './recovery'
import { emptyReturnInput, type Category, type Defect, type ReturnItem } from './types'

export type Condition = 'A' | 'B' | 'C'

export const CONDITION_LABEL: Record<Condition, string> = {
  A: 'Like new',
  B: 'Minor, fixable issues',
  C: 'Damaged',
}

const d = (type: Defect['type'], severity: Defect['severity'], description: string): Defect => ({ type, severity, description, source: 'manual' })

/** Typical defects for each condition, by kind of product, so repair costs are realistic. */
export function typicalDefects(category: Category, condition: Condition): Defect[] {
  if (condition === 'A') return []
  const shoe = category === 'Footwear'
  const bag = category === 'Bags & accessories'
  if (condition === 'B')
    return shoe
      ? [d('scuff_or_scratch', 'minor', 'Light scuff on the toe'), d('packaging_damage', 'minor', 'Box corner crushed')]
      : bag
        ? [d('scuff_or_scratch', 'minor', 'Light scuff on a corner'), d('missing_tags', 'minor', 'Tag removed')]
        : [d('creasing', 'minor', 'Creased from try-on'), d('missing_tags', 'minor', 'Tag removed')]
  return shoe
    ? [d('sole_wear', 'major', 'Sole worn from use')]
    : bag
      ? [d('hardware_damage', 'major', 'Broken zip')]
      : [d('stain', 'major', 'Stain that won’t lift')]
}

export interface Quote {
  item: ReturnItem
  calc: RecoveryResult
}

/** Prices one return: category, selling price, where it sells and its condition. */
export function quoteReturn(opts: { category: Category; price: number; platform: PlatformKey; condition: Condition; name?: string }): Quote {
  const base: ReturnItem = {
    ...emptyReturnInput(),
    id: 'quote',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    name: opts.name ?? 'Your product',
    category: opts.category,
    original_price: opts.price,
    grade: opts.condition,
    defects: typicalDefects(opts.category, opts.condition),
    sale_setup: { platform: opts.platform },
  } as ReturnItem
  const item = { ...base, ...ratesPatch(base, estimateFromRates(estimateInputFor(base), DEFAULT_RATES)) } as ReturnItem
  return { item, calc: calculateRecovery(item) }
}

/** Values the seller can set by hand on the full calculator, as in the app. */
export const OVERRIDE_FIELDS = [
  ['resale_price', 'Resale price (as-is)'],
  ['refurb_resale_price', 'Resale price after repair'],
  ['refurb_cost', 'Repair & repackaging cost'],
  ['liquidation_price', 'Liquidation price'],
  ['liquidation_fee', 'Liquidation commission & freight'],
  ['recycling_value', 'Scrap value'],
  ['recycling_cost', 'Recycling: sorting & transport'],
] as const
export type OverrideField = (typeof OVERRIDE_FIELDS)[number][0]

/**
 * The full calculator: everything the app's own calculator uses — platform fees, GST rate and
 * delivery set by hand, GST registration, your own prices or quotes for any route, and return
 * shipping already paid (shown, but left out of the decision).
 */
export function quoteFull(opts: {
  category: Category
  price: number
  sale: SaleSetup
  condition: Condition
  gstRegistered: boolean
  overrides: Partial<Record<OverrideField, number>>
  returnShipping: number
}): Quote {
  const rates = { ...DEFAULT_RATES, gst_registered: opts.gstRegistered }
  const base: ReturnItem = {
    ...emptyReturnInput(),
    id: 'quote',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    name: 'Your product',
    category: opts.category,
    original_price: opts.price,
    grade: opts.condition,
    defects: typicalDefects(opts.category, opts.condition),
    sale_setup: opts.sale,
    return_shipping_cost: opts.returnShipping,
  } as ReturnItem
  const item = { ...base, ...ratesPatch(base, estimateFromRates(estimateInputFor(base), rates)), ...opts.overrides } as ReturnItem
  return { item, calc: calculateRecovery(item) }
}
