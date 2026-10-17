import { describe, expect, it } from 'vitest'
import { applyGuardrails, minimumGrade } from '../src/lib/grading'
import { DEFAULT_RATES, diffRates, estimateFromRates, ratesPatch, resolveRates } from '../src/lib/rates'
import { calculateRecovery } from '../src/lib/recovery'
import { emptyReturnInput } from '../src/lib/types'

const shoe = { category: 'Footwear' as const, original_price: 2999 }

describe('rate card estimates', () => {
  it('never produces a value without a traceable line', () => {
    const e = estimateFromRates({ ...shoe, grade: 'B', defects: [{ type: 'scuff_or_scratch', severity: 'moderate' }] })
    for (const [field, value] of Object.entries(e.values)) {
      const lines = e.notes[field as keyof typeof e.notes] ?? []
      if (field === 'selling_fee_pct') expect(lines[0].amount).toBe(value)
      else expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(value)
      for (const l of lines) expect(l.text.length).toBeGreaterThan(3)
    }
  })

  it('prices each defect from the published service list', () => {
    const e = estimateFromRates({ ...shoe, grade: 'B', defects: [{ type: 'sole_wear', severity: 'moderate' }] })
    // re-inspection 5 min at ₹89/h (₹7) + sole pasting ₹349
    expect(e.values.refurb_cost).toBe(7 + 349)
    expect(e.notes.refurb_cost!.find((l) => /Sole pasting/.test(l.text))!.source).toBe('shoe')
  })

  it('charges one professional clean for several issues it fixes, and repeats a defect type once', () => {
    const e = estimateFromRates({
      category: 'Ethnic wear', original_price: 2499, grade: 'B',
      defects: [{ type: 'stain', severity: 'moderate' }, { type: 'odor_reported', severity: 'minor' }, { type: 'stain', severity: 'minor' }],
    })
    expect(e.notes.refurb_cost!.filter((l) => /Professional cleaning/.test(l.text))).toHaveLength(1)
    expect(e.values.refurb_cost).toBe(7 + 199)
  })

  it('marks unrepairable damage and leaves refurbish out', () => {
    const e = estimateFromRates({ ...shoe, grade: 'C', defects: [{ type: 'signs_of_use', severity: 'major' }] })
    expect(e.unfixable).toHaveLength(1)
    expect(e.values.refurb_resale_price).toBe(0)
  })

  it('applies marketplace fee bands and GST', () => {
    expect(estimateFromRates({ category: 'Topwear', original_price: 999, grade: 'A', defects: [] }).values.selling_fee_pct).toBe(0)
    expect(estimateFromRates({ category: 'Topwear', original_price: 1999, grade: 'A', defects: [] }).values.selling_fee_pct).toBe(24.78) // 21% × 1.18
    const own = resolveRates({ channel: 'own_site' })
    expect(estimateFromRates({ category: 'Topwear', original_price: 1999, grade: 'A', defects: [] }, own).values.selling_fee_pct).toBe(2.36)
  })

  it('liquidation depends on grade and carries no per-order handling', () => {
    const c = estimateFromRates({ ...shoe, grade: 'C', defects: [{ type: 'sole_wear', severity: 'major' }] })
    expect(c.values.liquidation_price).toBe(300) // 10% of 2999
    const calc = calculateRecovery({ ...emptyReturnInput(), ...shoe, ...c.values, grade: 'C' })
    const liq = calc.routes.find((r) => r.route === 'liquidate')!
    expect(liq.lines.some((l) => l.field === 'handling_cost')).toBe(false)
    expect(liq.net).toBe(300 - c.values.liquidation_fee)
  })
})

describe('applying the rate card to a return', () => {
  const est = estimateFromRates({ ...shoe, grade: 'B', defects: [] })
  it('fills empty routes and labels them', () => {
    const p = ratesPatch({ ...emptyReturnInput(), ...shoe }, est)
    expect(p.resale_price).toBe(2999)
    expect(p.value_basis).toMatchObject({ restock: 'rates', refurbish: 'rates', liquidate: 'rates', recycle: 'rates', costs: 'rates' })
  })
  it('never overwrites your own price or a quote', () => {
    const item = { ...emptyReturnInput(), ...shoe, liquidation_price: 1200, resale_price: 2500, value_basis: { liquidate: 'quote' as const, restock: 'estimate' as const } }
    const p = ratesPatch(item, est)
    expect(p.liquidation_price).toBeUndefined()
    expect(p.resale_price).toBeUndefined()
    expect(p.value_basis!.liquidate).toBe('quote')
  })
  it('replaces older AI values only when asked', () => {
    const item = { ...emptyReturnInput(), ...shoe, refurb_resale_price: 2000, refurb_cost: 400, selling_fee_pct: 5, value_basis: { refurbish: 'ai' as const } }
    expect(ratesPatch(item, est).refurb_cost).toBeUndefined()
    const p = ratesPatch(item, est, { replaceAi: true })
    expect(p.refurb_cost).toBe(est.values.refurb_cost)
    expect(p.selling_fee_pct).toBe(est.values.selling_fee_pct)
  })
})

describe('rate overrides', () => {
  it('ignores malformed or out-of-range values', () => {
    const r = resolveRates({ labour_per_hour: -5, refurb_resale_pct: 140, referral_pct: { Topwear: 'x', Footwear: 12 }, channel: 'moon' })
    expect(r.labour_per_hour).toBe(DEFAULT_RATES.labour_per_hour)
    expect(r.refurb_resale_pct).toBe(DEFAULT_RATES.refurb_resale_pct)
    expect(r.referral_pct.Topwear).toBe(DEFAULT_RATES.referral_pct.Topwear)
    expect(r.referral_pct.Footwear).toBe(12)
    expect(r.channel).toBe('marketplace')
  })
  it('stores only what differs from the defaults', () => {
    const r = resolveRates({})
    r.services.shoe_clean = 299
    r.liquidation_pct.C = 8
    expect(diffRates(r)).toEqual({ services: { shoe_clean: 299 }, liquidation_pct: { C: 8 } })
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
    const g = applyGuardrails({ ...base, proposed: 'A', defects: [] })
    expect(g).toEqual({ grade: 'A', notes: [], changed: false })
    expect(minimumGrade('Footwear', [{ type: 'sole_wear', severity: 'moderate' }]).grade).toBe('B')
  })
})
