// Runs the real webhook handler with a signed Dodo event and an in-memory database:
// each configured product sets the right plan and billing period, unknown products are
// ignored, and databases without the new columns still record the plan.
import { createHmac, randomBytes } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER = '00000000-0000-0000-0000-0000000000aa'
const rawSecret = randomBytes(24)
let upserts: Record<string, unknown>[] = []
let missingColumns = false

vi.mock('../netlify/functions/_shared/supabaseAdmin', () => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'limit']) c[m] = () => c
    c.maybeSingle = async () => result
    return c
  }
  const db = {
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: id === USER ? { id } : null } }) } },
    rpc: async () => ({ data: null }),
    from: (table: string) => ({
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
      select: () => chain({ data: table === 'webhook_events' ? null : null }),
      upsert: async (row: Record<string, unknown>) => {
        if (missingColumns && ('dodo_product_id' in row || 'billing_interval' in row))
          return { error: { message: "Could not find the 'dodo_product_id' column of 'entitlements' in the schema cache" } }
        upserts.push(row)
        return { error: null }
      },
    }),
  }
  return { getAdmin: () => db, supabaseConfigured: () => true }
})

process.env.DODO_PAYMENTS_WEBHOOK_KEY = `whsec_${rawSecret.toString('base64')}`
process.env.DODO_PAYMENTS_API_KEY = 'test'
process.env.DODO_PRO_PRODUCT_ID = 'pdt_pro_m'
process.env.DODO_PRO_YEARLY_PRODUCT_ID = 'pdt_pro_y'
process.env.DODO_STARTER_MONTHLY_PRODUCT_ID = 'pdt_st_m'
process.env.DODO_STARTER_YEARLY_PRODUCT_ID = 'pdt_st_y'

const { default: handler } = await import('../netlify/functions/dodo-webhook.mts')

let n = 0
async function send(product_id: string, status = 'active') {
  const body = JSON.stringify({
    business_id: 'bus_test',
    type: 'subscription.active',
    timestamp: new Date().toISOString(),
    data: { subscription_id: `sub_${++n}`, status, product_id, metadata: { user_id: USER }, customer: { customer_id: 'cus_1', email: 'a@b.co' } },
  })
  const id = `msg_${n}`
  const ts = Math.floor(Date.now() / 1000)
  const sig = createHmac('sha256', rawSecret).update(`${id}.${ts}.${body}`).digest('base64')
  const res = await handler(new Request('https://x/api/dodo-webhook', { method: 'POST', body, headers: { 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': `v1,${sig}` } }))
  return { status: res.status, body: await res.json() }
}

describe('Dodo webhook → plan', () => {
  beforeEach(() => {
    upserts = []
    missingColumns = false
  })

  it('sets plan and billing period from the product', async () => {
    for (const [pdt, plan, interval] of [['pdt_st_m', 'starter', 'month'], ['pdt_st_y', 'starter', 'year'], ['pdt_pro_m', 'pro', 'month'], ['pdt_pro_y', 'pro', 'year']] as const) {
      upserts = []
      expect((await send(pdt)).status).toBe(200)
      expect(upserts[0]).toMatchObject({ user_id: USER, plan, status: 'active', dodo_product_id: pdt, billing_interval: interval })
    }
  })

  it('ignores products that aren’t ReturnRescue plans', async () => {
    const r = await send('pdt_something_else')
    expect(r.body).toMatchObject({ ignored: 'other product' })
    expect(upserts).toHaveLength(0)
  })

  it('still records the plan when the database update hasn’t been run yet', async () => {
    missingColumns = true
    expect((await send('pdt_pro_y')).status).toBe(200)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({ plan: 'pro', status: 'active' })
    expect(upserts[0]).not.toHaveProperty('dodo_product_id')
  })

  it('records a cancelled subscription as not active', async () => {
    await send('pdt_st_m', 'cancelled')
    expect(upserts[0]).toMatchObject({ plan: 'starter', status: 'cancelled' })
  })
})

describe('live settings under their own names', () => {
  it('DODO_LIVE_* values win over the older ones', async () => {
    const { env } = await import('../netlify/functions/_shared/http')
    process.env.DODO_PAYMENTS_ENVIRONMENT = 'test_mode'
    process.env.DODO_LIVE_ENVIRONMENT = 'live_mode'
    process.env.DODO_LIVE_PRO_PRODUCT_ID = 'pdt_live'
    expect(env('DODO_PAYMENTS_ENVIRONMENT')).toBe('live_mode')
    expect(env('DODO_PRO_PRODUCT_ID')).toBe('pdt_live')
    delete process.env.DODO_LIVE_ENVIRONMENT
    delete process.env.DODO_LIVE_PRO_PRODUCT_ID
    expect(env('DODO_PAYMENTS_ENVIRONMENT')).toBe('test_mode')
    expect(env('DODO_PRO_PRODUCT_ID')).toBe('pdt_pro_m')
  })
})
