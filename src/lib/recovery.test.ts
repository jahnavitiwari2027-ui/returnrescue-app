import { describe, expect, it } from 'vitest'
import { calculateRecovery, eligibleRoutes } from './recovery'
import { computeStats, deriveInsights } from './insights'
import { emptyReturnInput, type ReturnItem } from './types'

const base = {
  ...emptyReturnInput(),
  category: 'Footwear' as const,
  original_price: 2999,
  resale_price: 2799,
  refurb_resale_price: 2399,
  selling_fee_pct: 20,
  refurb_cost: 150,
  handling_cost: 80,
  liquidation_price: 900,
  liquidation_fee: 50,
  recycling_value: 40,
  recycling_cost: 30,
  return_shipping_cost: 120,
}

describe('calculateRecovery', () => {
  it('computes each route net without double counting', () => {
    const r = calculateRecovery({ ...base, grade: 'A' })
    const byRoute = Object.fromEntries(r.routes.map((x) => [x.route, x.net]))
    expect(byRoute.restock).toBe(2799 - 559.8 - 80) // 2159.2
    expect(byRoute.refurbish).toBe(2399 - 479.8 - 150 - 80) // 1689.2
    expect(byRoute.liquidate).toBe(900 - 50 - 80) // 770
    expect(byRoute.recycle).toBe(10)
    expect(r.recommended).toBe('restock')
    expect(r.sunkCost).toBe(120)
    // sunk return shipping must not appear in any route
    for (const route of r.routes) expect(route.lines.some((l) => /return/i.test(l.label))).toBe(false)
  })

  it('restricts routes by grade', () => {
    expect(calculateRecovery({ ...base, grade: 'B' }).recommended).toBe('refurbish')
    expect(calculateRecovery({ ...base, grade: 'C' }).recommended).toBe('liquidate')
    const mr = calculateRecovery({ ...base, grade: 'MANUAL_REVIEW' })
    expect(mr.recommended).toBeNull()
    expect(mr.routes.every((x) => !x.eligible)).toBe(true)
  })

  it('applies hygiene rules unless the seal is intact', () => {
    expect(eligibleRoutes('A', 'Innerwear & swimwear', false)).toEqual(['liquidate', 'recycle'])
    expect(eligibleRoutes('A', 'Innerwear & swimwear', true)).toContain('restock')
  })

  it('ignores routes with no estimate and warns', () => {
    const r = calculateRecovery({ ...base, grade: 'A', resale_price: 0, refurb_resale_price: 0 })
    expect(r.recommended).toBe('liquidate')
    expect(r.warnings.join(' ')).toMatch(/No estimate entered/)
  })

  it('flags least-loss when every route is negative', () => {
    const r = calculateRecovery({
      ...emptyReturnInput(),
      grade: 'C',
      liquidation_price: 50,
      liquidation_fee: 40,
      handling_cost: 100,
      recycling_cost: 60,
    })
    expect(r.recommended).toBe('recycle')
    expect(r.recommendedNet).toBe(-60)
    expect(r.warnings.join(' ')).toMatch(/least-loss/)
  })

  it('is provisional without a grade', () => {
    const r = calculateRecovery({ ...base, grade: null })
    expect(r.provisional).toBe(true)
    expect(r.recommended).toBe('restock')
  })
})

describe('computeStats', () => {
  const mk = (over: Partial<ReturnItem>): ReturnItem => ({
    ...base,
    id: Math.random().toString(36),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  })
  it('derives counts and values from records only', () => {
    const items = [
      mk({ status: 'awaiting_inspection' }),
      mk({ status: 'inspected', grade: 'B', defects: [{ type: 'packaging_damage', description: '', severity: 'minor', source: 'manual' }] }),
      mk({ status: 'decided', grade: 'A', decision_route: 'liquidate', recommended_route: 'restock', decision_net: 770 }),
      mk({ status: 'completed', grade: 'C', decision_route: 'liquidate', recommended_route: 'liquidate', decision_net: 770, realized_amount: 800 }),
    ]
    const s = computeStats(items)
    expect(s.total).toBe(4)
    expect(s.awaitingInspection).toBe(1)
    expect(s.inspected).toBe(3)
    expect(s.decided).toBe(1)
    expect(s.completed).toBe(1)
    expect(s.overrides).toBe(1)
    expect(s.realizedTotal).toBe(800)
    expect(s.estimatedRecoverable).toBe(770 + 770 + 1689.2)
    expect(s.defects[0].type).toBe('packaging_damage')
    expect(deriveInsights(s).length).toBeGreaterThan(2)
  })
  it('returns nothing for an empty workspace', () => {
    const s = computeStats([])
    expect(s.total).toBe(0)
    expect(deriveInsights(s)).toEqual([])
  })
})
