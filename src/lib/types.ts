// Shared domain types. Also imported by Netlify Functions, so keep this file
// free of browser-only APIs.

export const CATEGORIES = [
  'Topwear',
  'Bottomwear',
  'Ethnic wear',
  'Dresses',
  'Activewear',
  'Innerwear & swimwear',
  'Footwear',
  'Bags & accessories',
] as const
export type Category = (typeof CATEGORIES)[number]

/** Categories where hygiene rules block restock / refurbish unless a sealed pack is confirmed. */
export const HYGIENE_SENSITIVE: Category[] = ['Innerwear & swimwear']

export const RETURN_REASONS = [
  'Size / fit issue',
  'Changed mind',
  'Defective / damaged on arrival',
  'Not as described',
  'Wrong item delivered',
  'Late delivery',
  'Quality not as expected',
  'Other',
] as const

export type Grade = 'A' | 'B' | 'C' | 'MANUAL_REVIEW'
export const GRADES: Grade[] = ['A', 'B', 'C', 'MANUAL_REVIEW']

export type RouteKey = 'restock' | 'refurbish' | 'liquidate' | 'recycle'
export const ROUTES: RouteKey[] = ['restock', 'refurbish', 'liquidate', 'recycle']

export type ReturnStatus = 'awaiting_inspection' | 'inspected' | 'decided' | 'completed'

export const DEFECT_TYPES = [
  'packaging_damage',
  'missing_tags',
  'stain',
  'discoloration',
  'tear_or_hole',
  'loose_stitching',
  'creasing',
  'pilling_or_wear',
  'sole_wear',
  'scuff_or_scratch',
  'hardware_damage',
  'odor_reported',
  'signs_of_use',
  'other',
] as const
export type DefectType = (typeof DEFECT_TYPES)[number]

export type Severity = 'minor' | 'moderate' | 'major'

export interface Defect {
  type: DefectType
  description: string
  location?: string
  severity: Severity
  /** 'ai' = taken from an accepted AI inspection; 'manual' = recorded by a person. */
  source: 'ai' | 'manual'
}

/** Raw output of one AI inspection run. Stored verbatim for auditability. */
export interface AIInspection {
  model: string
  created_at: string
  image_count: number
  image_quality: 'good' | 'limited' | 'unusable'
  product_match: 'matches' | 'unclear' | 'mismatch'
  summary: string
  defects: Omit<Defect, 'source'>[]
  proposed_grade: Grade
  grade_rationale: string
  confidence: 'low' | 'medium' | 'high'
  limitations: string[]
  recommended_physical_checks: string[]
  eligible_routes: RouteKey[]
  /** Rough recovery values suggested by the AI (INR, per unit). Always editable; labelled as AI estimates. */
  suggested_estimates?: SuggestedEstimates | null
}

export interface SuggestedEstimates {
  resale_price: number
  refurb_resale_price: number
  refurb_cost: number
  liquidation_price: number
  liquidation_fee: number
  recycling_value: number
  recycling_cost: number
  selling_fee_pct: number
  handling_cost: number
  rationale: string
}

export type ValueBasis = 'estimate' | 'quote' | 'ai'

export interface ReturnItem {
  id: string
  created_at: string
  updated_at: string
  is_sample?: boolean

  name: string
  sku: string
  category: Category
  original_price: number
  return_reason: string
  condition_notes: string
  photos: string[] // storage paths (account) or data/static URLs (demo)
  seal_intact: boolean

  // Recovery inputs (all INR, per unit)
  resale_price: number
  refurb_resale_price: number
  selling_fee_pct: number
  refurb_cost: number
  handling_cost: number
  liquidation_price: number
  liquidation_fee: number
  recycling_value: number
  recycling_cost: number
  /** Already spent getting the item back. Shown for P&L but excluded from the decision (sunk). */
  return_shipping_cost: number
  value_basis: Partial<Record<RouteKey, ValueBasis>>

  // Inspection
  status: ReturnStatus
  ai_inspection: AIInspection | null
  grade: Grade | null
  grade_source: 'ai_accepted' | 'ai_corrected' | 'manual' | null
  grade_note: string
  defects: Defect[]

  // Decision
  decision_route: RouteKey | null
  decision_net: number | null
  recommended_route: RouteKey | null
  decision_reason: string
  decided_at: string | null
  realized_amount: number | null
  completed_at: string | null
}

export type ReturnInput = Omit<ReturnItem, 'id' | 'created_at' | 'updated_at'>

export const ROUTE_LABEL: Record<RouteKey, string> = {
  restock: 'Restock & resell',
  refurbish: 'Repackage / refurbish',
  liquidate: 'Liquidate',
  recycle: 'Recycle / dispose',
}

export const GRADE_LABEL: Record<Grade, string> = {
  A: 'Grade A',
  B: 'Grade B',
  C: 'Grade C',
  MANUAL_REVIEW: 'Manual review',
}

export const GRADE_DESCRIPTION: Record<Grade, string> = {
  A: 'No visible defects; appears unused. Restock-eligible after physical checks.',
  B: 'Minor cosmetic issues fixable by repackaging, cleaning, pressing or re-tagging.',
  C: 'Significant defects not economically fixable for full-price resale.',
  MANUAL_REVIEW: 'Photos are insufficient or something needs a person to check before grading.',
}

/** Plain-language meaning of each grade and what it allows. */
export const GRADE_GUIDE: Record<Grade, { short: string; meaning: string; allows: string }> = {
  A: { short: 'Like new', meaning: 'No visible damage and looks unused.', allows: 'Can go straight back to stock (after a quick hand check).' },
  B: { short: 'Minor, fixable issues', meaning: 'Small cosmetic problems — a scuff, crease, missing tag or damaged box.', allows: 'Clean, repair or repackage, then resell. Not sold as new.' },
  C: { short: 'Significant damage', meaning: 'Tears, permanent stains, heavy wear or broken parts — not worth fixing for full price.', allows: 'Liquidate or recycle.' },
  MANUAL_REVIEW: { short: 'Needs a person', meaning: 'The photos can’t settle it — unclear images, a possible mismatch, or hygiene, odour or authenticity questions.', allows: 'No option is recommended until someone checks it and sets a grade.' },
}

export const STATUS_LABEL: Record<ReturnStatus, string> = {
  awaiting_inspection: 'Awaiting inspection',
  inspected: 'Inspected',
  decided: 'Decision made',
  completed: 'Completed',
}

export const DEFECT_LABEL: Record<DefectType, string> = {
  packaging_damage: 'Packaging damage',
  missing_tags: 'Missing tags',
  stain: 'Stain',
  discoloration: 'Discoloration / fading',
  tear_or_hole: 'Tear or hole',
  loose_stitching: 'Loose stitching',
  creasing: 'Creasing / wrinkles',
  pilling_or_wear: 'Pilling or fabric wear',
  sole_wear: 'Sole wear',
  scuff_or_scratch: 'Scuff or scratch',
  hardware_damage: 'Zip / button / buckle damage',
  odor_reported: 'Odour reported',
  signs_of_use: 'Signs of use',
  other: 'Other',
}

export function emptyReturnInput(): ReturnInput {
  return {
    name: '',
    sku: '',
    category: 'Topwear',
    original_price: 0,
    return_reason: RETURN_REASONS[0],
    condition_notes: '',
    photos: [],
    seal_intact: false,
    resale_price: 0,
    refurb_resale_price: 0,
    selling_fee_pct: 0,
    refurb_cost: 0,
    handling_cost: 0,
    liquidation_price: 0,
    liquidation_fee: 0,
    recycling_value: 0,
    recycling_cost: 0,
    return_shipping_cost: 0,
    value_basis: {},
    status: 'awaiting_inspection',
    ai_inspection: null,
    grade: null,
    grade_source: null,
    grade_note: '',
    defects: [],
    decision_route: null,
    decision_net: null,
    recommended_route: null,
    decision_reason: '',
    decided_at: null,
    realized_amount: null,
    completed_at: null,
  }
}
