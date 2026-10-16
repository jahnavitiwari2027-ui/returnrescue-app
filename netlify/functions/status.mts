// GET /api/status — which integrations are configured (no secret values exposed).
import type { Config } from '@netlify/functions'
import { aiModel, aiProvider } from './_shared/ai'
import { dodoConfigured, dodoMode } from './_shared/dodo'
import { env, json } from './_shared/http'
import { supabaseConfigured } from './_shared/supabaseAdmin'

const PAYMENT_VARS = ['DODO_PAYMENTS_API_KEY', 'DODO_PRO_PRODUCT_ID', 'DODO_PAYMENTS_WEBHOOK_KEY']

export default async () =>
  json(200, {
    ai: Boolean(aiProvider()),
    aiProvider: aiProvider(),
    aiModel: aiProvider() ? aiModel() : null,
    accounts: supabaseConfigured(),
    payments: dodoConfigured() && Boolean(env('DODO_PAYMENTS_WEBHOOK_KEY')),
    paymentsMode: dodoMode(),
    // Names only — helps diagnose setup without revealing any value.
    missing: PAYMENT_VARS.filter((n) => !env(n)),
  })

export const config: Config = { path: '/api/status' }
