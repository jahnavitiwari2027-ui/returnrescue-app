// Team activity for the owner's dashboard: who logged what, which products come
// back most, and what staff flagged for ops. Pure functions over the returns list.

import type { Product, ReturnItem } from './types'

export interface PersonActivity {
  name: string
  logged: number
  last30: number
  lastAt: string
}
export interface ProductActivity {
  key: string
  sku: string
  name: string
  returns: number
  productId: string | null
}

const DAY = 86_400_000

export function teamActivity(items: ReturnItem[], products: Product[], now = Date.now()) {
  const people = new Map<string, PersonActivity>()
  for (const i of items) {
    const name = i.logged_by_name?.trim()
    if (!name) continue
    const p = people.get(name) ?? { name, logged: 0, last30: 0, lastAt: i.created_at }
    p.logged++
    if (now - new Date(i.created_at).getTime() <= 30 * DAY) p.last30++
    if (i.created_at > p.lastAt) p.lastAt = i.created_at
    people.set(name, p)
  }
  const byId = new Map(products.map((p) => [p.id, p]))
  const skus = new Map<string, ProductActivity>()
  for (const i of items) {
    const prod = i.product_id ? byId.get(i.product_id) : undefined
    const sku = (prod?.sku ?? i.sku ?? '').trim().toUpperCase()
    if (!sku) continue
    const a = skus.get(sku) ?? { key: sku, sku, name: prod?.name ?? i.name, returns: 0, productId: prod?.id ?? null }
    a.returns++
    skus.set(sku, a)
  }
  const flagged = items
    .filter((i) => i.flagged_at && i.flag_note)
    .sort((a, b) => (b.flagged_at ?? '').localeCompare(a.flagged_at ?? ''))
  return {
    people: [...people.values()].sort((a, b) => b.logged - a.logged),
    products: [...skus.values()].sort((a, b) => b.returns - a.returns),
    flagged,
    /** Returns logged against a SKU that isn't in the product list yet. */
    unlisted: items.filter((i) => !i.product_id).length,
  }
}
