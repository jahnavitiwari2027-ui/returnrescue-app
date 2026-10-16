import DodoPayments from 'dodopayments'
import { env } from './http'

export function dodoConfigured() {
  return Boolean(env('DODO_PAYMENTS_API_KEY') && env('DODO_PRO_PRODUCT_ID'))
}

export function dodoMode(): 'test_mode' | 'live_mode' {
  return env('DODO_PAYMENTS_ENVIRONMENT') === 'live_mode' ? 'live_mode' : 'test_mode'
}

let client: DodoPayments | null = null
export function getDodo() {
  if (!client) {
    client = new DodoPayments({
      bearerToken: env('DODO_PAYMENTS_API_KEY'),
      webhookKey: env('DODO_PAYMENTS_WEBHOOK_KEY') ?? null,
      environment: dodoMode(),
    })
  }
  return client
}
