import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../../components/SiteChrome'
import { buttonClass } from '../../components/ui'
import { accountsEnabled, offer } from '../../config'
import { inr, pct } from '../../lib/format'
import { CONDITION_LABEL } from '../../lib/quote'
import {
  byPlatform,
  liquidateEverythingLoss,
  minorFlawCost,
  platformSpread,
  recoveryRate,
  recyclingRange,
  REPORT_CATEGORIES,
  REPORT_DATE,
  REPORT_PRICES,
  samePlatformsCompare,
  scenarios,
} from '../../lib/report'
import { CtaBand, Eyebrow, PageIntro, Reveal, usePageMeta } from './shared'

export default function Report() {
  usePageMeta('/returns-report-2026')
  const r = useMemo(() => {
    const like = recoveryRate((s) => s.condition === 'A')
    const minor = recoveryRate((s) => s.condition === 'B')
    const damaged = recoveryRate((s) => s.condition === 'C')
    const shirt = samePlatformsCompare('Topwear', 2999)
    const hi = shirt.reduce((a, b) => (b.net > a.net ? b : a))
    const lo = shirt.reduce((a, b) => (b.net < a.net ? b : a))
    return {
      n: scenarios().length,
      like,
      minor,
      damaged,
      flaw: minorFlawCost(),
      spread: platformSpread(),
      shirt,
      hi,
      lo,
      liqA: liquidateEverythingLoss('A'),
      liqB: liquidateEverythingLoss('B'),
      rec: recyclingRange(),
      table: (['A', 'B', 'C'] as const).map((c) => ({ c, rows: byPlatform(c) })),
    }
  }, [])

  const findings = [
    { big: pct(r.like), title: 'is the most a like-new return gets back', body: `On average, a return in perfect condition recovers ${pct(r.like)} of its selling price. The rest goes on marketplace fees, GST, packing and delivery — even when nothing is wrong with it.` },
    { big: pct(r.flaw.avg), title: 'of the price is lost to one small flaw', body: `A crease, a missing tag or a light scuff means it can’t be sold as new. Moving from “like new” to “minor, fixable issues” cuts what you recover by ${pct(r.flaw.avg)} of the price on average (${pct(r.flaw.min)}–${pct(r.flaw.max)}).` },
    { big: inr(r.hi.net - r.lo.net), title: 'difference for the same shirt, by platform', body: `The same ₹2,999 like-new shirt leaves ${inr(r.hi.net)} on ${r.hi.label} but ${inr(r.lo.net)} on ${r.lo.label}. Across all products and prices, the gap between the best and worst platform averages ${inr(r.spread.avg)}.` },
    { big: inr(r.liqA.rupees), title: 'thrown away per item by liquidating good stock', body: `Selling like-new returns to a liquidator instead of restocking them loses ${inr(r.liqA.rupees)} per item — ${pct(r.liqA.share)} of the price. For items with small, fixable flaws, repairing beats liquidating by ${inr(r.liqB.rupees)} per item.` },
    { big: `${inr(-r.rec.max)}–${inr(-r.rec.min)}`, title: 'is what recycling costs per item', body: `Sorting and transport make recycling a cost, not income. It only makes sense when nothing else is allowed — and damaged items still recover ${pct(r.damaged)} of their price through liquidation.` },
  ]

  return (
    <PublicLayout>
      <PageIntro eyebrow={`Report · ${REPORT_DATE}`} title="What a return really costs Indian fashion sellers in 2026">
        We ran {r.n} typical returns — {REPORT_CATEGORIES.length} product types, {REPORT_PRICES.length} price points, 4 places to sell and 3 conditions — through ReturnRescue’s calculator, using each platform’s published fees, GST, courier rates and real repair prices.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <Eyebrow>Key findings</Eyebrow>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {findings.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <article className="h-full rounded-3xl border border-line bg-white p-6">
                <p className="font-display text-5xl leading-none tabular text-brand-800">{f.big}</p>
                <h2 className="mt-3 font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <Eyebrow>By platform and condition</Eyebrow>
          <h2 className="mt-3 font-display text-4xl tracking-tight">Share of the price that reaches you</h2>
          <p className="mt-3 text-sm text-ink-2">Average across all {REPORT_CATEGORIES.length} product types and the {REPORT_PRICES.map((x) => inr(x)).join(', ')} price points, taking the best option each time.</p>
          <div className="mt-8 space-y-8">
            {r.table.map(({ c, rows }) => (
              <div key={c}>
                <h3 className="text-sm font-semibold">Grade {c} · {CONDITION_LABEL[c]}</h3>
                <dl className="mt-3 space-y-2">
                  {rows.map((x) => (
                    <div key={x.platform} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
                      <dt className="text-ink-2">{x.label}</dt>
                      <dd className="h-3 overflow-hidden rounded-full bg-paper-2" aria-hidden>
                        <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.max(2, Math.round(x.rate * 100))}%` }} />
                      </dd>
                      <dd className="text-right tabular">{pct(x.rate)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-line">
            <p className="border-b border-line bg-paper px-4 py-2 text-sm font-medium">One like-new ₹2,999 shirt, four places to sell it</p>
            <dl className="divide-y divide-line">
              {r.shirt.map((x) => (
                <div key={x.platform} className="flex justify-between px-4 py-2.5 text-sm">
                  <dt>{x.label}</dt>
                  <dd className="font-semibold tabular">{inr(x.net)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <Eyebrow>What this means</Eyebrow>
        <h2 className="mt-3 font-display text-4xl tracking-tight">Four things sellers can do this week</h2>
        <ol className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-2">
          <li><strong className="text-ink">1. Grade every return the same way.</strong> The grade decides the route, and one grade apart is worth around {pct(r.flaw.avg)} of the price. Inconsistent grading between two people is the most expensive habit in returns.</li>
          <li><strong className="text-ink">2. Don’t liquidate what you can restock or fix.</strong> Bulk sales feel fast, but they leave {inr(r.liqA.rupees)} per like-new item on the table.</li>
          <li><strong className="text-ink">3. Price each return for where it will sell again.</strong> Fees differ enough that the same item can be worth {inr(r.spread.avg)} more on another platform.</li>
          <li><strong className="text-ink">4. Count returns as money, not just inventory.</strong> At 100 returns a month, a few hundred rupees per item adds up to lakhs a year.</li>
        </ol>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link to="/calculator" className={buttonClass('primary', 'lg')}>Try your own numbers <ArrowRight className="size-4" /></Link>
          <Link to={accountsEnabled ? '/signup' : '/demo'} className={buttonClass('secondary', 'lg')}>{offer().cta}</Link>
        </div>
      </section>

      <section className="border-t border-line bg-paper-2/40">
        <div className="mx-auto max-w-4xl px-5 py-14 text-sm leading-relaxed text-ink-2">
          <Eyebrow>Method and limits</Eyebrow>
          <h2 className="mt-3 font-display text-3xl tracking-tight text-ink">How these numbers were made</h2>
          <ul className="mt-5 list-disc space-y-2 pl-5">
            <li>Every figure comes from ReturnRescue’s recovery calculator with its default rate card: Amazon.in, Flipkart and Meesho fee schedules, GST slabs, courier rates, Delhi minimum wage for in-house work, and real cleaner, cobbler, tailor, surplus and scrap prices. Each rate is <Link to="/features#rates" className="font-medium text-brand-700 underline">linked to its source</Link>.</li>
            <li>Scenarios: {REPORT_CATEGORIES.join(', ')} at {REPORT_PRICES.map((x) => inr(x)).join(', ')}, sold on each platform, in three conditions. Grade B assumes small defects (a crease and a missing tag, or a light scuff); grade C assumes one major defect (a lasting stain, worn sole or broken zip).</li>
            <li>Values are per unit, for a GST-registered seller, with return shipping already paid treated as a sunk cost.</li>
            <li><strong className="text-ink">These are modelled estimates, not observed sales.</strong> Your fees, discounts, repair partners and resale prices will differ — use the <Link to="/calculator" className="font-medium text-brand-700 underline">calculator</Link> or your own rate card to check your numbers.</li>
          </ul>
          <p className="mt-6 rounded-2xl border border-line bg-white p-4 text-xs">
            <strong>Cite this report:</strong> ReturnRescue, “What a return really costs Indian fashion sellers in 2026”, {REPORT_DATE}, returnrescue.dpdns.org/returns-report-2026
          </p>
        </div>
      </section>
      <CtaBand title="See what your returns are worth." body={offer().detail} />
    </PublicLayout>
  )
}
