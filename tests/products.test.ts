import { describe, expect, it } from 'vitest'
import { matchCategory, parseCsv, parseProductSheet, templateCsv } from '../src/lib/productImport'
import { teamActivity } from '../src/lib/team'
import { emptyReturnInput, type ReturnItem } from '../src/lib/types'

describe('reading a product sheet', () => {
  it('parses quoted CSV with commas, quotes and line breaks', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n"multi\nline",3\n\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"'], ['multi\nline', '3']])
  })

  it('accepts the template and common column names', () => {
    const t = parseProductSheet(parseCsv(templateCsv()))
    expect(t.missing).toEqual([])
    expect(t.rows[0].input).toMatchObject({ sku: 'TEE-WHT-M', category: 'Topwear', selling_price: 799, mrp: 999, sale_setup: { platform: 'amazon' } })
    const alt = parseProductSheet([['Item code', 'Title', 'Type', 'Price', 'Sold on', 'GST'], ['k-1', 'Kurta', 'kurta', '₹1,499', 'Flipkart', '5%']])
    expect(alt.rows[0].input).toMatchObject({ sku: 'K-1', category: 'Ethnic wear', selling_price: 1499, mrp: null, sale_setup: { platform: 'flipkart', gst_pct: 5 } })
  })

  it('explains every rejected row and never imports it', () => {
    const s = parseProductSheet([
      ['SKU', 'Product name', 'Category', 'Selling price', 'Platform', 'GST %'],
      ['A1', 'Tee', 'Topwear', '799', '', ''],
      ['a1', 'Tee again', 'Topwear', '799', '', ''],
      ['B 2', '', 'Gadgets', 'free', 'eBay', '12'],
    ])
    expect(s.rows[0].errors).toEqual([])
    expect(s.rows[1].errors).toEqual(['same SKU as row 2'])
    expect(s.rows[2].input).toBeNull()
    expect(s.rows[2].errors).toEqual([
      'SKU can use letters, numbers and - _ . / only',
      'product name missing',
      'unknown category “Gadgets”',
      'selling price must be a number above 0',
      'unknown platform “eBay” — use Amazon.in, Flipkart, Meesho or Own website',
      'GST % must be 0, 5 or 18',
    ])
  })

  it('reports missing required columns', () => {
    expect(parseProductSheet([['SKU', 'Name']]).missing).toEqual(['Category', 'Selling price'])
  })

  it('maps everyday category words', () => {
    expect(matchCategory('Sneakers')).toBe('Footwear')
    expect(matchCategory('BAGS & ACCESSORIES')).toBe('Bags & accessories')
    expect(matchCategory('furniture')).toBeNull()
  })
})

describe('team activity', () => {
  const mk = (o: Partial<ReturnItem>): ReturnItem => ({ ...emptyReturnInput(), id: Math.random().toString(36), created_at: '2026-10-10T10:00:00Z', updated_at: '', name: 'x', sku: 'X', ...o })
  it('counts returns per person and per product, and lists flags newest first', () => {
    const a = teamActivity(
      [
        mk({ logged_by_name: 'Ravi', sku: 'TEE-1', product_id: 'p1' }),
        mk({ logged_by_name: 'Ravi', sku: 'tee-1', created_at: '2026-10-15T10:00:00Z', flag_note: 'check', flagged_at: '2026-10-15T11:00:00Z' }),
        mk({ logged_by_name: 'Pooja', sku: 'JEAN-2', flag_note: 'older', flagged_at: '2026-10-11T11:00:00Z' }),
      ],
      [{ id: 'p1', sku: 'TEE-1', name: 'Tee', category: 'Topwear', mrp: null, selling_price: 1, sale_setup: null, notes: '', created_at: '', updated_at: '' }],
      new Date('2026-10-17T00:00:00Z').getTime(),
    )
    expect(a.people).toEqual([
      { name: 'Ravi', logged: 2, last30: 2, lastAt: '2026-10-15T10:00:00Z' },
      { name: 'Pooja', logged: 1, last30: 1, lastAt: '2026-10-10T10:00:00Z' },
    ])
    expect(a.products.map((p) => [p.sku, p.returns])).toEqual([['TEE-1', 2], ['JEAN-2', 1]])
    expect(a.flagged.map((f) => f.flag_note)).toEqual(['check', 'older'])
    expect(a.unlisted).toBe(2)
  })
})
