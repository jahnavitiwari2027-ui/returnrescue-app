// Exercises the Gemini request/response handling with a stubbed network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiErrorResponse, aiModel, aiProvider, structuredVision } from './_shared/ai'

const schema = {
  type: 'object' as const,
  properties: { proposed_grade: { type: 'string' as const, enum: ['A', 'B'] }, defects: { type: 'array' as const, items: { type: 'string' as const }, maxItems: 3 } },
  required: ['proposed_grade'],
}

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('Gemini provider', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.AI_PROVIDER
    delete process.env.GEMINI_MODEL
  })
  afterEach(() => vi.unstubAllGlobals())

  it('is selected when only a Gemini key is set', () => {
    expect(aiProvider()).toBe('gemini')
    expect(aiModel()).toBe('gemini-3.8-flash')
  })

  it('sends images + schema and parses structured JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      reply(200, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"proposed_grade":"B","defects":["scuff"]}' }] } }] }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const out = await structuredVision({ system: 'sys', images: [{ media_type: 'image/jpeg', data: 'AAAA' }], text: 'look', schema, toolName: 't', maxTokens: 100 })
    expect(out).toEqual({ proposed_grade: 'B', defects: ['scuff'] })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/models/gemini-3.8-flash:generateContent')
    expect(init.headers['x-goog-api-key']).toBe('test-key')
    const body = JSON.parse(init.body)
    expect(body.contents[0].parts[0]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: 'AAAA' } })
    expect(body.generationConfig.responseMimeType).toBe('application/json')
    expect(body.generationConfig.responseSchema.type).toBe('OBJECT')
    expect(body.generationConfig.responseSchema.properties.proposed_grade).toMatchObject({ type: 'STRING', enum: ['A', 'B'] })
  })

  it('falls back to prompt-described JSON if the schema is rejected', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(400, { error: { message: 'Invalid JSON payload: response_schema ...' } }))
      .mockResolvedValueOnce(reply(200, { candidates: [{ content: { parts: [{ text: '```json\n{"proposed_grade":"A"}\n```' }] } }] }))
    vi.stubGlobal('fetch', fetchMock)
    const out = await structuredVision({ system: 's', images: [], text: 'x', schema, toolName: 't', maxTokens: 50 })
    expect(out).toEqual({ proposed_grade: 'A' })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).generationConfig.responseSchema).toBeUndefined()
  })

  it('maps auth, quota and safety errors without inventing a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(429, { error: { message: 'quota' } })))
    const err = await structuredVision({ system: 's', images: [], text: 'x', schema, toolName: 't', maxTokens: 50 }).catch((e) => e)
    expect(aiErrorResponse(err).code).toBe('AI_BUSY')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { promptFeedback: { blockReason: 'SAFETY' } })))
    const blocked = await structuredVision({ system: 's', images: [], text: 'x', schema, toolName: 't', maxTokens: 50 }).catch((e) => e)
    expect(aiErrorResponse(blocked).code).toBe('AI_DECLINED')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(400, { error: { message: 'API key not valid' } })))
    const bad = await structuredVision({ system: 's', images: [], text: 'x', schema, toolName: 't', maxTokens: 50 }).catch((e) => e)
    expect(aiErrorResponse(bad).code).toBe('AI_AUTH')
  })
})
