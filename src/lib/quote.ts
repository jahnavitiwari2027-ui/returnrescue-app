// Prices a hypothetical return with the real engine and the published default rate card.
// Used by the public calculator and the returns-cost report, so both match the product exactly.

import { DEFAULT_RATES, estimateFromRates, estimateInputFor, ratesPatch, type PlatformKey } from './rates'
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
