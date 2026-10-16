// POST /api/create-checkout — creates a Dodo Payments hosted checkout session
// for the Pro subscription. Server-side only; the API key never reaches the browser.

import type { Config } from '@netlify/functions'
import { dodoConfigured, getDodo } from './_shared/dodo'
import { env, fail, json, siteUrl } from './_shared/http'
import { getEntitlement, getUser, isProRow, supabaseConfigured } from './_shared/supabaseAdmin'

export default async (req: Request) => {
  if (req.method !== 'POST') return fail(405, 'METHOD', 'Use POST.')
  if (!supabaseConfigured()) return fail(503, 'NOT_CONFIGURED', 'Accounts are not configured on this deployment.')
  if (!dodoConfigured()) return fail(503, 'PAYMENTS_NOT_CONFIGURED', 'Payments are not configured on this deployment yet.')
  const user = await getUser(req)
  if (!user) return fail(401, 'AUTH', 'Please sign in to upgrade.')

  const ent = await getEntitlement(user.id)
  if (isProRow(ent)) return fail(409, 'ALREADY_PRO', 'Your workspace is already on Pro.')

  const site = siteUrl(req)
  const name = (user.user_metadata?.business_name as string | undefined)?.trim() || user.email!.split('@')[0]
  try {
    const session = await getDodo().checkoutSessions.create({
      product_cart: [{ product_id: env('DODO_PRO_PRODUCT_ID')!, quantity: 1 }],
      customer: ent?.dodo_customer_id ? { customer_id: ent.dodo_customer_id } : { email: user.email!, name },
      return_url: `${site}/app/billing?checkout=return`,
      cancel_url: `${site}/app/billing?checkout=return&status=cancelled`,
      metadata: { user_id: user.id, app: 'returnrescue' },
    })
    if (!session.checkout_url) throw new Error('No checkout URL returned')
    return json(200, { checkout_url: session.checkout_url })
  } catch (e) {
    const err = e as { status?: number; message?: string }
    console.error('create-checkout failed', err.status, err.message)
    return fail(502, 'CHECKOUT_FAILED', 'Could not start checkout with Dodo Payments. Please try again in a moment.')
  }
}

export const config: Config = { path: '/api/create-checkout' }
