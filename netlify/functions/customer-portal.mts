// POST /api/customer-portal — opens Dodo's hosted portal to manage or cancel.
import type { Config } from '@netlify/functions'
import { dodoConfigured, getDodo } from './_shared/dodo'
import { fail, json } from './_shared/http'
import { getEntitlement, getUser } from './_shared/supabaseAdmin'

export default async (req: Request) => {
  if (req.method !== 'POST') return fail(405, 'METHOD', 'Use POST.')
  if (!dodoConfigured()) return fail(503, 'PAYMENTS_NOT_CONFIGURED', 'Payments are not configured.')
  const user = await getUser(req)
  if (!user) return fail(401, 'AUTH', 'Please sign in again.')
  const ent = await getEntitlement(user.id)
  if (!ent?.dodo_customer_id) return fail(404, 'NO_SUBSCRIPTION', 'No subscription found for this workspace.')
  try {
    const portal = await getDodo().customers.customerPortal.create(ent.dodo_customer_id)
    return json(200, { link: portal.link })
  } catch (e) {
    console.error('customer-portal failed', (e as Error).message)
    return fail(502, 'PORTAL_FAILED', 'Could not open the subscription portal. Please try again.')
  }
}

export const config: Config = { path: '/api/customer-portal' }
