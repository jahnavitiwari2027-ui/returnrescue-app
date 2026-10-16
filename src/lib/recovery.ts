// Deterministic recovery-value engine. No AI involved: every number here comes
// from the user's own estimates, and every rule is spelled out so the result can
// be explained line by line.

import {
  HYGIENE_SENSITIVE,
  ROUTES,
  ROUTE_LABEL,
  type Grade,
  type ReturnItem,
  type RouteKey,
  type ValueBasis,
} from './types'

export type RecoveryInputs = Pick<
  ReturnItem,
  | 'category'
  | 'original_price'
  | 'seal_intact'
  | 'resale_price'
  | 'refurb_resale_price'
  | 'selling_fee_pct'
  | 'refurb_cost'
  | 'handling_cost'
  | 'liquidation_price'
  | 'liquidation_fee'
  | 'recycling_value'
  | 'recycling_cost'
  | 'return_shipping_cost'
  | 'value_basis'
  | 'grade'
>

export interface BreakdownLine {
  label: string
  amount: number // positive = money in, negative = money out
}

export interface RouteResult {
  route: RouteKey
  label: string
  gross: number
  lines: BreakdownLine[]
  net: number
  /** Whether the user has supplied the inputs this route needs. */
  configured: boolean
  eligible: boolean
  ineligibleReason: string | null
  basis: ValueBasis
  recoveryRate: number | null // net / original price
}

export interface RecoveryResult {
  routes: RouteResult[]
  recommended: RouteKey | null
  recommendedNet: number | null
  explanation: string
  warnings: string[]
  sunkCost: number
  provisional: boolean // true when no grade has been set yet
}

const round2 = (n: number) => Math.round(n * 100) / 100
const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

/** Routes a grade allows, before hygiene rules. */
export const GRADE_ELIGIBILITY: Record<Grade, RouteKey[]> = {
  A: ['restock', 'refurbish', 'liquidate', 'recycle'],
  B: ['refurbish', 'liquidate', 'recycle'],
  C: ['liquidate', 'recycle'],
  MANUAL_REVIEW: [],
}

export function eligibleRoutes(grade: Grade | null, category: string, sealIntact: boolean): RouteKey[] {
  let routes = grade ? [...GRADE_ELIGIBILITY[grade]] : [...ROUTES]
  if (HYGIENE_SENSITIVE.includes(category as never) && !sealIntact) {
    routes = routes.filter((r) => r !== 'restock' && r !== 'refurbish')
  }
  return routes
}

function ineligibleReason(route: RouteKey, grade: Grade | null, category: string, sealIntact: boolean): string | null {
  if (grade === 'MANUAL_REVIEW') return 'Grade is Manual review — a person must grade the item first.'
  if (grade && !GRADE_ELIGIBILITY[grade].includes(route)) {
    return `Not allowed for Grade ${grade}.`
  }
  if (
    (route === 'restock' || route === 'refurbish') &&
    HYGIENE_SENSITIVE.includes(category as never) &&
    !sealIntact
  ) {
    return 'Hygiene-sensitive category: resale needs a confirmed intact seal.'
  }
  return null
}

export function calculateRecovery(input: RecoveryInputs): RecoveryResult {
  const fee = Math.min(Math.max(num(input.selling_fee_pct), 0), 100) / 100
  const handling = num(input.handling_cost)
  const original = num(input.original_price)
  const basis = input.value_basis ?? {}
  const grade = input.grade
  const allowed = eligibleRoutes(grade, input.category, input.seal_intact)

  const build = (route: RouteKey): RouteResult => {
    let gross = 0
    const lines: BreakdownLine[] = []
    let configured = false

    if (route === 'restock') {
      gross = num(input.resale_price)
      configured = gross > 0
      lines.push({ label: 'Expected resale price', amount: gross })
      if (fee) lines.push({ label: `Channel / marketplace fee (${round2(fee * 100)}%)`, amount: -gross * fee })
      if (handling) lines.push({ label: 'Handling & outbound shipping', amount: -handling })
    } else if (route === 'refurbish') {
      gross = num(input.refurb_resale_price)
      configured = gross > 0
      lines.push({ label: 'Expected resale price after repackaging / refurbishment', amount: gross })
      if (fee) lines.push({ label: `Channel / marketplace fee (${round2(fee * 100)}%)`, amount: -gross * fee })
      if (input.refurb_cost) lines.push({ label: 'Repair / repackaging cost', amount: -num(input.refurb_cost) })
      if (handling) lines.push({ label: 'Handling & outbound shipping', amount: -handling })
    } else if (route === 'liquidate') {
      gross = num(input.liquidation_price)
      configured = gross > 0
      lines.push({ label: 'Liquidation price', amount: gross })
      if (input.liquidation_fee) lines.push({ label: 'Liquidation fee / commission', amount: -num(input.liquidation_fee) })
      if (handling) lines.push({ label: 'Handling & outbound shipping', amount: -handling })
    } else {
      gross = num(input.recycling_value)
      configured = gross > 0 || num(input.recycling_cost) > 0
      lines.push({ label: 'Recycling / salvage value', amount: gross })
      if (input.recycling_cost) lines.push({ label: 'Recycling / disposal cost (all-in)', amount: -num(input.recycling_cost) })
    }

    const roundedLines = lines.map((l) => ({ ...l, amount: round2(l.amount) }))
    const net = round2(roundedLines.reduce((s, l) => s + l.amount, 0))
    const reason = ineligibleReason(route, grade, input.category, input.seal_intact)
    return {
      route,
      label: ROUTE_LABEL[route],
      gross: round2(gross),
      lines: roundedLines,
      net,
      configured,
      eligible: allowed.includes(route) && reason === null,
      ineligibleReason: reason,
      basis: basis[route] ?? 'estimate',
      recoveryRate: original > 0 ? net / original : null,
    }
  }

  const routes = ROUTES.map(build)
  const warnings: string[] = []
  const candidates = routes.filter((r) => r.eligible && r.configured)

  const missing = routes.filter((r) => r.eligible && !r.configured)
  if (missing.length) {
    warnings.push(
      `No estimate entered for: ${missing.map((r) => r.label).join(', ')}. ${missing.length > 1 ? 'These routes are' : 'This route is'} left out of the comparison.`,
    )
  }

  let recommended: RouteResult | null = null
  for (const r of candidates) {
    // ROUTES order is the tie-break: keep the higher-value circular route on equal net.
    if (!recommended || r.net > recommended.net) recommended = r
  }

  let explanation: string
  if (grade === 'MANUAL_REVIEW') {
    explanation = 'This item is marked for manual review, so no route is recommended until a person grades it.'
  } else if (!recommended) {
    explanation = 'Enter at least one estimate for an eligible route to get a recommendation.'
  } else {
    const others = candidates.filter((r) => r.route !== recommended!.route).sort((a, b) => b.net - a.net)
    const runnerUp = others[0]
    explanation =
      `${recommended.label} has the highest estimated net recovery among eligible routes (₹${fmt(recommended.net)})` +
      (runnerUp ? `, ₹${fmt(recommended.net - runnerUp.net)} more than ${runnerUp.label.toLowerCase()} (₹${fmt(runnerUp.net)}).` : '.')
    if (recommended.net < 0) {
      warnings.push('Every eligible route loses money on current estimates; the recommendation is the least-loss option.')
    }
    if (recommended.basis === 'estimate') {
      explanation += ' This is based on your estimates, not a confirmed offer.'
    } else if (recommended.basis === 'ai') {
      explanation += ' This uses AI-suggested estimates — check them against your real channel prices before acting.'
    } else {
      explanation += ' The recommended route uses a third-party quote you recorded.'
    }
  }
  if (!grade) {
    warnings.push('Item has no condition grade yet — the comparison is provisional and treats all routes as eligible.')
  }

  return {
    routes,
    recommended: grade === 'MANUAL_REVIEW' ? null : recommended?.route ?? null,
    recommendedNet: grade === 'MANUAL_REVIEW' ? null : recommended?.net ?? null,
    explanation,
    warnings,
    sunkCost: round2(num(input.return_shipping_cost)),
    provisional: !grade,
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}
