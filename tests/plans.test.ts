import { describe, expect, it } from 'vitest'
import { activePlan, AI_INSPECTIONS, AI_SUMMARIES, PRICE, planForProduct, PRODUCT_ENV, yearlyPerMonth, yearlySaving } from '../src/lib/plans'

describe('plans', () => {
  it('prices and the yearly saving shown on the site', () => {
    expect(PRICE).toEqual({ starter: { month: 499, year: 5388 }, pro: { month: 999, year: 10788 } })
    expect(yearlySaving('starter')).toBe(600)
    expect(yearlySaving('pro')).toBe(1200)
    expect(yearlyPerMonth('starter')).toBe(449)
    expect(yearlyPerMonth('pro')).toBe(899)
  })

  it('limits: Starter 100 AI inspections, no AI summaries; Pro 300 with summaries', () => {
    expect(AI_INSPECTIONS).toEqual({ starter: 100, pro: 300 })
    expect(AI_SUMMARIES).toEqual({ starter: false, pro: true })
  })

  it('only an active Starter or Pro row counts as paid', () => {
    expect(activePlan({ plan: 'pro', status: 'active' })).toBe('pro')
    expect(activePlan({ plan: 'starter', status: 'active' })).toBe('starter')
    expect(activePlan({ plan: 'pro', status: 'cancelled' })).toBeNull()
    expect(activePlan({ plan: 'pro', status: 'on_hold' })).toBeNull()
    expect(activePlan({ plan: 'free', status: 'active' })).toBeNull()
    expect(activePlan(null)).toBeNull()
  })

  it('maps each configured Dodo product to its plan and billing period; anything else is ignored', () => {
    const ids: Record<string, string> = {
      [PRODUCT_ENV.starter.month]: 'pdt_sm',
      [PRODUCT_ENV.starter.year]: 'pdt_sy',
      [PRODUCT_ENV.pro.month]: 'pdt_pm',
      [PRODUCT_ENV.pro.year]: 'pdt_py',
    }
    const read = (n: string) => ids[n]
    expect(planForProduct('pdt_sm', read)).toEqual({ plan: 'starter', interval: 'month' })
    expect(planForProduct('pdt_sy', read)).toEqual({ plan: 'starter', interval: 'year' })
    expect(planForProduct('pdt_pm', read)).toEqual({ plan: 'pro', interval: 'month' })
    expect(planForProduct('pdt_py', read)).toEqual({ plan: 'pro', interval: 'year' })
    expect(planForProduct('pdt_other', read)).toBeNull()
    expect(planForProduct(undefined, read)).toBeNull()
    // Pro monthly keeps the env var name it always had.
    expect(PRODUCT_ENV.pro.month).toBe('DODO_PRO_PRODUCT_ID')
  })
})
