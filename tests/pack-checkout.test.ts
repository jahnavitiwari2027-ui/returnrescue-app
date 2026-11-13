// The one-time ₹69 pack: checkout is created only for accounts without a plan and under the cap.
import { beforeEach, describe, expect, it, vi } from 'vitest'

let access: Record<string, unknown>
const created: unknown[] = []
vi.mock('../netlify/functions/_shared/supabaseAdmin', async (orig) => {
  const real = await orig<typeof import('../netlify/functions/_shared/supabaseAdmin')>()
  return {
    ...real,
    supabaseConfigured: () => true,
    getUser: async () => ({ id: 'u1', email: 'owner@brand.in', user_metadata: {} }),
    getEntitlement: async () => null,
    getAccess: async () => access,
  }
})
vi.mock('../netlify/functions/_shared/dodo', () => ({
  dodoConfigured: () => true,
  getDodo: () => ({ checkoutSessions: { create: async (b: unknown) => (created.push(b), { checkout_url: 'https://checkout.dodo/pack' }) } }),
}))
process.env.DODO_PACK_PRODUCT_ID = 'pdt_pack'

const { default: handler } = await import('../netlify/functions/create-checkout.mts')
const call = async () => {
  const res = await handler(new Request('https://returnrescue.dpdns.org/api/create-checkout', { method: 'POST', body: JSON.stringify({ pack: true }), headers: { authorization: 'Bearer t' } }))
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}
const ai = (packsLeft: number) => ({ remaining: 0, limit: 10, packsRecent: 2 - packsLeft, packsLeft })

describe('pack checkout', () => {
  beforeEach(() => {
    created.length = 0
    access = { plan: null, launch: false, exports: false, proFeatures: false, ai: ai(2) }
  })

  it('starts a one-time checkout tagged as a pack for this user', async () => {
    const r = await call()
    expect(r).toEqual({ status: 200, body: { checkout_url: 'https://checkout.dodo/pack' } })
    expect(created[0]).toMatchObject({ product_cart: [{ product_id: 'pdt_pack', quantity: 1 }], metadata: { user_id: 'u1', kind: 'pack' } })
    expect((created[0] as { return_url: string }).return_url).toMatch(/pack=1/)
  })

  it('refuses once two packs were bought in 30 days', async () => {
    access.ai = ai(0)
    const r = await call()
    expect(r.status).toBe(409)
    expect(r.body.code).toBe('PACK_LIMIT')
    expect(created).toHaveLength(0)
  })

  it('refuses for accounts on a plan', async () => {
    access.plan = 'starter'
    expect((await call()).status).toBe(409)
  })

  it('says so when the pack product is not set up', async () => {
    delete process.env.DODO_PACK_PRODUCT_ID
    expect((await call()).status).toBe(503)
    process.env.DODO_PACK_PRODUCT_ID = 'pdt_pack'
  })
})
