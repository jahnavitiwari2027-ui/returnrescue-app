// Products remembered from earlier returns, so the same product is recognised next time it
// comes back: suggestions while typing, and one stable SKU per product.

import type { SaleSetup } from './rates'
import type { Category, ReturnItem } from './types'

export interface KnownProduct {
  sku: string
  name: string
  category: Category
  original_price: number
  sale_setup: SaleSetup | null
  /** How many returns of this product are on record. */
  count: number
  /** The most recent return of this product. */
  lastId: string
}

const CAT_CODE: Record<Category, string> = {
  Topwear: 'TOP',
  Bottomwear: 'BTM',
  'Ethnic wear': 'ETH',
  Dresses: 'DRS',
  Activewear: 'ACT',
  'Innerwear & swimwear': 'SWM',
  Footwear: 'FTW',
  'Bags & accessories': 'BAG',
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** One entry per SKU, using the most recent return's details. */
export function knownProducts(items: ReturnItem[]): KnownProduct[] {
  const bySku = new Map<string, KnownProduct & { at: string }>()
  for (const i of items) {
    const sku = i.sku?.trim().toUpperCase()
    if (!sku || !i.name.trim()) continue
    const prev = bySku.get(sku)
    if (!prev) {
      bySku.set(sku, { sku, name: i.name, category: i.category as Category, original_price: i.original_price, sale_setup: i.sale_setup, count: 1, lastId: i.id, at: i.created_at })
    } else {
      prev.count += 1
      if (i.created_at > prev.at) Object.assign(prev, { name: i.name, category: i.category, original_price: i.original_price, sale_setup: i.sale_setup, lastId: i.id, at: i.created_at })
    }
  }
  return [...bySku.values()].map(({ at: _at, ...p }) => p).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Earlier products whose name or SKU matches what's being typed (at least two characters). */
export function matchProducts(query: string, products: KnownProduct[], limit = 5): KnownProduct[] {
  const q = normalise(query)
  if (q.length < 2) return []
  const words = q.split(' ')
  const skuQ = query.trim().toUpperCase()
  return products
    .map((p) => {
      const name = normalise(p.name)
      const score = p.sku.startsWith(skuQ) ? 3 : name.startsWith(q) ? 2 : words.every((w) => name.includes(w)) ? 1 : 0
      return { p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.count - a.p.count)
    .slice(0, limit)
    .map((x) => x.p)
}

export const productBySku = (sku: string, products: KnownProduct[]) => {
  const s = sku.trim().toUpperCase()
  return s ? products.find((p) => p.sku === s) ?? null : null
}

/** The earlier product with the same name and category, if any. */
export const sameProduct = (name: string, category: string, products: KnownProduct[]) => {
  const n = normalise(name)
  return n ? products.find((p) => normalise(p.name) === n && p.category === category) ?? null : null
}

function hash36(s: string, len: number) {
  // FNV-1a, so the same name and category always give the same code.
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  const h2 = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  return (h.toString(36) + h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(len, '0').slice(0, len)
}

/**
 * The SKU to use when none is typed: the earlier product's SKU if this product has come back
 * before, otherwise a readable one — category, first word of the name, and a short code
 * (e.g. FTW-NIMBUS-3K9Q). The same name and category always give the same SKU.
 */
export function skuFor(name: string, category: Category, products: KnownProduct[]): string {
  const known = sameProduct(name, category, products)
  if (known) return known.sku
  const n = normalise(name)
  const word = (n.split(' ').find((w) => /[a-z]/.test(w) && w.length > 2) ?? n.split(' ')[0] ?? 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ITEM'
  const key = `${category}|${n}`
  const taken = new Set(products.map((p) => p.sku))
  for (const len of [4, 6, 8]) {
    const sku = `${CAT_CODE[category] ?? 'GEN'}-${word}-${hash36(key, len)}`
    if (!taken.has(sku)) return sku
  }
  return `${CAT_CODE[category] ?? 'GEN'}-${word}-${hash36(key + Date.now(), 8)}`
}
