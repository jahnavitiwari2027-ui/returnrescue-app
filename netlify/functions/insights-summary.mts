// POST /api/insights-summary — an AI-written briefing grounded only in the
// workspace's computed statistics. For accounts, stats are recomputed here from
// the database rather than trusted from the browser.

import type { Config, Context } from '@netlify/functions'
import { computeStats, type WorkspaceStats } from '../../src/lib/insights'
import { aiErrorResponse, aiModel, aiProvider, generateText } from './_shared/ai'
import { fail, json, readJson } from './_shared/http'
import { normalizeRow } from './_shared/rows'
import { takeDemoQuota } from './_shared/rateLimit'
import { getAdmin, getEntitlement, getUser, isProRow, recordUsage, supabaseConfigured } from './_shared/supabaseAdmin'

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return fail(405, 'METHOD', 'Use POST.')
  if (!aiProvider()) return fail(503, 'AI_NOT_CONFIGURED', 'AI summaries are not configured on this deployment yet. No summary was generated.')
  const body = await readJson<{ mode?: string; stats?: WorkspaceStats }>(req, 100_000)
  if (!body) return fail(400, 'BAD_REQUEST', 'Malformed request.')

  let stats: WorkspaceStats
  let userId: string | null = null
  if (body.mode === 'account') {
    if (!supabaseConfigured()) return fail(503, 'NOT_CONFIGURED', 'Accounts are not configured.')
    const user = await getUser(req)
    if (!user) return fail(401, 'AUTH', 'Please sign in again.')
    if (!isProRow(await getEntitlement(user.id))) return fail(402, 'PRO_REQUIRED', 'AI summaries are part of ReturnRescue Pro.')
    userId = user.id
    const { data, error } = await getAdmin().from('returns').select('*').eq('user_id', user.id).limit(5000)
    if (error) return fail(500, 'DB', 'Could not read your records.')
    stats = computeStats((data ?? []).map(normalizeRow))
  } else {
    const s = body.stats
    if (!s || typeof s.total !== 'number' || !Array.isArray(s.byCategory)) return fail(400, 'BAD_REQUEST', 'Missing statistics.')
    const quota = await takeDemoQuota('insights', context.ip || 'unknown', 3, 150).catch(() => ({ ok: true as const }))
    if (!quota.ok) return fail(429, 'DEMO_LIMIT', 'The demo allows 3 AI summaries per day.')
    stats = s
  }
  if (!stats.total) return fail(400, 'EMPTY', 'There are no records to summarise yet.')

  // Trim to what the model needs; nothing outside these figures may be used.
  const facts = {
    total_returns: stats.total,
    awaiting_inspection: stats.awaitingInspection,
    awaiting_decision: stats.awaitingDecision,
    decided: stats.decided,
    completed: stats.completed,
    original_value_inr: stats.originalValue,
    estimated_recoverable_inr: stats.estimatedRecoverable,
    realized_total_inr: stats.realizedTotal,
    realized_items: stats.realizedCount,
    by_category: stats.byCategory?.slice(0, 10),
    by_reason: stats.byReason?.slice(0, 10),
    by_grade: stats.byGrade,
    recorded_defects: stats.defects?.slice(0, 10).map((d) => ({ issue: d.label, items: d.count })),
    route_opportunity: stats.routeOpportunity,
    routes_chosen: stats.routesChosen,
    decisions_overriding_recommendation: stats.overrides,
    oldest_unprocessed: stats.unprocessed?.slice(0, 5).map((u) => ({ name: u.name, status: u.status, age_days: u.ageDays })),
  }

  const model = aiModel()
  try {
    const text = (
      await generateText({
        maxTokens: 700,
        system:
          'You are an operations analyst for an Indian D2C fashion brand’s returns team. Write a short briefing from the JSON facts provided. ' +
          'Use ONLY the numbers in the facts — do not estimate, extrapolate, or invent benchmarks, percentages of industry, causes or savings. ' +
          'If the data is too thin to support a conclusion, say so. Amounts are Indian rupees (₹). Values labelled estimated are estimates, not realized money. ' +
          'Output 4 to 6 bullet points, each starting with "- ", each under 40 words, ending with the single most useful next action. No headings, no preamble.',
        user: `Facts (JSON):\n${JSON.stringify(facts).slice(0, 20_000)}`,
      })
    ).trim()
    if (!text) throw new Error('empty')
    if (userId) await recordUsage(userId, 'insights').catch(() => undefined)
    return json(200, { summary: text.slice(0, 4000), model, generated_at: new Date().toISOString() })
  } catch (e) {
    console.error('insights-summary: model error', (e as Error).message)
    const r = aiErrorResponse(e)
    return fail(r.status, r.code, r.message)
  }
}

export const config: Config = { path: '/api/insights-summary' }
