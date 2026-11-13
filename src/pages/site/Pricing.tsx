import { Check, Minus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IntervalToggle, PlanCard, StartCard } from '../../components/pricing'
import { PublicLayout } from '../../components/SiteChrome'
import { buttonClass } from '../../components/ui'
import { accountsEnabled, offer, PACK_LINE, WITHOUT_PLAN } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { inr } from '../../lib/format'
import { AI_INSPECTIONS, FREE_ITEMS, LAUNCH, PACK, PLAN_NAME, PRICE, yearlySaving, type Interval } from '../../lib/plans'
import { FAQS } from './faqs'
import { CtaBand, Eyebrow, PageIntro, Reveal, usePageMeta } from './shared'

const yes = <Check className="mx-auto size-4 text-brand-600" aria-label="Included" />
const no = <Minus className="mx-auto size-4 text-muted" aria-label="Not included" />

// The first column is the launch weekend while it runs, then the one-time pack.
const rows = (open: boolean): [string, ReactNode, ReactNode, ReactNode][] => [
  ['AI photo inspections', open ? `${LAUNCH.freeInspections} each` : `${PACK.inspections} per pack`, `${AI_INSPECTIONS.starter} a month`, <>{AI_INSPECTIONS.pro} a month<span className="block text-muted">fair use</span></>],
  ['Returns stored', open ? 'Unlimited' : `Up to ${FREE_ITEMS}`, 'Unlimited', 'Unlimited'],
  ['Automatic grading and best option', yes, yes, yes],
  ['Platform fees, GST and delivery', yes, yes, yes],
  ['Sourced rate card you can edit', yes, yes, yes],
  ['Next steps and partner directory', yes, yes, yes],
  ['Dashboard', yes, yes, yes],
  ['CSV export', open ? yes : no, yes, yes],
  ['AI-written briefings', open ? yes : no, no, yes],
]

export default function Pricing() {
  usePageMeta('/pricing')
  const { session } = useAuth()
  const [interval, setInterval] = useState<Interval>('month')
  const paidHref = session ? '/app/billing' : accountsEnabled ? '/signup?next=/app/billing' : '/demo'
  const o = offer()

  return (
    <PublicLayout>
      <PageIntro eyebrow="Pricing" title={o.open ? <>Free for everyone this weekend.</> : <>Start at ₹{PACK.price}. No subscription needed.</>}>
        {o.open ? `${o.detail} ` : `${PACK.inspections} AI inspections for ₹${PACK.price}, one-time. `}
        For regular use, pay monthly or yearly and save: {inr(yearlySaving('starter'))} a year on Starter, {inr(yearlySaving('pro'))} on Pro.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex justify-center">
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Reveal>
            <StartCard action={<Link to={session ? '/app/billing' : accountsEnabled ? '/signup' : '/demo'} className={buttonClass(o.open ? 'primary' : 'secondary', 'lg', 'w-full')}>{o.open ? 'Try it free' : `Get ${PACK.inspections} for ₹${PACK.price}`}</Link>} />
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
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted">
          {o.open && <>Need more than {LAUNCH.freeInspections} AI inspections this weekend? {PACK_LINE}, one-time. </>}Prices in INR, including applicable taxes as shown at checkout. Payments by Dodo Payments. {WITHOUT_PLAN}{' '}
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
                  <th className="px-1 py-3 text-center sm:px-2 font-semibold">{o.open ? 'Launch weekend' : '₹69 pack'}</th>
                  <th className="px-1 py-3 text-center sm:px-2 font-semibold">Starter</th>
                  <th className="px-1 py-3 text-center sm:px-2 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows(o.open).map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row" className="py-3 pr-2 sm:pr-4 text-left font-normal text-ink-2">{label}</th>
                    {cells.map((c, i) => <td key={i} className="px-1 py-3 text-center sm:px-2">{c}</td>)}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="py-3 pr-2 sm:pr-4 text-left font-normal text-ink-2">Price</th>
                  <td className="px-1 py-3 text-center sm:px-2">{o.open ? <>₹0<span className="block text-xs text-muted sm:text-sm">until Sun</span></> : <>₹{PACK.price}<span className="block text-xs text-muted sm:text-sm">one-time</span></>}</td>
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
