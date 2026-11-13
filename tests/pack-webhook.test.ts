// A signed payment.succeeded event for the ₹69 pack adds one pack to the account, once.
import { createHmac, randomBytes } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER = '00000000-0000-0000-0000-0000000000bb'
const rawSecret = randomBytes(24)
let meta: Record<string, unknown> = {}
let updates = 0

vi.mock('../netlify/functions/_shared/supabaseAdmin', () => {
  const db = {
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: id === USER ? { id, app_metadata: meta } : null }, error: null }),
        updateUserById: async (_id: string, attrs: { app_metadata: Record<string, unknown> }) => {
          updates++
          meta = attrs.app_metadata
          return { error: null }
        },
      },
    },
    rpc: async () => ({ data: null }),
    from: () => ({
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }), limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
    }),
  }
  return { getAdmin: () => db, supabaseConfigured: () => true }
})

process.env.DODO_PAYMENTS_WEBHOOK_KEY = `whsec_${rawSecret.toString('base64')}`
process.env.DODO_PAYMENTS_API_KEY = 'test'
process.env.DODO_PACK_PRODUCT_ID = 'pdt_pack'
const { default: handler } = await import('../netlify/functions/dodo-webhook.mts')

let n = 0
async function send(data: Record<string, unknown>) {
  const body = JSON.stringify({ business_id: 'bus', type: 'payment.succeeded', timestamp: new Date().toISOString(), data })
  const id = `msg_p${++n}`
  const ts = Math.floor(Date.now() / 1000)
  const sig = createHmac('sha256', rawSecret).update(`${id}.${ts}.${body}`).digest('base64')
  const res = await handler(new Request('https://x/api/dodo-webhook', { method: 'POST', body, headers: { 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': `v1,${sig}` } }))
  return res.status
}
const payment = (over: Record<string, unknown> = {}) => ({
  payment_id: 'pay_1',
  subscription_id: null,
  status: 'succeeded',
  metadata: { user_id: USER, kind: 'pack', app: 'returnrescue' },
  product_cart: [{ product_id: 'pdt_pack', quantity: 1 }],
  customer: { customer_id: 'cus_1', email: 'a@b.co' },
  ...over,
})

describe('pack webhook', () => {
  beforeEach(() => {
    meta = { provider: 'google' }
    updates = 0
  })

  it('adds the pack to the account and keeps other account data', async () => {
    expect(await send(payment())).toBe(200)
    expect(meta.provider).toBe('google')
    expect((meta.ai_packs as { id: string }[]).map((p) => p.id)).toEqual(['pay_1'])
  })

  it('counts the same payment only once', async () => {
    await send(payment())
    await send(payment())
    expect((meta.ai_packs as unknown[]).length).toBe(1)
    expect(updates).toBe(1)
  })

  it('ignores payments for other products, subscriptions, or without the pack tag', async () => {
    await send(payment({ product_cart: [{ product_id: 'pdt_other', quantity: 1 }] }))
    await send(payment({ subscription_id: 'sub_1' }))
    await send(payment({ metadata: { user_id: USER } }))
    expect(meta.ai_packs).toBeUndefined()
  })
})
