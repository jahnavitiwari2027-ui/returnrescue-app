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
vi.mock('../netlify/functions/_shared/supabaseAdmin', () => ({
  supabaseConfigured: () => true,
  getUser: async () => ({ id: 'u1' }),
  getAccess: async () => ({ plan: null, trial: true, allowed: true, proFeatures: true }),
  countUsage: async () => 0,
  recordUsage: (...a: unknown[]) => recordUsage(...(a as [])),
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
  beforeEach(() => { model.mockReset(); recordUsage.mockClear() })

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
})
