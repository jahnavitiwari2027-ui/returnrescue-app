import { describe, expect, it } from 'vitest'
import { AUTO_REASON, aiGradePatch, autoDecision, gradedByAI, inspectionPatch } from './decision'
import { DEFAULT_RATES } from './rates'
import { emptyReturnInput, type AIInspection, type ReturnItem } from './types'

const item = (over: Partial<ReturnItem> = {}): ReturnItem => ({
  ...emptyReturnInput(),
  id: 'x',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  category: 'Footwear',
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
  ...over,
})

const ai = (over: Partial<AIInspection> = {}): AIInspection => ({
  model: 'gemini-3.8-flash',
  created_at: '2026-10-25T00:00:00Z',
  image_count: 1,
  image_quality: 'good',
  product_match: 'matches',
  summary: 'Clean pair.',
  defects: [{ type: 'scuff_or_scratch', description: 'toe', severity: 'minor' }],
  proposed_grade: 'B',
  grade_rationale: '',
  confidence: 'high',
  limitations: [],
  recommended_physical_checks: [],
  eligible_routes: [],
  ...over,
})

describe('automatic grading and decision', () => {
  const now = new Date('2026-10-25T10:00:00Z')

  it('picks the best route for a graded item', () => {
    expect(autoDecision(item({ grade: 'A' }), now)).toEqual({
      decision_route: 'restock',
      decision_net: 2799 - 559.8 - 80,
      recommended_route: 'restock',
      decision_reason: AUTO_REASON,
      decided_at: now.toISOString(),
      status: 'decided',
    })
    expect(autoDecision(item({ grade: 'B' }), now).decision_route).toBe('refurbish')
    expect(autoDecision(item({ grade: 'C' }), now).decision_route).toBe('liquidate')
  })

  it('decides nothing for manual review, no grade, or nothing to compare', () => {
    for (const it of [item({ grade: 'MANUAL_REVIEW' }), item({ grade: null }), item({ grade: 'A', resale_price: 0, refurb_resale_price: 0, liquidation_price: 0, recycling_value: 0, recycling_cost: 0 })]) {
      const d = autoDecision(it, now)
      expect(d.decision_route).toBeNull()
      expect(d.status).toBe('inspected')
    }
  })

  it('saves the AI grade straight away, but not for refusals or manual review', () => {
    expect(aiGradePatch(ai())).toEqual({
      grade: 'B',
      grade_source: 'ai_accepted',
      grade_note: '',
      defects: [{ type: 'scuff_or_scratch', description: 'toe', severity: 'minor', source: 'ai' }],
    })
    expect(aiGradePatch(ai({ proposed_grade: 'MANUAL_REVIEW' })).grade).toBeNull()
    expect(aiGradePatch(ai({ out_of_scope: true, proposed_grade: 'MANUAL_REVIEW' })).grade).toBeNull()
  })

  it('knows when a grade came from the AI', () => {
    expect(gradedByAI(item({ grade: 'B', grade_source: 'ai_accepted', ai_inspection: ai() }))).toBe(true)
    expect(gradedByAI(item({ grade: null, ai_inspection: ai() }))).toBe(true)
    expect(gradedByAI(item({ grade: 'B', grade_source: 'manual' }))).toBe(false)
    expect(gradedByAI(item({ grade: 'B', grade_source: 'ai_corrected', ai_inspection: ai() }))).toBe(false)
  })

  // A new return as the form saves it: only name, category, price and photos.
  const fresh = (over: Partial<ReturnItem> = {}) =>
    ({ ...emptyReturnInput(), id: 'n', created_at: '', updated_at: '', name: 'Shoe', category: 'Footwear', original_price: 2999, photos: ['p.jpg'], ...over }) as ReturnItem

  it('after an AI inspection: saves the grade, prices it from the rate card and picks the best option', () => {
    const p = inspectionPatch(fresh(), ai(), DEFAULT_RATES, now)
    expect(p.grade).toBe('B')
    expect(p.grade_source).toBe('ai_accepted')
    expect(p.status).toBe('decided')
    expect(p.decision_reason).toBe(AUTO_REASON)
    expect(p.refurb_resale_price).toBeGreaterThan(0)
    // The saved decision is exactly what the maths recommends for the saved item.
    const saved = { ...fresh(), ...p } as ReturnItem
    expect(autoDecision(saved, now)).toMatchObject({ decision_route: p.decision_route, decision_net: p.decision_net })
  })

  it('a re-run replaces an earlier grade and decision', () => {
    const before = { ...fresh(), ...inspectionPatch(fresh(), ai({ proposed_grade: 'A', defects: [] }), DEFAULT_RATES, now) } as ReturnItem
    expect(before.decision_route).toBe('restock')
    const after = inspectionPatch(before, ai({ proposed_grade: 'C', defects: [{ type: 'tear_or_hole', description: 'heel', severity: 'major' }] }), DEFAULT_RATES, now)
    expect(after.grade).toBe('C')
    expect(['liquidate', 'recycle']).toContain(after.decision_route)
  })

  it('keeps a quote the user entered', () => {
    const quoted = fresh({ resale_price: 2500, value_basis: { restock: 'quote' } })
    const p = inspectionPatch(quoted, ai({ proposed_grade: 'A', defects: [] }), DEFAULT_RATES, now)
    expect(p.resale_price).toBeUndefined()
    expect(p.value_basis?.restock).toBe('quote')
  })

  it('manual review and refused photos get no decision', () => {
    const mr = inspectionPatch(fresh(), ai({ proposed_grade: 'MANUAL_REVIEW' }), DEFAULT_RATES, now)
    expect(mr).toMatchObject({ grade: null, decision_route: null, status: 'inspected' })
    const refused = inspectionPatch(fresh(), ai({ out_of_scope: true, proposed_grade: 'MANUAL_REVIEW', defects: [] }), DEFAULT_RATES, now)
    expect(refused).toMatchObject({ grade: null, decision_route: null, status: 'awaiting_inspection' })
    expect(refused.resale_price).toBeUndefined()
  })
})
