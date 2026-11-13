import { Check, CreditCard, ExternalLink, Loader2, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { IntervalToggle, PlanCard } from '../components/pricing'
import { config, LIMITS, PACK_LINE, WITHOUT_PLAN } from '../config'
import { useAuth, type Entitlement } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { api } from '../lib/api'
import { shortDate } from '../lib/format'
import { activePlan, LAUNCH, PACK, packsOf, PLAN_NAME, type Interval, type PaidPlan } from '../lib/plans'
import { supabase } from '../lib/supabase'

type ReturnState = 'idle' | 'confirming' | 'confirmed' | 'pack' | 'pending' | 'failed'

const planSignature = (e: Entitlement | null) => [e?.plan, e?.billing_interval, e?.dodo_product_id, e?.updated_at].join('|')

export default function BillingPage() {
  const { entitlement, plan, launch, ai, refresh } = useAuth()
  const { items } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState<PaidPlan | 'portal' | 'pack' | null>(null)
  // Older subscriptions (before yearly billing) have no interval saved: they're monthly.
  const current = plan ? { plan, interval: entitlement?.billing_interval ?? ('month' as Interval) } : null
  const [interval, setInterval] = useState<Interval>(current?.interval ?? 'month')
  const [error, setError] = useState('')
  const [ret, setRet] = useState<ReturnState>('idle')
  const polling = useRef(false)

  // Returning from Dodo checkout. The URL alone never unlocks anything: we wait
  // for the verified webhook to update the entitlement row in the database.
  useEffect(() => {
    if (params.get('checkout') !== 'return' || polling.current) return
    const status = (params.get('status') ?? '').toLowerCase()
    if (['failed', 'cancelled', 'canceled', 'declined'].includes(status)) {
      setRet('failed')
      return
    }
    polling.current = true
    setRet('confirming')
    let tries = 0
    // A plan change passes what the subscription looked like before; a new checkout doesn't.
    const before = params.get('from')
    const isPack = params.get('pack') === '1'
    const tick = async () => {
      tries++
      if (isPack) {
        // A pack is added to the account by the verified webhook; look for one bought in the last 15 minutes.
        const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } }
        if (packsOf(data.user?.app_metadata).some((p) => Date.now() - Date.parse(p.at) < 15 * 60_000)) {
          await refresh()
          setRet('pack')
          return
        }
      } else {
        const e = await refresh()
        if (activePlan(e) && (before === null || planSignature(e) !== before)) {
          setRet('confirmed')
          return
        }
      }
      if (tries >= 20) {
        setRet('pending')
        return
      }
      setTimeout(tick, 2000)
    }
    tick()
  }, [params, refresh])

  const choose = async (p: PaidPlan) => {
    setError('')
    setBusy(p)
    try {
      const res = await api.createCheckout(p, interval)
      if (res.checkout_url) {
        window.location.assign(res.checkout_url)
        return
      }
      // Plan changed on the existing subscription: wait for Dodo's confirmation.
      polling.current = false
      setParams({ checkout: 'return', from: planSignature(entitlement), t: String(Date.now()) })
      setBusy(null)
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  const buyPack = async () => {
    setError('')
    setBusy('pack')
    try {
      const res = await api.buyPack()
      if (res.checkout_url) window.location.assign(res.checkout_url)
      else setBusy(null)
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  const openPortal = async () => {
    setError('')
    setBusy('portal')
    try {
      const { link } = await api.customerPortal()
      window.location.assign(link)
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader title="Plan & billing" subtitle="Subscriptions are processed securely by Dodo Payments." />

      {ret === 'confirming' && (
        <Alert tone="info" icon={<Loader2 className="size-4 animate-spin" />} title="Confirming your payment…" className="mb-4">
          Waiting for Dodo Payments to confirm the subscription. Your plan unlocks as soon as the confirmation arrives.
        </Alert>
      )}
      {ret === 'confirmed' && (
        <Alert tone="success" icon={<Check className="size-4" />} title={`You’re on ${plan ? PLAN_NAME[plan] : 'your new plan'}`} className="mb-4">
          Payment confirmed. Everything in your plan is unlocked.
        </Alert>
      )}
      {ret === 'pack' && (
        <Alert tone="success" icon={<Check className="size-4" />} title={`${PACK.inspections} AI inspections added`} className="mb-4">
          Payment confirmed. You have {ai.remaining} AI inspections to use.
        </Alert>
      )}
      {ret === 'pending' && (
        <Alert tone="warning" title="Still waiting for confirmation" className="mb-4">
          We haven’t received Dodo’s confirmation yet. If you completed payment, refresh this page in a minute. If you closed the checkout, no charge was made.
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => { polling.current = false; setParams({ checkout: 'return', t: String(Date.now()) }) }}>Check again</Button>
        </Alert>
      )}
      {ret === 'failed' && (
        <Alert tone="error" icon={<XCircle className="size-4" />} title="Payment didn’t go through" className="mb-4">
          The checkout was cancelled or the payment failed, so your plan hasn’t changed. You can try again below.
        </Alert>
      )}
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <Card>
        <CardHeader title="Current plan" action={<Badge tone={plan || launch ? 'brand' : 'neutral'}>{plan ? PLAN_NAME[plan] : launch ? 'Launch weekend' : 'Free'}</Badge>} />
        <div className="space-y-4 p-5">
          {plan ? (
            <>
              <p className="text-sm text-ink-2">
                Your <strong>{PLAN_NAME[plan]}</strong> plan is active{current ? (current.interval === 'year' ? ', billed yearly' : ', billed monthly') : ''}.
                {entitlement?.current_period_end && (
                  <> {entitlement.cancel_at_period_end ? 'Access ends' : 'Next renewal'} on <strong>{shortDate(entitlement.current_period_end)}</strong>.</>
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Usage label="AI inspections, last 30 days" used={ai.limit - ai.remaining} limit={ai.limit} />
              </div>
              <Button variant="secondary" icon={<ExternalLink className="size-4" />} onClick={openPortal} loading={busy === 'portal'}>
                Manage or cancel subscription
              </Button>
            </>
          ) : (
            <>
              {launch ? (
                <p className="text-sm text-ink-2">
                  <strong>Launch weekend:</strong> every feature is free for everyone until <strong>{LAUNCH.endLabel}</strong>, with {LAUNCH.freeInspections} AI inspections each. No card needed.
                </p>
              ) : (
                <p className="text-sm text-ink-2">
                  {entitlement && entitlement.status !== 'none' ? `Your subscription is ${entitlement.status.replace('_', ' ')}. ` : ''}{WITHOUT_PLAN}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Usage label="AI inspections used" used={ai.limit - ai.remaining} limit={ai.limit} />
                {!launch && <Usage label="Stored returns (without a plan)" used={items.length} limit={LIMITS.freeItems} />}
              </div>
              <div className="rounded-xl border border-line bg-paper p-4">
                <p className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-brand-700" /> Need more AI inspections?</p>
                <p className="mt-1 text-sm text-ink-2">
                  {PACK_LINE}, one-time — no subscription. Up to {PACK.maxPer30Days} packs every 30 days; for more, Starter includes 100 a month.
                </p>
                <Button className="mt-3" icon={<CreditCard className="size-4" />} onClick={buyPack} loading={busy === 'pack'} disabled={ai.packsLeft <= 0 || !!busy || ret === 'confirming'}>
                  {ai.packsLeft > 0 ? `Get ${PACK.inspections} inspections for ₹${PACK.price}` : 'Pack limit reached this month'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{plan ? 'Change plan' : 'Choose a plan'}</h2>
        <IntervalToggle value={interval} onChange={setInterval} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(['starter', 'pro'] as const).map((p) => {
          const isCurrent = !!plan && current?.plan === p && current.interval === interval
          return (
            <PlanCard
              key={p}
              plan={p}
              interval={interval}
              highlight={p === 'pro'}
              badge={isCurrent ? <Badge tone="brand">Current plan</Badge> : p === 'pro' ? <Badge tone="dark">Recommended</Badge> : undefined}
              action={
                <Button
                  size="lg"
                  variant={p === 'pro' ? 'primary' : 'secondary'}
                  className="w-full"
                  icon={<CreditCard className="size-4" />}
                  onClick={() => choose(p)}
                  loading={busy === p}
                  disabled={isCurrent || !!busy || ret === 'confirming'}
                >
                  {isCurrent ? 'Your current plan' : plan ? `Switch to ${PLAN_NAME[p]}` : `Choose ${PLAN_NAME[p]}`}
                </Button>
              }
            />
          )
        })}
      </div>
      <p className="mt-4 flex items-start gap-1.5 text-xs text-muted">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Hosted, secure checkout by Dodo Payments. Cancel anytime from the subscription portal. Prices in INR include applicable taxes as shown at checkout.
        {plan && ' Switching plans charges or credits the difference straight away.'}
      </p>
      {config.paymentsMode === 'test' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Test mode:</strong> no real money moves. Use a Dodo Payments test card at checkout: 4242 4242 4242 4242, expiry 06/32, CVV 123. Decline test: 4000 0000 0000 0002.
        </p>
      )}
    </>
  )
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100)
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="font-medium tabular">{used} / {limit}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
