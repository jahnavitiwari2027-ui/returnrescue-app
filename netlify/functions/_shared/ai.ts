// Provider-agnostic AI calls. Supports Google Gemini (has a free tier) and
// Anthropic Claude. Choose with AI_PROVIDER, otherwise whichever key is set
// (Gemini first). All calls are server-side; keys never reach the browser.

import Anthropic from '@anthropic-ai/sdk'
import { env } from './http'

export type Provider = 'gemini' | 'anthropic'

export function aiProvider(): Provider | null {
  const forced = env('AI_PROVIDER')
  if (forced === 'gemini' && env('GEMINI_API_KEY')) return 'gemini'
  if (forced === 'anthropic' && env('ANTHROPIC_API_KEY')) return 'anthropic'
  if (env('GEMINI_API_KEY')) return 'gemini'
  if (env('ANTHROPIC_API_KEY')) return 'anthropic'
  return null
}

export function aiModel(p: Provider | null = aiProvider()): string {
  if (p === 'gemini') return env('GEMINI_MODEL') || 'gemini-3.8-flash'
  return env('ANTHROPIC_MODEL') || 'claude-sonnet-5-5'
}

export class AIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Minimal JSON-schema subset used for structured output. */
export interface JSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean'
  description?: string
  enum?: readonly string[]
  properties?: Record<string, JSchema>
  required?: string[]
  items?: JSchema
  maxItems?: number
  minItems?: number
}

function toGeminiSchema(s: JSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: s.type.toUpperCase() }
  if (s.description) out.description = s.description
  if (s.enum) {
    out.enum = [...s.enum]
    out.format = 'enum'
  }
  if (s.properties) {
    out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]))
    out.propertyOrdering = Object.keys(s.properties)
  }
  if (s.required) out.required = s.required
  if (s.items) out.items = toGeminiSchema(s.items)
  if (s.maxItems != null) out.maxItems = String(s.maxItems)
  if (s.minItems != null) out.minItems = String(s.minItems)
  return out
}

export interface ImageInput {
  media_type: 'image/jpeg' | 'image/png' | 'image/webp'
  data: string // base64
}

async function geminiGenerate(body: Record<string, unknown>, timeoutMs: number) {
  const model = aiModel('gemini')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY')! },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } catch {
    throw new AIError(504, 'The AI request timed out.')
  } finally {
    clearTimeout(t)
  }
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string }
    promptFeedback?: { blockReason?: string }
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[]
  }
  if (!res.ok) throw new AIError(res.status, json.error?.message ?? `Gemini error ${res.status}`)
  if (json.promptFeedback?.blockReason) throw new AIError(422, `The AI declined the request (${json.promptFeedback.blockReason}).`)
  const parts = json.candidates?.[0]?.content?.parts ?? []
  const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('').trim()
  if (!text) throw new AIError(502, `The AI returned no content (${json.candidates?.[0]?.finishReason ?? 'unknown'}).`)
  return text
}

function parseJsonLoose(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new AIError(502, 'The AI returned an unreadable result.')
  }
}

/** Images + text in, a JSON object matching `schema` out. */
export async function structuredVision(opts: {
  system: string
  images: ImageInput[]
  text: string
  schema: JSchema
  toolName: string
  maxTokens: number
}): Promise<Record<string, unknown>> {
  const provider = aiProvider()
  if (!provider) throw new AIError(503, 'No AI provider configured.')

  if (provider === 'gemini') {
    const base = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [
        {
          role: 'user',
          parts: [
            ...opts.images.map((i) => ({ inline_data: { mime_type: i.media_type, data: i.data } })),
            { text: opts.text },
          ],
        },
      ],
    }
    try {
      const text = await geminiGenerate(
        {
          ...base,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: toGeminiSchema(opts.schema),
            maxOutputTokens: opts.maxTokens * 3,
            temperature: 0.2,
          },
        },
        50_000,
      )
      return parseJsonLoose(text)
    } catch (e) {
      // If the schema itself is rejected, retry once with JSON mode + schema in the prompt.
      if (!(e instanceof AIError) || e.status !== 400 || !/schema/i.test(e.message)) throw e
      const text = await geminiGenerate(
        {
          ...base,
          contents: [
            {
              role: 'user',
              parts: [
                ...base.contents[0].parts,
                { text: `Respond ONLY with a JSON object matching this JSON schema:\n${JSON.stringify(opts.schema)}` },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: opts.maxTokens * 3, temperature: 0.2 },
        },
        45_000,
      )
      return parseJsonLoose(text)
    }
  }

  const client = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), timeout: 50_000, maxRetries: 1 })
  try {
    const msg = await client.messages.create({
      model: aiModel('anthropic'),
      max_tokens: opts.maxTokens,
      system: opts.system,
      tools: [{ name: opts.toolName, description: 'Record the structured result.', input_schema: opts.schema as unknown as Anthropic.Tool.InputSchema }],
      tool_choice: { type: 'tool', name: opts.toolName },
      messages: [
        {
          role: 'user',
          content: [
            ...opts.images.map((i) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: i.media_type, data: i.data } })),
            { type: 'text' as const, text: opts.text },
          ],
        },
      ],
    })
    const block = msg.content.find((c) => c.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new AIError(502, 'The AI did not return a structured result.')
    return block.input as Record<string, unknown>
  } catch (e) {
    if (e instanceof AIError) throw e
    const err = e as { status?: number; message?: string }
    throw new AIError(err.status ?? 502, err.message ?? 'AI request failed')
  }
}

/** Plain text generation. */
export async function generateText(opts: { system: string; user: string; maxTokens: number }): Promise<string> {
  const provider = aiProvider()
  if (!provider) throw new AIError(503, 'No AI provider configured.')
  if (provider === 'gemini') {
    return geminiGenerate(
      {
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts: [{ text: opts.user }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens * 3, temperature: 0.3 },
      },
      45_000,
    )
  }
  const client = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), timeout: 45_000, maxRetries: 1 })
  try {
    const msg = await client.messages.create({
      model: aiModel('anthropic'),
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    })
    return msg.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { text: string }).text)
      .join('\n')
      .trim()
  } catch (e) {
    const err = e as { status?: number; message?: string }
    throw new AIError(err.status ?? 502, err.message ?? 'AI request failed')
  }
}

/** Map provider errors to user-facing responses. */
export function aiErrorResponse(e: unknown): { status: number; code: string; message: string } {
  const status = e instanceof AIError ? e.status : (e as { status?: number }).status ?? 502
  if (status === 401 || status === 403 || /api[ _-]?key/i.test((e as Error)?.message ?? '')) return { status: 503, code: 'AI_AUTH', message: `The AI provider rejected the server’s API key (${String((e as Error)?.message ?? '').replace(/AIza[\w-]+|AQ\.[\w.-]+/g, '[key]').slice(0, 160)}). No result was generated.` }
  if (status === 429 || status === 529 || status === 503) return { status: 503, code: 'AI_BUSY', message: 'The AI service is busy or at its free-tier limit right now. Please try again in a minute.' }
  const detail = String((e as Error)?.message ?? '').replace(/AIza[\w-]+|AQ\.[\w.-]+/g, '[key]').slice(0, 220)
  if (status === 404) return { status: 502, code: 'AI_MODEL', message: `The configured AI model is not available to this API key (${detail}). No result was generated.` }
  if (status === 422) return { status: 422, code: 'AI_DECLINED', message: (e as Error).message }
  if (status === 504) return { status: 504, code: 'AI_TIMEOUT', message: 'The AI took too long to respond. No result was generated — please try again.' }
  return { status: 502, code: 'AI_ERROR', message: `The AI request failed (${status}: ${detail || 'unknown error'}). No result was generated.` }
}
