// "What a return really costs" — every figure is modelled with the real ReturnRescue engine on
// the published default rate card, across a fixed grid of typical Indian fashion returns.
// Nothing here is observed sales data; the report says so.

import { quoteReturn, type Condition } from './quote'
import { PLATFORM_LABEL, PLATFORMS, type PlatformKey } from './rates'
import type { Category, RouteKey } from './types'

export const REPORT_CATEGORIES: Category[] = ['Topwear', 'Bottomwear', 'Ethnic wear', 'Dresses', 'Footwear', 'Bags & accessories']
export const REPORT_PRICES = [799, 1499, 2999]
export const REPORT_CONDITIONS: Condition[] = ['A', 'B', 'C']

export interface Scenario {
  category: Category
  price: number
  platform: PlatformKey
  condition: Condition
  best: RouteKey | null
  bestNet: number
  net: Partial<Record<RouteKey, number>>
}

let cache: Scenario[] | null = null

/** All 216 scenarios: 6 categories × 3 prices × 4 platforms × 3 conditions. */
export function scenarios(): Scenario[] {
  if (cache) return cache
  const out: Scenario[] = []
  for (const category of REPORT_CATEGORIES)
    for (const price of REPORT_PRICES)
      for (const platform of PLATFORMS)
        for (const condition of REPORT_CONDITIONS) {
          const { calc } = quoteReturn({ category, price, platform, condition })
          const net: Partial<Record<RouteKey, number>> = {}
          for (const r of calc.routes) if (r.eligible && r.configured) net[r.route] = r.net
          out.push({ category, price, platform, condition, best: calc.recommended, bestNet: calc.recommendedNet ?? 0, net })
        }
  return (cache = out)
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const share = (s: Scenario) => s.bestNet / s.price

/** Average share of the selling price recovered by the best option. */
export function recoveryRate(filter: (s: Scenario) => boolean) {
  return avg(scenarios().filter(filter).map(share))
}

export function byPlatform(condition: Condition) {
  return PLATFORMS.map((p) => ({ platform: p, label: PLATFORM_LABEL[p], rate: recoveryRate((s) => s.condition === condition && s.platform === p) }))
}

/** What a like-new item recovers on each platform, for one category and price. */
export function samePlatformsCompare(category: Category, price: number) {
  return PLATFORMS.map((p) => {
    const s = scenarios().find((x) => x.category === category && x.price === price && x.platform === p && x.condition === 'A')!
    return { platform: p, label: PLATFORM_LABEL[p], net: s.bestNet }
  })
}

/** Average gap between the best and worst platform for the same like-new item. */
export function platformSpread() {
  const gaps: number[] = []
  for (const c of REPORT_CATEGORIES)
    for (const p of REPORT_PRICES) {
      const v = samePlatformsCompare(c, p).map((x) => x.net)
      gaps.push(Math.max(...v) - Math.min(...v))
    }
  return { avg: avg(gaps), max: Math.max(...gaps) }
}

/** What a small, fixable flaw costs: like-new vs minor-issues, as a share of the price. */
export function minorFlawCost() {
  const drops = scenarios()
    .filter((s) => s.condition === 'B')
    .map((b) => {
      const a = scenarios().find((x) => x.condition === 'A' && x.category === b.category && x.price === b.price && x.platform === b.platform)!
      return (a.bestNet - b.bestNet) / b.price
    })
  return { avg: avg(drops), min: Math.min(...drops), max: Math.max(...drops) }
}

/** Money lost per item by liquidating everything instead of taking the best option. */
export function liquidateEverythingLoss(condition: Condition) {
  const xs = scenarios().filter((s) => s.condition === condition && s.net.liquidate != null)
  return { rupees: avg(xs.map((s) => s.bestNet - (s.net.liquidate ?? 0))), share: avg(xs.map((s) => (s.bestNet - (s.net.liquidate ?? 0)) / s.price)) }
}

/** What recycling or disposal costs per item (it is negative). */
export function recyclingRange() {
  const v = scenarios().map((s) => s.net.recycle).filter((x): x is number => x != null)
  return { min: Math.min(...v), max: Math.max(...v) }
}

export const REPORT_DATE = 'November 2026'
