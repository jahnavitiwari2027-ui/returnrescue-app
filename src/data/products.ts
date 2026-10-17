// The brand's product list (SKUs). Demo: this browser. Account: the `products`
// table, shared with the brand's approved staff (only the owner can change it).

import { supabase } from '../lib/supabase'
import { sanitizeSale } from '../lib/rates'
import { CATEGORIES, type Category, type Product, type ProductInput } from '../lib/types'
import { buildDemoProducts } from './demoSeed'
import { RepoError } from './repo'
import { fail } from './supabaseRepo'

export interface ProductsRepo {
  list(): Promise<Product[]>
  create(input: ProductInput): Promise<Product>
  update(id: string, patch: Partial<ProductInput>): Promise<Product>
  remove(id: string): Promise<void>
  /** Add or update many at once, matched by SKU. */
  upsertMany(inputs: ProductInput[]): Promise<Product[]>
}

export const MAX_PRODUCTS = 2000

export const productToInput = (p: Product): ProductInput => ({ sku: p.sku, name: p.name, category: p.category, mrp: p.mrp, selling_price: p.selling_price, sale_setup: p.sale_setup, notes: p.notes })

/** SKUs are matched without regard to case or surrounding spaces. */
export const skuKey = (sku: string) => sku.trim().toUpperCase()

export function normalizeProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    sku: String(row.sku ?? ''),
    name: String(row.name ?? ''),
    category: (CATEGORIES as readonly string[]).includes(row.category as string) ? (row.category as Category) : 'Topwear',
    mrp: row.mrp == null ? null : Number(row.mrp),
    selling_price: Number(row.selling_price ?? 0),
    sale_setup: sanitizeSale(row.sale_setup),
    notes: String(row.notes ?? ''),
    ...(row.is_sample ? { is_sample: true } : {}),
  }
}

const body = (p: Partial<ProductInput>) => {
  const out: Record<string, unknown> = { ...p }
  delete out.is_sample
  if (typeof out.sku === 'string') out.sku = skuKey(out.sku)
  if ('sale_setup' in out) out.sale_setup = sanitizeSale(out.sale_setup)
  return out
}

// ── Demo ──
const DEMO_KEY = 'returnrescue.demo.products.v1'
function readDemo(): Product[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return (JSON.parse(raw) as Record<string, unknown>[]).map(normalizeProduct)
  } catch {
    /* fall through */
  }
  const seed = buildDemoProducts()
  writeDemo(seed)
  return seed
}
function writeDemo(items: Product[]) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(items))
  } catch {
    throw new RepoError('STORAGE_FULL', 'Your browser storage for the demo is full.')
  }
}
export function resetDemoProducts() {
  writeDemo(buildDemoProducts())
}
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

export const localProductsRepo: ProductsRepo = {
  async list() {
    return readDemo().sort((a, b) => a.sku.localeCompare(b.sku))
  },
  async create(input) {
    const all = readDemo()
    if (all.some((p) => skuKey(p.sku) === skuKey(input.sku))) throw new RepoError('DUPLICATE', `SKU ${skuKey(input.sku)} is already in your product list.`)
    if (all.length >= MAX_PRODUCTS) throw new RepoError('LIMIT', `Up to ${MAX_PRODUCTS} products.`)
    const now = new Date().toISOString()
    const p = normalizeProduct({ ...body(input), id: uid(), created_at: now, updated_at: now })
    writeDemo([...all, p])
    return p
  },
  async update(id, patch) {
    const all = readDemo()
    const cur = all.find((p) => p.id === id)
    if (!cur) throw new RepoError('NOT_FOUND', 'That product no longer exists.')
    const next = normalizeProduct({ ...cur, ...body(patch), id, updated_at: new Date().toISOString() })
    if (all.some((p) => p.id !== id && skuKey(p.sku) === skuKey(next.sku))) throw new RepoError('DUPLICATE', `SKU ${next.sku} is already in your product list.`)
    writeDemo(all.map((p) => (p.id === id ? next : p)))
    return next
  },
  async remove(id) {
    writeDemo(readDemo().filter((p) => p.id !== id))
  },
  async upsertMany(inputs) {
    const all = readDemo()
    const bySku = new Map(all.map((p) => [skuKey(p.sku), p]))
    const now = new Date().toISOString()
    for (const input of inputs) {
      const k = skuKey(input.sku)
      const cur = bySku.get(k)
      bySku.set(k, normalizeProduct({ ...(cur ?? { id: uid(), created_at: now }), ...body(input), updated_at: now }))
    }
    const next = [...bySku.values()]
    if (next.length > MAX_PRODUCTS) throw new RepoError('LIMIT', `Up to ${MAX_PRODUCTS} products.`)
    writeDemo(next)
    return next
  },
}

// ── Account ──
function client() {
  if (!supabase) throw new RepoError('CONFIG', 'Accounts are not configured on this deployment.')
  return supabase
}
const friendly = (e: { message: string; code?: string }) =>
  e.code === '23505' ? new RepoError('DUPLICATE', 'That SKU is already in your product list.') : null

export function createSupabaseProductsRepo(ownerId: string): ProductsRepo {
  return {
    async list() {
      const { data, error } = await client().from('products').select('*').eq('owner_id', ownerId).order('sku').limit(MAX_PRODUCTS)
      if (error) {
        // The products table comes with the 19 Oct update; until then the list is just empty.
        if (error.code === '42P01' || error.code === 'PGRST205' || /products/.test(error.message)) return []
        fail(error)
      }
      return (data ?? []).map(normalizeProduct)
    },
    async create(input) {
      const { data, error } = await client().from('products').insert({ ...body(input), owner_id: ownerId }).select('*').single()
      if (error) throw friendly(error) ?? fail(error)
      return normalizeProduct(data)
    },
    async update(id, patch) {
      const { data, error } = await client().from('products').update(body(patch)).eq('id', id).select('*').single()
      if (error) throw friendly(error) ?? fail(error)
      return normalizeProduct(data)
    },
    async remove(id) {
      const { error } = await client().from('products').delete().eq('id', id)
      if (error) fail(error)
    },
    async upsertMany(inputs) {
      const out: Product[] = []
      // In batches, so a large sheet doesn't hit request limits.
      for (let i = 0; i < inputs.length; i += 200) {
        const rows = inputs.slice(i, i + 200).map((p) => ({ ...body(p), owner_id: ownerId }))
        const { data, error } = await client().from('products').upsert(rows, { onConflict: 'owner_id,sku' }).select('*')
        if (error) fail(error)
        out.push(...(data ?? []).map(normalizeProduct))
      }
      return out
    },
  }
}
