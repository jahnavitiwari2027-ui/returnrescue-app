// Runs the real create-checkout handler with stubbed Supabase and Dodo clients.
import { beforeEach, describe, expect, it, vi } from 'vitest'

let entitlement: Record<string, unknown> | null = null
const created: unknown[] = []
const changed: unknown[] = []

vi.mock('../netlify/functions/_shared/supabaseAdmin', async (orig) => {
  const real = await orig<typeof import('../netlify/functions/_shared/supabaseAdmin')>()
  return {
    ...real,
    supabaseConfigured: () => true,
    getUser: async () => ({ id: 'u1', email: 'owner@brand.in', user_metadata: { business_name: 'Brand' } }),
    getEntitlement: async () => entitlement,
  }
})
vi.mock('../netlify/functions/_shared/dodo', () => ({
  dodoConfigured: () => true,
  getDodo: () => ({
    checkoutSessions: { create: async (b: unknown) => (created.push(b), { checkout_url: 'https://checkout.dodo/abc' }) },
    subscriptions: { changePlan: async (id: string, b: unknown) => (changed.push({ id, ...(b as object) }), {}) },
  }),
}))

process.env.DODO_PRO_PRODUCT_ID = 'pdt_pro_m'
process.env.DODO_PRO_YEARLY_PRODUCT_ID = 'pdt_pro_y'
process.env.DODO_STARTER_MONTHLY_PRODUCT_ID = 'pdt_st_m'
delete process.env.DODO_STARTER_YEARLY_PRODUCT_ID

const { default: handler } = await import('../netlify/functions/create-checkout.mts')
const call = async (body?: unknown) => {
  const res = await handler(new Request('https://returnrescue.dpdns.org/api/create-checkout', { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), headers: { authorization: 'Bearer t' } }))
  return { status: res.status, body: await res.json() }
}

describe('checkout by plan', () => {
  beforeEach(() => {
    entitlement = null
    created.length = 0
    changed.length = 0
  })

  it('a new subscriber gets a checkout for the chosen product', async () => {
    const r = await call({ plan: 'starter', interval: 'month' })
    expect(r).toEqual({ status: 200, body: { checkout_url: 'https://checkout.dodo/abc' } })
    expect(created[0]).toMatchObject({ product_cart: [{ product_id: 'pdt_st_m', quantity: 1 }], metadata: { user_id: 'u1', plan: 'starter', interval: 'month' } })
  })

  it('an older client with no body still means Pro monthly', async () => {
    await call()
    expect(created[0]).toMatchObject({ product_cart: [{ product_id: 'pdt_pro_m', quantity: 1 }] })
  })

  it('rejects unknown plans, and plans whose product isn’t set up', async () => {
    expect((await call({ plan: 'enterprise', interval: 'month' })).status).toBe(400)
    expect((await call({ plan: 'pro', interval: 'weekly' })).status).toBe(400)
    const r = await call({ plan: 'starter', interval: 'year' })
    expect(r.status).toBe(503)
    expect(r.body.code).toBe('PLAN_NOT_AVAILABLE')
    expect(created).toHaveLength(0)
  })

  it('an existing subscriber is moved to the new plan instead of paying twice', async () => {
    entitlement = { plan: 'pro', status: 'active', dodo_subscription_id: 'sub_9', dodo_customer_id: 'cus_9', dodo_product_id: 'pdt_pro_m', billing_interval: 'month' }
    const r = await call({ plan: 'pro', interval: 'year' })
    expect(r).toEqual({ status: 200, body: { changed: true } })
    expect(changed[0]).toEqual({ id: 'sub_9', product_id: 'pdt_pro_y', quantity: 1, proration_billing_mode: 'prorated_immediately' })
    expect(created).toHaveLength(0)
  })

  it('choosing the plan you are already on does nothing', async () => {
    entitlement = { plan: 'starter', status: 'active', dodo_subscription_id: 'sub_9', dodo_product_id: 'pdt_st_m', billing_interval: 'month' }
    expect((await call({ plan: 'starter', interval: 'month' })).status).toBe(409)
    // An older Pro row with no product saved is treated as Pro monthly.
    entitlement = { plan: 'pro', status: 'active', dodo_subscription_id: 'sub_8' }
    expect((await call({ plan: 'pro', interval: 'month' })).status).toBe(409)
    expect(changed).toHaveLength(0)
  })
})
