// POST /api/dodo-webhook — receives Dodo Payments events.
// 1. Verifies the Standard Webhooks signature on the raw body (rejects otherwise).
// 2. Records the event id first, so retries/duplicates are processed exactly once.
// 3. Updates the user's entitlement from the subscription's own status.
// Paid features read only this server-written entitlement — never the redirect URL.

import type { Config } from '@netlify/functions'
import { getDodo } from './_shared/dodo'
import { env, fail, json } from './_shared/http'
import { getAdmin, supabaseConfigured } from './_shared/supabaseAdmin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface SubscriptionData {
  subscription_id: string
  status: string
  product_id: string
  next_billing_date?: string | null
  cancel_at_next_billing_date?: boolean
  metadata?: Record<string, string>
  customer?: { customer_id?: string; email?: string }
}

async function resolveUserId(sub: SubscriptionData): Promise<string | null> {
  const db = getAdmin()
  const meta = sub.metadata?.user_id
  if (meta && UUID.test(meta)) {
    const { data } = await db.auth.admin.getUserById(meta)
    if (data?.user) return data.user.id
  }
  const bySub = await db.from('entitlements').select('user_id').eq('dodo_subscription_id', sub.subscription_id).maybeSingle()
  if (bySub.data?.user_id) return bySub.data.user_id
  if (sub.customer?.customer_id) {
    const byCustomer = await db.from('entitlements').select('user_id').eq('dodo_customer_id', sub.customer.customer_id).limit(1).maybeSingle()
    if (byCustomer.data?.user_id) return byCustomer.data.user_id
  }
  if (sub.customer?.email) {
    const { data } = await db.rpc('user_id_by_email', { p_email: sub.customer.email })
    if (data) return data as string
  }
  return null
}

export default async (req: Request) => {
  if (req.method !== 'POST') return fail(405, 'METHOD', 'Use POST.')
  if (!env('DODO_PAYMENTS_WEBHOOK_KEY')) return fail(503, 'NOT_CONFIGURED', 'Webhook secret not configured.')
  if (!supabaseConfigured()) return fail(503, 'NOT_CONFIGURED', 'Database not configured.')

  const raw = await req.text()
  const headers = {
    'webhook-id': req.headers.get('webhook-id') ?? '',
    'webhook-signature': req.headers.get('webhook-signature') ?? '',
    'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
  }

  let event: { type: string; timestamp?: string; data: unknown }
  try {
    event = getDodo().webhooks.unwrap(raw, { headers }) as unknown as typeof event
  } catch (e) {
    console.warn('dodo-webhook: signature verification failed', (e as Error).message)
    return fail(401, 'INVALID_SIGNATURE', 'Invalid webhook signature.')
  }

  const db = getAdmin()
  const eventId = headers['webhook-id']
  const ins = await db.from('webhook_events').insert({ id: eventId, type: event.type, payload: JSON.parse(raw) })
  if (ins.error) {
    if (ins.error.code === '23505') {
      const prior = await db.from('webhook_events').select('processed_at').eq('id', eventId).maybeSingle()
      if (prior.data?.processed_at) return json(200, { received: true, duplicate: true })
      // Seen before but never finished (e.g. crashed mid-way): fall through and process again — the update is idempotent.
    } else {
      console.error('dodo-webhook: could not log event', ins.error.message)
      return fail(500, 'DB', 'Could not record event.')
    }
  }

  if (event.type.startsWith('subscription.')) {
    const sub = event.data as SubscriptionData
    const productId = env('DODO_PRO_PRODUCT_ID')
    if (productId && sub.product_id && sub.product_id !== productId) {
      await db.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('id', eventId)
      return json(200, { received: true, ignored: 'other product' })
    }
    const userId = await resolveUserId(sub)
    if (!userId) {
      console.error('dodo-webhook: no user for subscription', sub.subscription_id)
      // Acknowledge so Dodo stops retrying; the event stays logged unprocessed for manual follow-up.
      return json(200, { received: true, unmatched: true })
    }
    const eventAt = event.timestamp ?? new Date().toISOString()
    const current = await db.from('entitlements').select('last_event_at, dodo_subscription_id').eq('user_id', userId).maybeSingle()
    const stale =
      current.data?.last_event_at &&
      current.data.dodo_subscription_id === sub.subscription_id &&
      new Date(current.data.last_event_at) > new Date(eventAt)
    if (!stale) {
      const up = await db.from('entitlements').upsert(
        {
          user_id: userId,
          plan: 'pro',
          status: sub.status,
          dodo_subscription_id: sub.subscription_id,
          dodo_customer_id: sub.customer?.customer_id ?? null,
          current_period_end: sub.next_billing_date ?? null,
          cancel_at_period_end: !!sub.cancel_at_next_billing_date,
          last_event_at: eventAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (up.error) {
        console.error('dodo-webhook: entitlement update failed', up.error.message)
        return fail(500, 'DB', 'Could not update entitlement.') // non-2xx → Dodo retries
      }
    }
  }

  await db.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('id', eventId)
  return json(200, { received: true })
}

export const config: Config = { path: '/api/dodo-webhook' }
