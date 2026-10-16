import { Check, CreditCard, ExternalLink, Loader2, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardHeader, PageHeader } from '../components/ui'
import { AFTER_TRIAL, config, LIMITS, PLANS } from '../config'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { api } from '../lib/api'
import { inr, shortDate } from '../lib/format'

type ReturnState = 'idle' | 'confirming' | 'confirmed' | 'pending' | 'failed'

export default function BillingPage() {
  const { entitlement, isPro, inTrial, trialDaysLeft, trialEndsAt, refresh, aiInspectionsUsed } = useAuth()
  const { items } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null)
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
    const tick = async () => {
      tries++
      const e = await refresh()
      if (e?.plan === 'pro' && e.status === 'active') {
        setRet('confirmed')
        return
      }
      if (tries >= 20) {
        setRet('pending')
        return
      }
      setTimeout(tick, 2000)
    }
    tick()
  }, [params, refresh])

  const startCheckout = async () => {
    setError('')
    setBusy('checkout')
    try {
      const { checkout_url } = await api.createCheckout()
      window.location.assign(checkout_url)
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

  const pro = PLANS.find((p) => p.id === 'pro')!

  return (
    <>
      <PageHeader title="Plan & billing" subtitle="Subscriptions are processed securely by Dodo Payments." />

      {ret === 'confirming' && (
        <Alert tone="info" icon={<Loader2 className="size-4 animate-spin" />} title="Confirming your payment…" className="mb-4">
          Waiting for Dodo Payments to confirm the subscription. Pro unlocks as soon as the confirmation arrives.
        </Alert>
      )}
      {ret === 'confirmed' && (
        <Alert tone="success" icon={<Check className="size-4" />} title="You’re on Pro" className="mb-4">
          Payment confirmed. All Pro features are unlocked.
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Current plan" action={<Badge tone={isPro ? 'brand' : 'neutral'}>{isPro ? 'Pro' : 'Free'}</Badge>} />
          <div className="space-y-4 p-5">
            {isPro ? (
              <>
                <p className="text-sm text-ink-2">
                  ReturnRescue Pro is active.
                  {entitlement?.current_period_end && (
                    <> {entitlement.cancel_at_period_end ? 'Access ends' : 'Next renewal'} on <strong>{shortDate(entitlement.current_period_end)}</strong>.</>
                  )}
                </p>
                <Button variant="secondary" icon={<ExternalLink className="size-4" />} onClick={openPortal} loading={busy === 'portal'}>
                  Manage or cancel subscription
                </Button>
              </>
            ) : (
              <>
                {inTrial ? (
                  <p className="text-sm text-ink-2">
                    You’re on the <strong>free trial</strong> with full Pro features — <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left</strong>
                    {trialEndsAt && <> (ends {shortDate(trialEndsAt.toISOString())})</>}. No card needed until you choose to upgrade.
                  </p>
                ) : (
                  <p className="text-sm text-ink-2">
                    Your free trial has ended{entitlement && entitlement.status !== 'none' ? ` (last subscription status: ${entitlement.status.replace('_', ' ')})` : ''}. {AFTER_TRIAL}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {inTrial ? (
                    <Usage label="Trial AI inspections" used={aiInspectionsUsed} limit={LIMITS.trialAiInspections} />
                  ) : (
                    <Usage label="Stored returns (free plan)" used={items.length} limit={LIMITS.freeItems} />
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className={isPro ? '' : 'border-brand-700 ring-1 ring-brand-700'}>
          <div className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-brand-700" /> ReturnRescue Pro</p>
            <p className="mt-3 font-display text-5xl leading-none tabular">
              {inr(pro.price)}
              <span className="font-sans text-base text-muted"> / month</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {pro.features.map((f) => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{f}</li>
              ))}
            </ul>
            {!isPro && (
              <Button size="lg" className="mt-5 w-full" icon={<CreditCard className="size-4" />} onClick={startCheckout} loading={busy === 'checkout'} disabled={ret === 'confirming'}>
                Upgrade with Dodo Payments
              </Button>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Hosted, secure checkout. Cancel anytime from the subscription portal. Prices include applicable taxes as shown at checkout.
            </p>
            {config.paymentsMode === 'test' && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <strong>Test mode:</strong> no real money moves. Use a Dodo Payments test card at checkout: 4242 4242 4242 4242, expiry 06/32, CVV 123. Decline test: 4000 0000 0000 0002.
              </p>
            )}
          </div>
        </Card>
      </div>
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
