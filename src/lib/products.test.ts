import { describe, expect, it } from 'vitest'
import { knownProducts, matchProducts, productBySku, skuFor } from './products'
import { emptyReturnInput, type ReturnItem } from './types'

const item = (over: Partial<ReturnItem>): ReturnItem =>
  ({ ...emptyReturnInput(), id: Math.random().toString(36), created_at: '2026-11-01T10:00:00Z', ...over }) as ReturnItem

const items = [
  item({ name: 'Nimbus Canvas Low-top Sneakers', sku: 'FTW-NIMBUS-AAAA', category: 'Footwear', original_price: 2999, created_at: '2026-10-01T10:00:00Z' }),
  item({ name: 'Nimbus Canvas Low-top Sneakers', sku: 'ftw-nimbus-aaaa', category: 'Footwear', original_price: 2799, created_at: '2026-10-20T10:00:00Z' }),
  item({ name: 'Harbor Linen Overshirt', sku: 'TOP-HARBOR-BBBB', category: 'Topwear', original_price: 1899 }),
]

describe('knownProducts', () => {
  it('groups returns by SKU (any case) and keeps the latest details', () => {
    const p = knownProducts(items)
    expect(p).toHaveLength(2)
    expect(p[0]).toMatchObject({ sku: 'FTW-NIMBUS-AAAA', count: 2, original_price: 2799 })
  })
})

describe('matchProducts', () => {
  const p = knownProducts(items)
  it('matches the start of a name, words anywhere, or a SKU', () => {
    expect(matchProducts('nim', p).map((x) => x.sku)).toEqual(['FTW-NIMBUS-AAAA'])
    expect(matchProducts('linen jacket', p)).toHaveLength(0)
    expect(matchProducts('linen over', p).map((x) => x.sku)).toEqual(['TOP-HARBOR-BBBB'])
    expect(matchProducts('top-har', p).map((x) => x.sku)).toEqual(['TOP-HARBOR-BBBB'])
  })
  it('needs at least two characters', () => {
    expect(matchProducts('n', p)).toHaveLength(0)
  })
  it('finds a product by SKU', () => {
    expect(productBySku(' top-harbor-bbbb ', p)?.name).toBe('Harbor Linen Overshirt')
    expect(productBySku('', p)).toBeNull()
  })
})

describe('skuFor', () => {
  const p = knownProducts(items)
  it('reuses the SKU of the same product (name and category)', () => {
    expect(skuFor('nimbus canvas low-top sneakers', 'Footwear', p)).toBe('FTW-NIMBUS-AAAA')
  })
  it('makes a readable SKU that is the same every time for a new product', () => {
    const a = skuFor('Coastline High-rise Denim', 'Bottomwear', p)
    expect(a).toMatch(/^BTM-COASTLIN-[A-Z0-9]{4}$/)
    expect(skuFor('Coastline  high-rise denim', 'Bottomwear', p)).toBe(a)
    expect(skuFor('Coastline High-rise Denim', 'Dresses', p)).not.toBe(a)
  })
  it('never reuses a SKU that belongs to a different product', () => {
    const a = skuFor('Coastline High-rise Denim', 'Bottomwear', [])
    const clash = knownProducts([item({ name: 'Something else', sku: a, category: 'Bottomwear' })])
    const b = skuFor('Coastline High-rise Denim', 'Bottomwear', clash)
    expect(b).not.toBe(a)
    expect(b.startsWith('BTM-COASTLIN-')).toBe(true)
  })
})
