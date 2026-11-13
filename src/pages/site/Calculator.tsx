import clsx from 'clsx'
import { ArrowRight, ChevronDown, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../../components/SiteChrome'
import { buttonClass, Input, Select } from '../../components/ui'
import { accountsEnabled, offer } from '../../config'
import { inr, pct } from '../../lib/format'
import { CONDITION_LABEL, quoteReturn, type Condition } from '../../lib/quote'
import { LAUNCH, PACK } from '../../lib/plans'
import { PLATFORM_LABEL, PLATFORMS, type PlatformKey } from '../../lib/rates'
import { CATEGORIES, type Category } from '../../lib/types'
import { CtaBand, PageIntro, usePageMeta } from './shared'

/** Free, no-sign-up calculator: what one returned product is worth on each route, and per month. */
export default function Calculator() {
  usePageMeta('/calculator')
  const [category, setCategory] = useState<Category>('Topwear')
  const [price, setPrice] = useState('1499')
  const [platform, setPlatform] = useState<PlatformKey>('amazon')
  const [condition, setCondition] = useState<Condition>('B')
  const [perMonth, setPerMonth] = useState('50')
  const [open, setOpen] = useState<string | null>(null)

  const p = Math.min(Math.max(Number(price) || 0, 0), 10_00_000)
  const n = Math.min(Math.max(Math.round(Number(perMonth) || 0), 0), 1_00_000)
  const { calc } = useMemo(() => quoteReturn({ category, price: p || 1, platform, condition }), [category, p, platform, condition])
  const best = calc.routes.find((r) => r.route === calc.recommended)
  const liquidate = calc.routes.find((r) => r.route === 'liquidate')
  const gap = best && liquidate ? best.net - liquidate.net : 0

  return (
    <PublicLayout>
      <PageIntro eyebrow="Free calculator · no sign-up" title="What is a returned product really worth?">
        Pick the product, its price, where it sells and its condition. You’ll see what each option — restock, refurbish, liquidate or recycle — actually leaves you after fees, GST, repairs and delivery.
      </PageIntro>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 lg:grid-cols-[1fr_1.2fr]">
        <form className="space-y-4 rounded-3xl border border-line bg-white p-6" onSubmit={(e) => e.preventDefault()} aria-label="Return details">
          <div>
            <label htmlFor="calc-cat" className="mb-1.5 block text-sm font-medium text-ink-2">Product type</label>
            <Select id="calc-cat" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="calc-price" className="mb-1.5 block text-sm font-medium text-ink-2">Selling price (₹)</label>
            <Input id="calc-price" type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="tabular" />
          </div>
          <div>
            <label htmlFor="calc-plat" className="mb-1.5 block text-sm font-medium text-ink-2">Where it sells</label>
            <Select id="calc-plat" value={platform} onChange={(e) => setPlatform(e.target.value as PlatformKey)}>
              {PLATFORMS.map((x) => <option key={x} value={x}>{PLATFORM_LABEL[x]}</option>)}
            </Select>
          </div>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink-2">Condition when it came back</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {(['A', 'B', 'C'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={condition === c}
                  onClick={() => setCondition(c)}
                  className={clsx('rounded-xl border px-2 py-2.5 text-center text-sm transition', condition === c ? 'border-brand-700 bg-brand-50 font-medium ring-1 ring-brand-700' : 'border-line hover:bg-paper')}
                >
                  <span className="block font-semibold">Grade {c}</span>
                  <span className="block text-xs text-muted">{CONDITION_LABEL[c]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="calc-n" className="mb-1.5 block text-sm font-medium text-ink-2">Returns like this per month <span className="font-normal text-muted">(optional)</span></label>
            <Input id="calc-n" type="number" inputMode="numeric" min={0} value={perMonth} onChange={(e) => setPerMonth(e.target.value)} className="tabular" />
          </div>
          <p className="text-xs text-muted">Uses ReturnRescue’s published rate card: each platform’s fees, GST, courier rates and real repair prices. Typical defects are assumed for each grade.</p>
        </form>

        <div className="space-y-4" aria-live="polite">
          {best && (
            <div className="rounded-3xl bg-brand-800 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">Best option</p>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <p className="text-xl font-semibold">{best.label}</p>
                <p className="font-display text-5xl tabular">{inr(best.net)}</p>
              </div>
              <p className="mt-1 text-sm text-brand-100/85">per item · {pct(best.recoveryRate)} of the {inr(p)} price reaches you</p>
              {n > 0 && (
                <p className="mt-4 border-t border-white/15 pt-4 text-sm">
                  At <strong>{n}</strong> returns a month that’s <strong className="tabular">{inr(best.net * n)}</strong> recovered
                  {gap > 0 && <> — <strong className="tabular">{inr(gap * n)}</strong> more each month than liquidating them all</>}.
                </p>
              )}
            </div>
          )}
          <div className="space-y-1.5 rounded-3xl border border-line bg-white p-3">
            {calc.routes.map((r) => {
              const isOpen = open === r.route
              return (
                <div key={r.route} className={clsx('rounded-xl border', calc.recommended === r.route ? 'border-brand-600 bg-brand-50/60' : 'border-line', !r.eligible && 'opacity-55')}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : r.route)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {r.label}
                        {calc.recommended === r.route && <Trophy className="size-3.5 text-brand-700" aria-label="best" />}
                      </span>
                      <span className="block text-xs text-muted">{!r.eligible ? r.ineligibleReason : r.net < 0 ? 'Costs more than it brings in' : `Recovers ${pct(r.recoveryRate)} of the price`}</span>
                    </span>
                    <span className={clsx('font-display text-2xl tabular', r.net < 0 && 'text-red-700')}>{inr(r.net)}</span>
                    <ChevronDown className={clsx('size-4 shrink-0 text-muted transition', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <dl className="space-y-1 border-t border-line/70 px-3 py-2 text-[13px]">
                      {r.lines.map((l) => (
                        <div key={l.label} className="flex justify-between gap-3">
                          <dt className="text-ink-2">{l.label}</dt>
                          <dd className={clsx('tabular', l.amount < 0 && 'text-red-700')}>{inr(l.amount)}</dd>
                        </div>
                      ))}
                      <div className="flex justify-between gap-3 border-t border-line/70 pt-1 font-semibold"><dt>Net</dt><dd className="tabular">{inr(r.net)}</dd></div>
                    </dl>
                  )}
                </div>
              )
            })}
            <p className="px-2 pb-1 pt-2 text-xs text-muted">Tap an option for the rupee-by-rupee breakdown.</p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4 text-sm">
            <p className="font-medium">Don’t know the grade?</p>
            <p className="mt-1 text-ink-2">Photograph the product and ReturnRescue’s AI finds the defects and grades it for you — {offer().open ? `free for everyone until ${LAUNCH.endLabel}` : `from ₹${PACK.price}`}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={accountsEnabled ? '/signup' : '/demo'} className={buttonClass('primary', 'md')}>{offer().cta} <ArrowRight className="size-4" /></Link>
              <Link to="/returns-report-2026" className={buttonClass('secondary', 'md')}>Read the 2026 returns report</Link>
            </div>
          </div>
        </div>
      </section>
      <CtaBand />
    </PublicLayout>
  )
}
