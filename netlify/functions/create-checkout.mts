// POST /api/create-checkout — { plan: 'starter' | 'pro', interval: 'month' | 'year' }
// New subscribers get a Dodo Payments hosted checkout. Someone already subscribed is moved to
// the new plan instead (Dodo charges or credits the difference), so nobody pays twice.
// Server-side only; the API key never reaches the browser. The plan is only unlocked by the
// verified webhook, never by this response.

import type { Config } from '@netlify/functions'
import { dodoConfigured, getDodo } from './_shared/dodo'
import { env, fail, json, siteUrl } from './_shared/http'
import { getEntitlement, getUser, paidPlanOf, supabaseConfigured } from './_shared/supabaseAdmin'
import { isInterval, isPaidPlan, PLAN_NAME, planForProduct, PRODUCT_ENV } from '../../src/lib/plans'

export default async (req: Request) => {
  if (req.method !== 'POST') return fail(405, 'METHOD', 'Use POST.')
  if (!supabaseConfigured()) return fail(503, 'NOT_CONFIGURED', 'Accounts are not configured on this deployment.')
  if (!dodoConfigured()) return fail(503, 'PAYMENTS_NOT_CONFIGURED', 'Payments are not configured on this deployment yet.')
  const user = await getUser(req)
  if (!user) return fail(401, 'AUTH', 'Please sign in to upgrade.')

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown; interval?: unknown }
  // Older clients sent no body: they meant Pro monthly.
  const plan = body.plan === undefined ? 'pro' : body.plan
  const interval = body.interval === undefined ? 'month' : body.interval
  if (!isPaidPlan(plan) || !isInterval(interval)) return fail(400, 'PLAN', 'Choose Starter or Pro, monthly or yearly.')
  const productId = env(PRODUCT_ENV[plan][interval])
  if (!productId) return fail(503, 'PLAN_NOT_AVAILABLE', `${PLAN_NAME[plan]} ${interval === 'year' ? 'yearly' : 'monthly'} isn’t available yet. Please choose another option or contact us.`)

  const ent = await getEntitlement(user.id)
  const current = paidPlanOf(ent)

  // Already subscribed: change the plan on the existing subscription.
  if (current && ent?.dodo_subscription_id) {
    const now = planForProduct(ent.dodo_product_id, env) ?? { plan: current, interval: ent.billing_interval ?? ('month' as const) }
    if (now.plan === plan && now.interval === interval) return fail(409, 'SAME_PLAN', `You’re already on ${PLAN_NAME[plan]} ${interval === 'year' ? 'yearly' : 'monthly'}.`)
    try {
      const res = await getDodo().subscriptions.changePlan(ent.dodo_subscription_id, {
        product_id: productId,
        quantity: 1,
        proration_billing_mode: 'prorated_immediately',
      })
      // Dodo may need the customer to pay the difference on its own page.
      return json(200, res.payment_link ? { checkout_url: res.payment_link } : { changed: true })
    } catch (e) {
      const err = e as { status?: number; message?: string }
      console.error('change-plan failed', err.status, err.message)
      return fail(502, 'CHANGE_FAILED', 'Could not change your plan with Dodo Payments. Please try again, or use “Manage subscription”.')
    }
  }

  const site = siteUrl(req)
  const name = (user.user_metadata?.business_name as string | undefined)?.trim() || user.email!.split('@')[0]
  try {
    const session = await getDodo().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: ent?.dodo_customer_id ? { customer_id: ent.dodo_customer_id } : { email: user.email!, name },
      return_url: `${site}/app/billing?checkout=return`,
      cancel_url: `${site}/app/billing?checkout=return&status=cancelled`,
      metadata: { user_id: user.id, app: 'returnrescue', plan, interval },
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
