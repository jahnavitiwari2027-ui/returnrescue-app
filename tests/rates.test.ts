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
  estimateInputFor,
  PLATFORMS,
  sanitizeSale,
  type EstimateField,
} from '../src/lib/rates'
import { learnFromResults } from '../src/lib/learn'
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
      for (const [platform, registered] of PLATFORMS.flatMap((p) => [[p, true], [p, false]] as const)) {
        const e = estimateFromRates({ ...c, sale: { platform } }, registered ? DEFAULT_RATES : resolveRates({ gst_registered: false }))
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
    const own = resolveRates({ gst_registered: false, default_sale: { platform: 'own_site' } })
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
    expect(ratesPatch(decided, estimateFromRates({ ...shoe, grade: 'B', defects: [] }, resolveRates({ refurb_resale_pct: 40 })))).toEqual({})
    expect(ratesPatch(decided, est, { allowDecided: true }).value_basis).toBeDefined()
  })
  it('a rate change updates undecided returns only', () => {
    const open = mkItem({ ...ratesPatch(mkItem(), est), grade: 'B', status: 'inspected' })
    const decided = mkItem({ ...ratesPatch(mkItem(), est), grade: 'B', decision_route: 'refurbish', decision_net: 1500, status: 'decided' })
    const done = mkItem({ ...ratesPatch(mkItem(), est), grade: 'B', decision_route: 'refurbish', status: 'completed', realized_amount: 1400 })
    const own = mkItem({ grade: 'B', resale_price: 2000, value_basis: { restock: 'estimate' }, status: 'inspected' })
    const cheaper = resolveRates({ refurb_resale_pct: 40 })
    const out = repriceable([open, decided, done, own], cheaper)
    expect(out.map((o) => o.item.id)).toEqual([open.id])
    expect(out[0].patch.refurb_resale_price).toBe(1200)
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
    expect(r.default_sale).toEqual({ platform: 'amazon' })
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

const tee = (price: number) => ({ category: 'Topwear' as const, original_price: price, grade: 'A' as const, defects: [] })

describe('platforms', () => {
  it('Amazon.in: Easy Ship closing fee by price band and weight handling by packed weight', () => {
    expect(estimateFromRates(tee(250)).values.handling_cost).toBe(2 + 55 + 5 + 15)
    expect(estimateFromRates(tee(499)).values.handling_cost).toBe(23 + 55 + 5 + 15)
    expect(estimateFromRates(tee(799)).values.handling_cost).toBe(48 + 55 + 5 + 15)
    expect(estimateFromRates(tee(1999)).values.handling_cost).toBe(79 + 55 + 5 + 15)
    expect(estimateFromRates({ ...shoe, grade: 'A', defects: [] }).values.handling_cost).toBe(79 + 75 + 5 + 15) // 1 kg packed
  })

  it('Flipkart: 0% fashion commission, fixed fee, national shipping under 500 g', () => {
    const e = estimateFromRates({ ...tee(1999), sale: { platform: 'flipkart' } })
    expect(e.values.selling_fee_pct).toBe(4.76) // GST share only
    expect(e.values.handling_cost).toBe(22 + 16 + 5 + 15)
    expect(e.notes.handling_cost!.find((l) => /fixed fee/i.test(l.text))!.kind).toBe('assumption')
    // Heavier than 500 g: Flipkart doesn't publish the rate, so a courier estimate, marked as an assumption
    const s2 = estimateFromRates({ ...shoe, grade: 'A', defects: [], sale: { platform: 'flipkart' } })
    const ship = s2.notes.handling_cost!.find((l) => /Flipkart shipping/.test(l.text))!
    expect(ship.amount).toBe(45 + 17)
    expect(ship.kind).toBe('assumption')
  })

  it('Meesho: no commission or fixed fee; shipping deducted at the national midpoint', () => {
    const e = estimateFromRates({ ...tee(499), sale: { platform: 'meesho' } })
    expect(e.values.selling_fee_pct).toBe(4.76)
    expect(e.values.handling_cost).toBe(0 + 73 + 5 + 15)
    expect(estimateFromRates({ ...shoe, grade: 'A', defects: [], sale: { platform: 'meesho' } }).values.handling_cost).toBe(100 + 5 + 15)
  })

  it('own website: payment gateway and courier', () => {
    const e = estimateFromRates({ ...tee(1999), sale: { platform: 'own_site' } })
    expect(e.values.selling_fee_pct).toBe(6.76)
    expect(e.values.handling_cost).toBe(45 + 5 + 15)
  })

  it('a preset the seller picks replaces the weight-based one', () => {
    expect(estimateFromRates({ ...tee(1999), sale: { platform: 'amazon', delivery: 'amz_2kg' } }).values.handling_cost).toBe(79 + 112 + 5 + 15)
    expect(estimateFromRates({ ...tee(1999), sale: { platform: 'meesho', delivery: 'ms_local' } }).values.handling_cost).toBe(40 + 5 + 15)
    // A preset that doesn't exist for this platform falls back to the automatic one
    expect(estimateFromRates({ ...tee(1999), sale: { platform: 'meesho', delivery: 'amz_2kg' } }).values.handling_cost).toBe(73 + 5 + 15)
  })

  it('values the seller sets by hand are used and labelled as theirs', () => {
    const e = estimateFromRates({ ...tee(1999), sale: { platform: 'amazon', gst_pct: 0, commission_pct: 10, fixed_fee: 30, delivery_custom: 60 } })
    expect(e.values.selling_fee_pct).toBe(10)
    expect(e.values.handling_cost).toBe(30 + 60 + 5 + 15)
    for (const l of [...e.notes.selling_fee_pct!.slice(0, 2), ...e.notes.handling_cost!.slice(0, 2)]) expect(l.kind).toBe('business')
    // GST set to 18% on a ₹1,999 shirt
    expect(estimateFromRates({ ...tee(1999), sale: { platform: 'own_site', gst_pct: 18 } }).values.selling_fee_pct).toBe(15.25 + 2)
  })

  it('unregistered sellers pay GST on fixed fees and delivery too', () => {
    const r = resolveRates({ gst_registered: false })
    const e = estimateFromRates({ ...tee(1999), sale: { platform: 'flipkart' } }, r)
    expect(e.values.handling_cost).toBe(Math.round(22 * 1.18) + Math.round(16 * 1.18) + 5 + 15)
  })

  it('a return uses its own platform, else the rate card default', () => {
    const item = mkItem({ category: 'Topwear', original_price: 1999, sale_setup: { platform: 'meesho' } })
    expect(estimateFromRates(estimateInputFor(item)).values.selling_fee_pct).toBe(4.76)
    const legacy = mkItem({ category: 'Topwear', original_price: 1999, sale_setup: null })
    expect(estimateFromRates(estimateInputFor(legacy), resolveRates({ default_sale: { platform: 'own_site' } })).values.selling_fee_pct).toBe(6.76)
  })

  it('reads older saved rate cards', () => {
    const r = resolveRates({ channel: 'own_site', ship_first_500g: { marketplace: 60, own_site: 50 }, ship_extra_500g: 20 })
    expect(r.default_sale).toEqual({ platform: 'own_site' })
    expect(r.courier_first_500g).toBe(50)
    expect(r.courier_extra_500g).toBe(20)
    expect(r.amazon_weight_handling.up_to_500g).toBe(60)
  })

  it('stores and restores a saved default setup, dropping anything malformed', () => {
    const r = resolveRates({})
    r.default_sale = { platform: 'flipkart', fixed_fee: 18, delivery: 'fk_local' }
    expect(diffRates(r)).toEqual({ default_sale: { platform: 'flipkart', fixed_fee: 18, delivery: 'fk_local' } })
    expect(resolveRates(diffRates(r)).default_sale).toEqual(r.default_sale)
    expect(sanitizeSale({ platform: 'ebay' })).toBeNull()
    expect(sanitizeSale({ platform: 'meesho', gst_pct: 40, commission_pct: -1, fixed_fee: 'x', delivery: 'DROP TABLE', delivery_custom: 55 })).toEqual({ platform: 'meesho', delivery_custom: 55 })
  })
})

describe('learning from your own results', () => {
  const sold = (over: Partial<ReturnItem>) =>
    mkItem({ category: 'Topwear', original_price: 1000, status: 'completed', grade: 'B', decision_route: 'liquidate', liquidation_fee: 20, ...over })

  it('needs five completed sales, ignores samples, and suggests the median', () => {
    const four = [100, 120, 130, 140].map((r) => sold({ realized_amount: r }))
    expect(learnFromResults(four, DEFAULT_RATES)).toEqual([{ path: ['liquidation_pct', 'B'], label: 'Liquidation, Grade B', n: 4, suggested: null, current: 15 }])
    const five = [...four, sold({ realized_amount: 500, is_sample: true }), sold({ realized_amount: 160 })]
    // (realized + ₹20 fee) / ₹1,000 → 12, 14, 15, 16, 18 → median 15
    expect(learnFromResults(five, DEFAULT_RATES)[0]).toMatchObject({ n: 5, suggested: 15 })
  })

  it('works back the resale price for refurbished items', () => {
    const items = Array.from({ length: 5 }, () =>
      sold({ decision_route: 'refurbish', realized_amount: 300, refurb_cost: 100, handling_cost: 100, selling_fee_pct: 20 }),
    )
    // (300 + 100 + 100) / 0.8 = 625 → 62.5% of ₹1,000
    expect(learnFromResults(items, DEFAULT_RATES)).toEqual([{ path: ['refurb_resale_pct'], label: 'Repaired items resell at', n: 5, suggested: 62.5, current: 50 }])
  })
})
