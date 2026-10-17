// Reading a product list from a CSV or Excel sheet: flexible column names,
// row-by-row checks, and nothing saved until the preview is confirmed.

import { GST_CHOICES, type PlatformKey, type SaleSetup } from './rates'
import { CATEGORIES, type Category, type ProductInput } from './types'

export const IMPORT_COLUMNS = ['SKU', 'Product name', 'Category', 'Selling price', 'MRP', 'Platform', 'GST %', 'Notes'] as const
export const MAX_IMPORT_ROWS = 2000

/** A blank template with one example row. */
export function templateCsv() {
  return [IMPORT_COLUMNS.join(','), 'TEE-WHT-M,Classic white cotton tee,Topwear,799,999,Amazon.in,,', ''].join('\r\n')
}

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9%]/g, '')
const HEADERS: Record<string, keyof ImportRow> = {
  sku: 'sku', skucode: 'sku', code: 'sku', itemcode: 'sku', productcode: 'sku',
  productname: 'name', name: 'name', product: 'name', title: 'name', itemname: 'name',
  category: 'category', type: 'category',
  sellingprice: 'price', price: 'price', saleprice: 'price', sp: 'price', yourprice: 'price',
  mrp: 'mrp', maximumretailprice: 'mrp',
  platform: 'platform', channel: 'platform', soldon: 'platform', marketplace: 'platform',
  'gst%': 'gst', gst: 'gst', gstrate: 'gst', taxrate: 'gst',
  notes: 'notes', note: 'notes', description: 'notes',
}
interface ImportRow { sku: string; name: string; category: string; price: string; mrp: string; platform: string; gst: string; notes: string }

const CATEGORY_ALIASES: Record<string, Category> = {
  shirt: 'Topwear', shirts: 'Topwear', tshirt: 'Topwear', tshirts: 'Topwear', top: 'Topwear', tops: 'Topwear',
  jeans: 'Bottomwear', trousers: 'Bottomwear', pants: 'Bottomwear', bottoms: 'Bottomwear',
  kurta: 'Ethnic wear', kurtas: 'Ethnic wear', saree: 'Ethnic wear', ethnic: 'Ethnic wear',
  dress: 'Dresses',
  sportswear: 'Activewear', athleisure: 'Activewear',
  innerwear: 'Innerwear & swimwear', swimwear: 'Innerwear & swimwear', lingerie: 'Innerwear & swimwear',
  shoes: 'Footwear', shoe: 'Footwear', sneakers: 'Footwear', sandals: 'Footwear', slippers: 'Footwear',
  bags: 'Bags & accessories', bag: 'Bags & accessories', accessories: 'Bags & accessories', handbag: 'Bags & accessories', wallet: 'Bags & accessories',
}
export function matchCategory(v: string): Category | null {
  const n = norm(v)
  if (!n) return null
  return CATEGORIES.find((c) => norm(c) === n) ?? CATEGORY_ALIASES[n] ?? null
}
export function matchPlatform(v: string): PlatformKey | null {
  const n = norm(v)
  if (!n) return null
  if (n.startsWith('amazon')) return 'amazon'
  if (n.startsWith('flipkart')) return 'flipkart'
  if (n.startsWith('meesho')) return 'meesho'
  if (['ownsite', 'ownwebsite', 'yourownwebsite', 'website', 'shopify', 'woocommerce', 'd2c', 'own'].includes(n)) return 'own_site'
  return null
}
const money = (v: string) => {
  const t = v.replace(/[₹,\s]|rs\.?|inr/gi, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? Math.round(n * 100) / 100 : NaN
}

export interface ParsedRow {
  line: number
  input: ProductInput | null
  errors: string[]
}
export interface ParsedSheet {
  rows: ParsedRow[]
  /** Required columns not found in the header row. */
  missing: string[]
  ignored: string[]
}

/** Turn sheet rows (first row = headers) into products, with a reason for every rejected row. */
export function parseProductSheet(table: unknown[][], defaultPlatform?: PlatformKey): ParsedSheet {
  const cells = table.map((r) => r.map((c) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)).trim()))
  const header = cells[0] ?? []
  const map: (keyof ImportRow | null)[] = header.map((h) => HEADERS[norm(h)] ?? null)
  const missing = (['sku', 'name', 'category', 'price'] as const).filter((k) => !map.includes(k)).map((k) => ({ sku: 'SKU', name: 'Product name', category: 'Category', price: 'Selling price' })[k])
  const ignored = header.filter((_, i) => !map[i] && header[i])
  if (missing.length) return { rows: [], missing, ignored }
  const seen = new Map<string, number>()
  const rows: ParsedRow[] = []
  cells.slice(1, MAX_IMPORT_ROWS + 1).forEach((r, idx) => {
    const line = idx + 2
    const v = {} as ImportRow
    map.forEach((k, i) => {
      if (k && !v[k]) v[k] = r[i] ?? ''
    })
    const errors: string[] = []
    const sku = (v.sku ?? '').toUpperCase()
    if (!sku) errors.push('SKU missing')
    else if (!/^[A-Z0-9][A-Z0-9\-_./]{0,79}$/.test(sku)) errors.push('SKU can use letters, numbers and - _ . / only')
    else if (seen.has(sku)) errors.push(`same SKU as row ${seen.get(sku)}`)
    if (sku && !errors.length) seen.set(sku, line)
    const name = (v.name ?? '').slice(0, 200)
    if (!name) errors.push('product name missing')
    const category = matchCategory(v.category ?? '')
    if (!category) errors.push(v.category ? `unknown category “${v.category}”` : 'category missing')
    const price = money(v.price ?? '')
    if (price == null) errors.push('selling price missing')
    else if (Number.isNaN(price) || price <= 0) errors.push('selling price must be a number above 0')
    const mrp = money(v.mrp ?? '')
    if (Number.isNaN(mrp)) errors.push('MRP must be a number')
    const platform = v.platform ? matchPlatform(v.platform) : null
    if (v.platform && !platform) errors.push(`unknown platform “${v.platform}” — use Amazon.in, Flipkart, Meesho or Own website`)
    const gst = v.gst ? Number(v.gst.replace('%', '')) : undefined
    if (gst !== undefined && !(GST_CHOICES as readonly number[]).includes(gst)) errors.push('GST % must be 0, 5 or 18')
    let sale: SaleSetup | null = null
    if (platform || gst !== undefined) sale = { platform: platform ?? defaultPlatform ?? 'amazon', ...(gst !== undefined && !Number.isNaN(gst) ? { gst_pct: gst } : {}) }
    rows.push({
      line,
      errors,
      input: errors.length
        ? null
        : { sku, name, category: category!, selling_price: price as number, mrp: (mrp as number | null) ?? null, sale_setup: sale, notes: (v.notes ?? '').slice(0, 1000) },
    })
  })
  return { rows, missing, ignored }
}
