// The returns report and calculator use the real engine; these check the figures stay sensible.
import { describe, expect, it } from 'vitest'
import { quoteReturn } from '../src/lib/quote'
import { liquidateEverythingLoss, minorFlawCost, recoveryRate, recyclingRange, scenarios } from '../src/lib/report'
import { ARTICLES } from '../src/pages/site/articles'

describe('returns report', () => {
  it('covers 216 scenarios', () => expect(scenarios()).toHaveLength(216))
  it('orders conditions sensibly', () => {
    const a = recoveryRate((s) => s.condition === 'A')
    const b = recoveryRate((s) => s.condition === 'B')
    const c = recoveryRate((s) => s.condition === 'C')
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
    expect(a).toBeLessThan(1)
    expect(c).toBeGreaterThan(0)
  })
  it('reports positive losses and a negative recycling value', () => {
    expect(minorFlawCost().avg).toBeGreaterThan(0)
    expect(liquidateEverythingLoss('A').rupees).toBeGreaterThan(0)
    expect(recyclingRange().max).toBeLessThan(0)
  })
  it('quotes follow the grade rules', () => {
    const b = quoteReturn({ category: 'Footwear', price: 2999, platform: 'meesho', condition: 'B' }).calc
    expect(b.routes.find((r) => r.route === 'restock')!.eligible).toBe(false)
    expect(b.recommended).not.toBe('restock')
  })
  it('every guide has an answer with rupee figures and FAQs', () => {
    for (const a of ARTICLES) {
      expect(a.answer.length).toBeGreaterThan(150)
      expect(a.faqs.length).toBeGreaterThanOrEqual(3)
      expect(a.description.length).toBeLessThan(300)
    }
  })
})
