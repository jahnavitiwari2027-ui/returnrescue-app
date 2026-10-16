// GET /api/status — which integrations are configured (no secrets exposed).
import type { Config } from '@netlify/functions'
import { dodoConfigured, dodoMode } from './_shared/dodo'
import { env, json } from './_shared/http'
import { supabaseConfigured } from './_shared/supabaseAdmin'

export default async () =>
  json(200, {
    ai: Boolean(env('ANTHROPIC_API_KEY')),
    aiModel: env('ANTHROPIC_MODEL') || 'claude-sonnet-5-5',
    accounts: supabaseConfigured(),
    payments: dodoConfigured() && Boolean(env('DODO_PAYMENTS_WEBHOOK_KEY')),
    paymentsMode: dodoMode(),
  })

export const config: Config = { path: '/api/status' }
