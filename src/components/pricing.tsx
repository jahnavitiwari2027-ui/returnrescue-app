import clsx from 'clsx'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { LAUNCH_FEATURES, offer } from '../config'
import { inr } from '../lib/format'
import { LAUNCH, PACK, PLAN_BLURB, PLAN_FEATURES, PLAN_NAME, PRICE, yearlyPerMonth, yearlySaving, type Interval, type PaidPlan } from '../lib/plans'

/** Monthly / Yearly switch. The yearly side says how much it saves. */
export function IntervalToggle({ value, onChange, className }: { value: Interval; onChange: (i: Interval) => void; className?: string }) {
  const best = Math.max(yearlySaving('starter'), yearlySaving('pro'))
  return (
    <div role="radiogroup" aria-label="Billing period" className={clsx('inline-flex rounded-full border border-line bg-white p-1 text-sm', className)}>
      {(['month', 'year'] as const).map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(i)}
          className={clsx('rounded-full px-4 py-1.5 font-medium transition', value === i ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink')}
        >
          {i === 'month' ? 'Monthly' : <>Yearly <span className={clsx('ml-1 text-xs', value === i ? 'text-brand-200' : 'text-brand-700')}>save up to {inr(best)}</span></>}
        </button>
      ))}
    </div>
  )
}

/** The price block for a plan: the yearly view shows the per-month figure and the saving. */
export function PlanPrice({ plan, interval }: { plan: PaidPlan; interval: Interval }) {
  if (interval === 'month')
    return (
      <div className="mt-4">
        <p className="font-display text-5xl leading-none tabular">
          {inr(PRICE[plan].month)}
          <span className="font-sans text-base text-muted"> per month</span>
        </p>
        <p className="mt-2 text-xs text-muted">Billed monthly · or {inr(PRICE[plan].year)} a year and save {inr(yearlySaving(plan))}</p>
      </div>
    )
  return (
    <div className="mt-4">
      <p className="font-display text-5xl leading-none tabular">
        {inr(PRICE[plan].year)}
        <span className="font-sans text-base text-muted"> per year</span>
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Works out to {inr(yearlyPerMonth(plan))} a month</span>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-800 ring-1 ring-brand-200">Save {inr(yearlySaving(plan))} a year</span>
      </p>
      <p className="mt-1 text-xs text-muted">
        <span className="line-through">{inr(PRICE[plan].month * 12)}</span> if paid monthly
      </p>
    </div>
  )
}

export function PlanCard({ plan, interval, action, badge, highlight }: { plan: PaidPlan; interval: Interval; action: ReactNode; badge?: ReactNode; highlight?: boolean }) {
  return (
    <div className={clsx('relative flex h-full flex-col rounded-3xl border bg-white p-7', highlight ? 'border-brand-700 shadow-xl shadow-brand-900/10 ring-1 ring-brand-700' : 'border-line')}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{PLAN_NAME[plan]}</h3>
        {badge}
      </div>
      <p className="mt-1 text-sm text-muted">{PLAN_BLURB[plan]}</p>
      <PlanPrice plan={plan} interval={interval} />
      <ul className="mt-6 flex-1 space-y-2 text-sm">
        {PLAN_FEATURES[plan].map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{f}</li>)}
      </ul>
      <div className="mt-7">{action}</div>
    </div>
  )
}

/** What to start with: the launch weekend while it runs, then the one-time pack. */
export function StartCard({ action }: { action: ReactNode }) {
  const open = offer().open
  const features = open
    ? LAUNCH_FEATURES
    : [`${PACK.inspections} AI photo inspections`, 'Automatic grading and best option', 'Calculator, next steps and partners', `Up to ${PACK.maxPer30Days} packs a month`]
  return (
    <div className={clsx('flex h-full flex-col rounded-3xl border bg-white p-7', open ? 'border-brand-700 ring-1 ring-brand-700' : 'border-line')}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{open ? 'Launch weekend' : 'Pay as you go'}</h3>
        {open && <span className="rounded-full bg-brand-700 px-2.5 py-0.5 text-xs font-medium text-white">Ends {LAUNCH.endLabel.split(',')[0]}</span>}
      </div>
      <p className="mt-1 text-sm text-muted">{open ? 'Everything free for everyone while we launch.' : 'Try AI inspection without a subscription.'}</p>
      <p className="mt-4 font-display text-5xl leading-none tabular">
        {open ? '₹0' : `₹${PACK.price}`}
        <span className="font-sans text-base text-muted">{open ? ` until ${LAUNCH.endLabel}` : ' one-time'}</span>
      </p>
      <p className="mt-2 text-xs text-muted">{open ? 'No card needed' : 'No subscription · no card saved'}</p>
      <ul className="mt-6 flex-1 space-y-2 text-sm">
        {features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{f}</li>)}
      </ul>
      <div className="mt-7">{action}</div>
    </div>
  )
}
