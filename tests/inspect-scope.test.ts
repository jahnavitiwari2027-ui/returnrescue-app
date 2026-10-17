// The inspection endpoint with the model and accounts stubbed: checks how it handles
// photos of things ReturnRescue doesn't inspect, and items under the wrong category.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const model = vi.fn()
vi.mock('../netlify/functions/_shared/ai', () => ({
  aiProvider: () => 'gemini',
  aiModel: () => 'test-model',
  aiErrorResponse: () => ({ status: 502, code: 'AI', message: 'x' }),
  structuredVision: (...a: unknown[]) => model(...a),
}))
const recordUsage = vi.fn(async () => undefined)
const ws = { current: { ownerId: 'u1', owner: { id: 'u1' }, role: 'owner' as 'owner' | 'staff' | 'pending' } }
const countUsage = vi.fn(async () => 0)
const catalogue = { rows: [] as { sku: string; name: string; category: string }[] }
vi.mock('../netlify/functions/_shared/supabaseAdmin', () => ({
  supabaseConfigured: () => true,
  getUser: async () => ({ id: 'staff-1' }),
  workspaceFor: async () => ws.current,
  getAccess: async (u: { id: string }) => ({ pro: false, trial: u.id === 'u1' }),
  countUsage: (...a: unknown[]) => countUsage(...(a as [])),
  recordUsage: (...a: unknown[]) => recordUsage(...(a as [])),
  getAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: catalogue.rows }) }) }) }) }),
  trialAiLimit: () => 100,
  trialDays: () => 14,
}))
const { default: handler } = await import('../netlify/functions/inspect.mts')

const call = async (category: string) => {
  const res = await handler(new Request('http://x/api/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer t' },
    body: JSON.stringify({ mode: 'account', images: [{ media_type: 'image/jpeg', data: 'AAAA' }], context: { name: 'Runner', category } }),
  }))
  return { status: res.status, body: (await res.json()) as { inspection: Record<string, unknown> } }
}
const base = { image_quality: 'good', product_match: 'matches', summary: 's', grade_rationale: 'r', confidence: 'high', limitations: ['l'], recommended_physical_checks: ['c'] }

describe('inspection scope', () => {
  beforeEach(() => {
    model.mockReset()
    recordUsage.mockClear()
    countUsage.mockClear()
    catalogue.rows = []
    ws.current = { ownerId: 'u1', owner: { id: 'u1' }, role: 'owner' }
  })

  it('refuses to grade a photo of medicine filed as footwear', async () => {
    model.mockResolvedValue({ ...base, item_kind: 'other', item_seen: 'a strip of tablets', defects: [{ type: 'other', description: 'x', severity: 'minor' }], proposed_grade: 'A' })
    const { status, body } = await call('Footwear')
    expect(status).toBe(200)
    const i = body.inspection
    expect(i.out_of_scope).toBe(true)
    expect(i.proposed_grade).toBe('MANUAL_REVIEW')
    expect(i.defects).toEqual([])
    expect(i.eligible_routes).toEqual([])
    expect(String(i.summary)).toMatch(/a strip of tablets/)
    expect(recordUsage).toHaveBeenCalledTimes(1)
  })

  it('sends a shirt filed as footwear to a person, saying why', async () => {
    model.mockResolvedValue({ ...base, item_kind: 'apparel', item_seen: 'a blue shirt', defects: [], proposed_grade: 'A' })
    const i = (await call('Footwear')).body.inspection
    expect(i.out_of_scope).toBeUndefined()
    expect(i.proposed_grade).toBe('MANUAL_REVIEW')
    expect((i.guardrail_notes as string[])[0]).toMatch(/category is Footwear/)
  })

  it('grades a matching item as usual', async () => {
    model.mockResolvedValue({ ...base, item_kind: 'footwear', item_seen: 'a white sneaker', defects: [{ type: 'scuff_or_scratch', description: 'scuff', severity: 'minor' }], proposed_grade: 'B' })
    const i = (await call('Footwear')).body.inspection
    expect(i.proposed_grade).toBe('B')
    expect(i.item_kind).toBe('footwear')
  })

  it('staff use the brand owner’s plan and allowance; pending members are refused', async () => {
    ws.current = { ownerId: 'u1', owner: { id: 'u1' }, role: 'staff' }
    model.mockResolvedValue({ ...base, item_kind: 'footwear', item_seen: 'a sneaker', defects: [], proposed_grade: 'A' })
    expect((await call('Footwear')).status).toBe(200)
    expect(countUsage).toHaveBeenCalledWith('u1', 'inspection')
    expect(recordUsage).toHaveBeenCalledWith('u1', 'inspection')
    ws.current = { ownerId: 'u1', owner: { id: 'staff-1' }, role: 'pending' }
    expect((await call('Footwear')).status).toBe(403)
  })

  it('suggests a SKU only when it is really in the brand’s product list', async () => {
    catalogue.rows = [{ sku: 'NIM-0311', name: 'Nimbus sneaker', category: 'Footwear' }]
    model.mockResolvedValue({ ...base, item_kind: 'footwear', item_seen: 'a sneaker', defects: [], proposed_grade: 'A', matched_sku: 'nim-0311', match_reason: 'same canvas upper' })
    let i = (await call('Footwear')).body.inspection
    expect(i.matched_sku).toBe('NIM-0311')
    expect(String(model.mock.calls[0][0].text)).toContain('NIM-0311: Nimbus sneaker')
    model.mockResolvedValue({ ...base, item_kind: 'footwear', item_seen: 'a sneaker', defects: [], proposed_grade: 'A', matched_sku: 'MADE-UP-1' })
    i = (await call('Footwear')).body.inspection
    expect(i.matched_sku).toBeUndefined()
  })
})
