// Verifies that the Dodo SDK's Standard Webhooks verification (used by
// dodo-webhook.mts) accepts correctly signed payloads and rejects tampered,
// unsigned or stale ones.
import { createHmac, randomBytes } from 'node:crypto'
import DodoPayments from 'dodopayments'
import { describe, expect, it } from 'vitest'

const rawSecret = randomBytes(24)
const secret = `whsec_${rawSecret.toString('base64')}`
const client = new DodoPayments({ bearerToken: 'test', webhookKey: secret, environment: 'test_mode' })

function sign(id: string, ts: number, body: string) {
  const sig = createHmac('sha256', rawSecret).update(`${id}.${ts}.${body}`).digest('base64')
  return { 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': `v1,${sig}` }
}

const body = JSON.stringify({
  business_id: 'bus_test',
  type: 'subscription.active',
  timestamp: new Date().toISOString(),
  data: { subscription_id: 'sub_123', status: 'active', product_id: 'pdt_pro', metadata: { user_id: '00000000-0000-0000-0000-000000000000' }, customer: { customer_id: 'cus_1', email: 'a@b.co', name: 'A' } },
})

describe('Dodo webhook signature verification', () => {
  it('accepts a correctly signed event', () => {
    const now = Math.floor(Date.now() / 1000)
    const evt = client.webhooks.unwrap(body, { headers: sign('msg_1', now, body) }) as { type: string }
    expect(evt.type).toBe('subscription.active')
  })
  it('rejects a tampered body', () => {
    const now = Math.floor(Date.now() / 1000)
    const headers = sign('msg_2', now, body)
    expect(() => client.webhooks.unwrap(body.replace('active', 'expired'), { headers })).toThrow()
  })
  it('rejects a missing signature', () => {
    expect(() => client.webhooks.unwrap(body, { headers: { 'webhook-id': 'x', 'webhook-timestamp': '1', 'webhook-signature': '' } })).toThrow()
  })
  it('rejects a stale timestamp (replay)', () => {
    const old = Math.floor(Date.now() / 1000) - 60 * 60
    expect(() => client.webhooks.unwrap(body, { headers: sign('msg_3', old, body) })).toThrow()
  })
})
