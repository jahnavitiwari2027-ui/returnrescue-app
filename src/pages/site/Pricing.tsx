import { Check, Minus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IntervalToggle, PlanCard, TrialCard } from '../../components/pricing'
import { PublicLayout } from '../../components/SiteChrome'
import { buttonClass } from '../../components/ui'
import { accountsEnabled, PACK_LINE, trialLine, TRIAL_RUNS, WITHOUT_PLAN } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { inr } from '../../lib/format'
import { AI_INSPECTIONS, LAUNCH, PACK, PLAN_NAME, PRICE, yearlySaving, type Interval } from '../../lib/plans'
import { FAQS } from './faqs'
import { CtaBand, Eyebrow, PageIntro, Reveal, usePageMeta } from './shared'

const yes = <Check className="mx-auto size-4 text-brand-600" aria-label="Included" />
const no = <Minus className="mx-auto size-4 text-muted" aria-label="Not included" />

const ROWS: [string, ReactNode, ReactNode, ReactNode][] = [
  ['AI photo inspections', `${LAUNCH.freeInspections} complimentary`, `${AI_INSPECTIONS.starter} a month`, <>{AI_INSPECTIONS.pro} a month<span className="block text-muted">fair use</span></>],
  ['Returns stored', 'Unlimited', 'Unlimited', 'Unlimited'],
  ['Automatic grading and best option', yes, yes, yes],
  ['Platform fees, GST and delivery', yes, yes, yes],
  ['Sourced rate card you can edit', yes, yes, yes],
  ['Next steps and partner directory', yes, yes, yes],
  ['Dashboard and CSV export', yes, yes, yes],
  ['AI-written briefings', yes, no, yes],
]

export default function Pricing() {
  usePageMeta('/pricing')
  const { session } = useAuth()
  const [interval, setInterval] = useState<Interval>('month')
  const trialEnds = trialLine()?.match(/ends (.+?) ·/)?.[1]
  const paidHref = session ? '/app/billing' : accountsEnabled ? '/signup?next=/app/billing' : '/demo'

  return (
    <PublicLayout>
      <PageIntro eyebrow="Pricing" title={trialEnds ? <>Free trial ends {trialEnds}. Then pick a plan.</> : <>Plans from ₹{PACK.price}.</>}>
        {trialLine() ? `${TRIAL_RUNS[0].toUpperCase()}${TRIAL_RUNS.slice(1)}, every feature included, no card needed. ` : ''}Just need a few? {PACK_LINE}, one-time. Pay monthly, or yearly and save: {inr(yearlySaving('starter'))} a year on Starter, {inr(yearlySaving('pro'))} on Pro.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex justify-center">
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Reveal>
            <TrialCard action={<Link to={accountsEnabled ? '/signup' : '/demo'} className={buttonClass('secondary', 'lg', 'w-full')}>Start free trial</Link>} />
          </Reveal>
          {(['starter', 'pro'] as const).map((p, i) => (
            <Reveal key={p} delay={(i + 1) * 80}>
              <PlanCard
                plan={p}
                interval={interval}
                highlight={p === 'pro'}
                badge={p === 'pro' ? <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">Recommended</span> : undefined}
                action={<Link to={paidHref} className={buttonClass(p === 'pro' ? 'primary' : 'secondary', 'lg', 'w-full')}>Choose {PLAN_NAME[p]}</Link>}
              />
            </Reveal>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-3xl border border-line bg-white px-7 py-5 sm:flex-row">
          <div>
            <p className="font-semibold">Just need a few? <span className="font-display text-2xl tabular">₹{PACK.price}</span> <span className="text-sm font-normal text-muted">one-time</span></p>
            <p className="text-sm text-muted">{PACK.inspections} AI photo runs, no subscription. Up to {PACK.maxPer30Days} packs a month.</p>
          </div>
          <Link to={paidHref} className={buttonClass('secondary', 'lg', 'w-full sm:w-auto')}>Get {PACK.inspections} for ₹{PACK.price}</Link>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted">
          Prices in INR, including applicable taxes as shown at checkout. Payments by Dodo Payments. {WITHOUT_PLAN}{' '}
          <Link to="/refunds" className="underline">Refunds & cancellation</Link>.
        </p>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <Eyebrow>Compare</Eyebrow>
          <h2 className="mt-3 font-display text-4xl tracking-tight">What’s in each plan</h2>
          <div className="mt-8">
            <table className="w-full table-fixed text-[13px] sm:text-sm">
              <colgroup>
                <col className="w-[30%] sm:w-[40%]" />
                <col /><col /><col />
              </colgroup>
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="py-3 pr-2 sm:pr-4 font-medium text-muted"><span className="sr-only">Feature</span></th>
                  <th className="px-1 py-3 text-center sm:px-2 font-semibold">Free trial</th>
                  <th className="px-1 py-3 text-center sm:px-2 font-semibold">Starter</th>
                  <th className="px-1 py-3 text-center sm:px-2 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row" className="py-3 pr-2 sm:pr-4 text-left font-normal text-ink-2">{label}</th>
                    {cells.map((c, i) => <td key={i} className="px-1 py-3 text-center sm:px-2">{c}</td>)}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="py-3 pr-2 sm:pr-4 text-left font-normal text-ink-2">Price</th>
                  <td className="px-1 py-3 text-center sm:px-2">₹0<span className="block text-muted">until {LAUNCH.endLabel.split(',')[0]}</span></td>
                  <td className="px-1 py-3 text-center sm:px-2"><span className="whitespace-nowrap">{inr(PRICE.starter.month)}/mo</span><span className="block whitespace-nowrap text-xs text-muted sm:text-sm">{inr(PRICE.starter.year)}/yr</span></td>
                  <td className="px-1 py-3 text-center sm:px-2"><span className="whitespace-nowrap">{inr(PRICE.pro.month)}/mo</span><span className="block whitespace-nowrap text-xs text-muted sm:text-sm">{inr(PRICE.pro.year)}/yr</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16">
        <Eyebrow>Billing questions</Eyebrow>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQS.filter((f) => f.pricing).map((f) => (
            <details key={f.q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 pr-10 text-sm leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">More answers on the <Link to="/faq" className="font-medium text-brand-700 underline">FAQ page</Link>.</p>
      </section>

      <CtaBand />
    </PublicLayout>
  )
}
