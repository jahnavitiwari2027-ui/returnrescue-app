import { describe, expect, it } from 'vitest'
import { applyGuardrails, minimumGrade } from '../src/lib/grading'
import {
  DEFAULT_RATES,
  diffRates,
  estimateFromRates,
  goodsGstPct,
  isLocked,
  RATE_SOURCES,
  ratesPatch,
  repriceable,
  resolveRates,
  type EstimateField,
} from '../src/lib/rates'
import { calculateRecovery } from '../src/lib/recovery'
import { emptyReturnInput, type ReturnItem } from '../src/lib/types'

const shoe = { category: 'Footwear' as const, original_price: 2999 }
const mkItem = (over: Partial<ReturnItem> = {}): ReturnItem => ({
  ...emptyReturnInput(),
  ...shoe,
  id: Math.random().toString(36),
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  ...over,
})

describe('every input is traceable and correctly classified', () => {
  const cases = [
    { ...shoe, grade: 'B' as const, defects: [{ type: 'scuff_or_scratch' as const, severity: 'moderate' as const }, { type: 'packaging_damage' as const, severity: 'minor' as const }] },
    { category: 'Ethnic wear' as const, original_price: 2499, grade: 'B' as const, defects: [{ type: 'stain' as const, severity: 'moderate' as const }] },
    { category: 'Topwear' as const, original_price: 799, grade: 'A' as const, defects: [] },
    { category: 'Bags & accessories' as const, original_price: 3499, grade: 'C' as const, defects: [{ type: 'tear_or_hole' as const, severity: 'major' as const }] },
  ]
  for (const c of cases) {
    it(`${c.category} ₹${c.original_price}: lines add up, each has a kind, published ones cite a source`, () => {
      for (const own of [false, true]) {
        const e = estimateFromRates(c, own ? resolveRates({ channel: 'own_site', gst_registered: false }) : DEFAULT_RATES)
        for (const [field, value] of Object.entries(e.values) as [EstimateField, number][]) {
          const lines = e.notes[field] ?? []
          expect(Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100).toBe(value)
          for (const l of lines) {
            expect(['business', 'published', 'assumption']).toContain(l.kind)
            if (l.kind === 'published') expect(l.source && RATE_SOURCES[l.source].url).toMatch(/^https:\/\//)
            // An in-house task time is our estimate, so a line built on one can't be called published.
            if (/\d+ min at/.test(l.text)) expect(l.kind).not.toBe('published')
          }
        }
      }
    })
  }

  it('labels a value the business changed as its own', () => {
    const r = resolveRates({ services: { shoe_clean: 300 } })
    const e = estimateFromRates({ ...shoe, grade: 'B', defects: [{ type: 'scuff_or_scratch', severity: 'moderate' }] }, r)
    const line = e.notes.refurb_cost!.find((l) => /cleaning/i.test(l.text))!
    expect(line.amount).toBe(300)
    expect(line.kind).toBe('business')
  })

  it('every source records an effective or publication date', () => {
    for (const s of Object.values(RATE_SOURCES)) expect(s.effective.length).toBeGreaterThan(3)
  })
})

describe('tax treatment', () => {
  it('uses the 5% / 18% GST slabs for clothing and footwear', () => {
    expect(goodsGstPct('Topwear', 2500)).toBe(5)
    expect(goodsGstPct('Footwear', 2501)).toBe(18)
    expect(goodsGstPct('Bags & accessories', 999)).toBe(18)
  })

  it('registered seller: deducts GST on the sale, claims GST on fees back', () => {
    const t = estimateFromRates({ category: 'Topwear', original_price: 1999, grade: 'A', defects: [] })
    expect(t.values.selling_fee_pct).toBe(25.76) // 4.76 (5/105 of the price) + 21 of the price + 21% referral
    const s = estimateFromRates({ ...shoe, grade: 'A', defects: [] })
    expect(s.values.selling_fee_pct).toBe(23.25) // 15.25 (18/118) + 8%
    expect(estimateFromRates({ category: 'Topwear', original_price: 999, grade: 'A', defects: [] }).values.selling_fee_pct).toBe(4.76)
  })

  it('unregistered seller: no GST deducted on the sale, GST on fees is a cost', () => {
    const r = resolveRates({ gst_registered: false })
    expect(estimateFromRates({ category: 'Topwear', original_price: 1999, grade: 'A', defects: [] }, r).values.selling_fee_pct).toBe(24.78)
    const own = resolveRates({ gst_registered: false, channel: 'own_site' })
    expect(estimateFromRates({ category: 'Topwear', original_price: 1999, grade: 'A', defects: [] }, own).values.selling_fee_pct).toBe(2.36)
    // Amazon's own charges carry GST too when it can't be claimed back
    expect(estimateFromRates({ category: 'Topwear', original_price: 1999, grade: 'A', defects: [] }, r).values.handling_cost).toBeGreaterThan(
      estimateFromRates({ category: 'Topwear', original_price: 1999, grade: 'A', defects: [] }).values.handling_cost,
    )
  })
})

describe('costs are counted once, and nothing is left out', () => {
  it('prices each defect from the service list plus re-inspection labour', () => {
    const e = estimateFromRates({ ...shoe, grade: 'B', defects: [{ type: 'sole_wear', severity: 'moderate' }] })
    expect(e.values.refurb_cost).toBe(9 + 449) // 5 min at ₹103/h + sole pasting
  })

  it('charges one professional clean for several issues it fixes, and repeats a defect type once', () => {
    const e = estimateFromRates({
      category: 'Ethnic wear', original_price: 2499, grade: 'B',
      defects: [{ type: 'stain', severity: 'moderate' }, { type: 'odor_reported', severity: 'minor' }, { type: 'stain', severity: 'minor' }],
    })
    expect(e.notes.refurb_cost!.filter((l) => /Professional cleaning/.test(l.text))).toHaveLength(1)
    expect(e.values.refurb_cost).toBe(9 + 199)
  })

  it('labour includes employer PF and ESI on top of the minimum wage', () => {
    expect(DEFAULT_RATES.labour_per_hour).toBe(Math.round((710 / 8) * 1.1625))
  })

  it('refurbish net = resale after repair − deductions − repair − handling, exactly once each', () => {
    const e = estimateFromRates({ ...shoe, grade: 'B', defects: [{ type: 'scuff_or_scratch', severity: 'moderate' }] })
    const calc = calculateRecovery({ ...emptyReturnInput(), ...shoe, ...e.values, grade: 'B' })
    const r = calc.routes.find((x) => x.route === 'refurbish')!
    const v = e.values
    expect(r.net).toBe(Math.round((v.refurb_resale_price - v.refurb_resale_price * (v.selling_fee_pct / 100) - v.refurb_cost - v.handling_cost) * 100) / 100)
    expect(r.lines.map((l) => l.field)).toEqual(['refurb_resale_price', 'selling_fee_pct', 'refurb_cost', 'handling_cost'])
  })

  it('liquidation is a bulk sale: its own commission and freight, no per-order handling', () => {
    const c = estimateFromRates({ ...shoe, grade: 'C', defects: [{ type: 'sole_wear', severity: 'major' }] })
    expect(c.values.liquidation_price).toBe(300) // 10% of 2999
    const calc = calculateRecovery({ ...emptyReturnInput(), ...shoe, ...c.values, grade: 'C' })
    const liq = calc.routes.find((r) => r.route === 'liquidate')!
    expect(liq.lines.some((l) => l.field === 'handling_cost' || l.field === 'selling_fee_pct')).toBe(false)
    expect(liq.net).toBe(300 - c.values.liquidation_fee)
  })

  it('marks unrepairable damage and leaves refurbish out of the comparison', () => {
    const e = estimateFromRates({ ...shoe, grade: 'C', defects: [{ type: 'signs_of_use', severity: 'major' }] })
    expect(e.unfixable).toHaveLength(1)
    expect(e.values.refurb_resale_price).toBe(0)
    const calc = calculateRecovery({ ...emptyReturnInput(), ...shoe, ...e.values, grade: 'B' })
    expect(calc.routes.find((r) => r.route === 'refurbish')!.configured).toBe(false)
  })

  it('recycling can lose money and is then shown as a loss, not hidden', () => {
    const e = estimateFromRates({ category: 'Topwear', original_price: 999, grade: 'C', defects: [] })
    const calc = calculateRecovery({ ...emptyReturnInput(), category: 'Topwear', original_price: 999, ...e.values, grade: 'C' })
    expect(calc.routes.find((r) => r.route === 'recycle')!.net).toBeLessThan(0)
  })
})

describe('applying the rate card to returns', () => {
  const est = estimateFromRates({ ...shoe, grade: 'B', defects: [] })
  it('fills empty routes and labels them', () => {
    const p = ratesPatch(mkItem(), est)
    expect(p.resale_price).toBe(2999)
    expect(p.value_basis).toMatchObject({ restock: 'rates', refurbish: 'rates', liquidate: 'rates', recycle: 'rates', costs: 'rates' })
  })
  it('never overwrites your own price or a quote', () => {
    const p = ratesPatch(mkItem({ liquidation_price: 1200, resale_price: 2500, value_basis: { liquidate: 'quote', restock: 'estimate' } }), est)
    expect(p.liquidation_price).toBeUndefined()
    expect(p.resale_price).toBeUndefined()
    expect(p.value_basis!.liquidate).toBe('quote')
  })
  it('replaces older AI values only when asked', () => {
    const item = mkItem({ refurb_resale_price: 2000, refurb_cost: 400, selling_fee_pct: 5, value_basis: { refurbish: 'ai' } })
    expect(ratesPatch(item, est).refurb_cost).toBeUndefined()
    expect(ratesPatch(item, est, { replaceAi: true }).refurb_cost).toBe(est.values.refurb_cost)
  })
  it('never reprices a return with a saved decision unless the decision is being cleared', () => {
    const decided = mkItem({ ...ratesPatch(mkItem(), est), decision_route: 'refurbish', decision_net: 1500, status: 'decided' })
    expect(isLocked(decided)).toBe(true)
    expect(ratesPatch(decided, estimateFromRates({ ...shoe, grade: 'B', defects: [] }, resolveRates({ refurb_resale_pct: 50 })))).toEqual({})
    expect(ratesPatch(decided, est, { allowDecided: true }).value_basis).toBeDefined()
  })
  it('a rate change updates undecided returns only', () => {
    const open = mkItem({ ...ratesPatch(mkItem(), est), grade: 'B', status: 'inspected' })
    const decided = mkItem({ ...ratesPatch(mkItem(), est), grade: 'B', decision_route: 'refurbish', decision_net: 1500, status: 'decided' })
    const done = mkItem({ ...ratesPatch(mkItem(), est), grade: 'B', decision_route: 'refurbish', status: 'completed', realized_amount: 1400 })
    const own = mkItem({ grade: 'B', resale_price: 2000, value_basis: { restock: 'estimate' }, status: 'inspected' })
    const cheaper = resolveRates({ refurb_resale_pct: 50 })
    const out = repriceable([open, decided, done, own], cheaper)
    expect(out.map((o) => o.item.id)).toEqual([open.id])
    expect(out[0].patch.refurb_resale_price).toBe(1500)
    expect(repriceable([open], DEFAULT_RATES)).toHaveLength(0) // nothing to change
  })
})

describe('rate overrides', () => {
  it('ignores malformed or out-of-range values', () => {
    const r = resolveRates({ labour_per_hour: -5, refurb_resale_pct: 140, referral_pct: { Topwear: 'x', Footwear: 12 }, channel: 'moon', gst_registered: 'yes' })
    expect(r.labour_per_hour).toBe(DEFAULT_RATES.labour_per_hour)
    expect(r.refurb_resale_pct).toBe(DEFAULT_RATES.refurb_resale_pct)
    expect(r.referral_pct.Topwear).toBe(DEFAULT_RATES.referral_pct.Topwear)
    expect(r.referral_pct.Footwear).toBe(12)
    expect(r.channel).toBe('marketplace')
    expect(r.gst_registered).toBe(true)
  })
  it('stores only what differs from the defaults', () => {
    const r = resolveRates({})
    r.services.shoe_clean = 299
    r.liquidation_pct.C = 8
    r.gst_registered = false
    expect(diffRates(r)).toEqual({ services: { shoe_clean: 299 }, liquidation_pct: { C: 8 }, gst_registered: false })
    expect(resolveRates(diffRates(r)).services.shoe_clean).toBe(299)
  })
})

describe('grade guardrails', () => {
  const base = { category: 'Topwear' as const, image_quality: 'good' as const, product_match: 'matches' as const, confidence: 'high' as const }
  it('rules out Grade A when any defect is visible', () => {
    const g = applyGuardrails({ ...base, proposed: 'A', defects: [{ type: 'creasing', severity: 'minor' }] })
    expect(g.grade).toBe('B')
    expect(g.notes[0]).toMatch(/Changed from Grade A to Grade B/)
  })
  it('requires Grade C for major or unrepairable damage', () => {
    expect(applyGuardrails({ ...base, proposed: 'B', defects: [{ type: 'tear_or_hole', severity: 'major' }] }).grade).toBe('C')
    expect(applyGuardrails({ ...base, proposed: 'B', defects: [{ type: 'discoloration', severity: 'moderate' }] }).grade).toBe('C')
  })
  it('sends odour, unusable photos and mismatches to a person', () => {
    expect(applyGuardrails({ ...base, proposed: 'A', defects: [{ type: 'odor_reported', severity: 'minor' }] }).grade).toBe('MANUAL_REVIEW')
    expect(applyGuardrails({ ...base, proposed: 'B', defects: [], image_quality: 'unusable' }).grade).toBe('MANUAL_REVIEW')
    expect(applyGuardrails({ ...base, proposed: 'A', defects: [], product_match: 'mismatch' }).grade).toBe('MANUAL_REVIEW')
  })
  it('never makes a grade more lenient', () => {
    const g = applyGuardrails({ ...base, proposed: 'C', defects: [{ type: 'creasing', severity: 'minor' }] })
    expect(g.grade).toBe('C')
    expect(g.notes[0]).toMatch(/kept the stricter grade/)
  })
  it('keeps a consistent AI grade unchanged', () => {
    expect(applyGuardrails({ ...base, proposed: 'A', defects: [] })).toEqual({ grade: 'A', notes: [], changed: false })
    expect(minimumGrade('Footwear', [{ type: 'sole_wear', severity: 'moderate' }]).grade).toBe('B')
  })
})
