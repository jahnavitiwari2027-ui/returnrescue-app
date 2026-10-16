// GET /api/status — which integrations are configured (no secrets exposed).
import type { Config } from '@netlify/functions'
import { dodoConfigured, dodoMode } from './_shared/dodo'
import { aiModel, aiProvider } from './_shared/ai'
import { env, json } from './_shared/http'
import { supabaseConfigured } from './_shared/supabaseAdmin'

export default async () =>
  json(200, {
    ai: Boolean(aiProvider()),
    aiProvider: aiProvider(),
    aiModel: aiProvider() ? aiModel() : null,
    accounts: supabaseConfigured(),
    payments: dodoConfigured() && Boolean(env('DODO_PAYMENTS_WEBHOOK_KEY')),
    paymentsMode: dodoMode(),
  })

export const config: Config = { path: '/api/status' }
