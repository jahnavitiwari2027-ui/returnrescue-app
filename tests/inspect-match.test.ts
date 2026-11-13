// The inspection endpoint's photo match against earlier products, with the model stubbed.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const model = vi.fn()
vi.mock('../netlify/functions/_shared/ai', () => ({
  aiProvider: () => 'gemini',
  aiModel: () => 'test-model',
  aiErrorResponse: () => ({ status: 502, code: 'AI', message: 'x' }),
  structuredVision: (...a: unknown[]) => model(...a),
}))
vi.mock('../netlify/functions/_shared/supabaseAdmin', () => ({
  supabaseConfigured: () => true,
  getUser: async () => ({ id: 'u1' }),
  getAccess: async () => ({ plan: null, launch: true, exports: true, proFeatures: true, ai: { remaining: 10, limit: 10, packsRecent: 0, packsLeft: 2 } }),
  countUsage: async () => 0,
  recordUsage: async () => undefined,
  trialAiLimit: () => 100,
  trialDays: () => 14,
}))
const { default: handler } = await import('../netlify/functions/inspect.mts')

const img = { media_type: 'image/jpeg', data: 'AAAA' }
const call = async (references?: unknown[]) => {
  const res = await handler(new Request('http://x/api/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer t' },
    body: JSON.stringify({ mode: 'account', images: [img], references, context: { name: 'White sneaker', category: 'Footwear' } }),
  }))
  return { status: res.status, inspection: ((await res.json()) as { inspection: Record<string, unknown> }).inspection }
}
const result = { item_kind: 'footwear', item_seen: 'a white sneaker', image_quality: 'good', product_match: 'matches', summary: 's', defects: [], proposed_grade: 'A', grade_rationale: 'r', confidence: 'high', limitations: ['l'], recommended_physical_checks: ['c'] }
const refs = [
  { id: 'ftw-nimbus-3k9q', name: 'Nimbus Canvas Sneakers', image: img },
  { id: 'FTW-STRIDE-AB12', name: 'Stride Runner', image: img },
]

describe('photo match with earlier products', () => {
  beforeEach(() => model.mockReset())

  it('without references, sends only the return photos and asks nothing about matches', async () => {
    model.mockResolvedValue(result)
    const { inspection } = await call()
    const opts = model.mock.calls[0][0] as { images: { label?: string }[]; schema: { properties: Record<string, unknown> }; system: string }
    expect(opts.images).toHaveLength(1)
    expect(opts.images[0].label).toBeUndefined()
    expect(opts.schema.properties.same_as_reference).toBeUndefined()
    expect(opts.system).not.toMatch(/Reference photos/)
    expect(inspection.matched_product).toBeUndefined()
  })

  it('labels the reference photos and reports the product the AI matched', async () => {
    model.mockResolvedValue({ ...result, same_as_reference: 'R1' })
    const { status, inspection } = await call(refs)
    expect(status).toBe(200)
    const opts = model.mock.calls[0][0] as { images: { label?: string }[]; schema: { properties: Record<string, { enum?: string[] }>; required: string[] } }
    expect(opts.images.map((i) => i.label)).toEqual([
      'Returned product — photo 1 of 1',
      'Reference R1 (identification only, do not inspect) — earlier product: "Nimbus Canvas Sneakers"',
      'Reference R2 (identification only, do not inspect) — earlier product: "Stride Runner"',
    ])
    expect(opts.schema.properties.same_as_reference.enum).toEqual(['none', 'R1', 'R2'])
    expect(opts.schema.required).toContain('same_as_reference')
    expect(inspection.matched_product).toEqual({ sku: 'FTW-NIMBUS-3K9Q', name: 'Nimbus Canvas Sneakers' })
    expect(inspection.proposed_grade).toBe('A')
  })

  it('reports no match for "none" or an unknown label', async () => {
    model.mockResolvedValue({ ...result, same_as_reference: 'none' })
    expect((await call(refs)).inspection.matched_product).toBeUndefined()
    model.mockResolvedValue({ ...result, same_as_reference: 'R9' })
    expect((await call(refs)).inspection.matched_product).toBeUndefined()
  })

  it('drops invalid references instead of failing, and keeps at most four', async () => {
    model.mockResolvedValue({ ...result, same_as_reference: 'none' })
    const bad = [
      { id: 'bad sku!', name: 'x', image: img },
      { id: 'OK-1', name: 'x', image: { media_type: 'image/gif', data: 'AAAA' } },
      { id: 'OK-2', name: 'x', image: { media_type: 'image/jpeg', data: 'A'.repeat(400_001) } },
      ...Array.from({ length: 6 }, (_, i) => ({ id: `SKU-${i}`, name: `P${i}`, image: img })),
    ]
    const { status } = await call(bad)
    expect(status).toBe(200)
    const opts = model.mock.calls[0][0] as { images: { label?: string }[] }
    expect(opts.images).toHaveLength(1 + 4)
    expect(opts.images[1].label).toMatch(/"P0"/)
  })
})
