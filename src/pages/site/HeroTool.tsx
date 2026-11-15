import clsx from 'clsx'
import { ArrowRight, Calculator as CalcIcon, Camera, ChevronDown, ScanSearch, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, buttonClass, Input, Select } from '../../components/ui'
import { accountsEnabled, offer } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { inr, pct } from '../../lib/format'
import { LAUNCH, PACK } from '../../lib/plans'
import { quoteReturn, type Condition } from '../../lib/quote'
import { PLATFORM_LABEL, PLATFORMS, type PlatformKey } from '../../lib/rates'
import { CATEGORIES, type Category } from '../../lib/types'

type Tab = 'calc' | 'ai'

/** The homepage's hands-on panel: the free calculator, and what AI photo grading does. */
export function HeroTool() {
  const [tab, setTab] = useState<Tab>('calc')
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_30px_80px_-30px_rgb(11_61_47/0.35)]">
      <div className="grid grid-cols-2 border-b border-line bg-paper p-1.5" role="tablist" aria-label="Try ReturnRescue">
        {([
          ['calc', CalcIcon, 'Value a return', 'free · no sign-up'],
          ['ai', ScanSearch, 'AI photo grading', offer().open ? 'free this weekend' : `from ₹${PACK.price}`],
        ] as const).map(([key, Icon, label, sub]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx('flex items-center justify-center gap-2 rounded-2xl px-2 py-2.5 text-left transition', tab === key ? 'bg-white shadow-sm ring-1 ring-line' : 'text-ink-2 hover:text-ink')}
          >
            <Icon className={clsx('size-4 shrink-0', tab === key ? 'text-brand-700' : 'text-muted')} />
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">{label}</span>
              <span className="block text-[11px] leading-tight text-muted">{sub}</span>
            </span>
          </button>
        ))}
      </div>
      {tab === 'calc' ? <MiniCalculator onAi={() => setTab('ai')} /> : <AiPanel />}
    </div>
  )
}

function MiniCalculator({ onAi }: { onAi: () => void }) {
  const [category, setCategory] = useState<Category>('Footwear')
  const [price, setPrice] = useState('2999')
  const [platform, setPlatform] = useState<PlatformKey>('amazon')
  const [condition, setCondition] = useState<Condition>('B')
  const [open, setOpen] = useState<string | null>(null)
  const p = Math.min(Math.max(Number(price) || 0, 0), 10_00_000)
  const { calc } = useMemo(() => quoteReturn({ category, price: p || 1, platform, condition }), [category, p, platform, condition])
  const best = calc.routes.find((r) => r.route === calc.recommended)

  return (
    <div className="p-4" role="tabpanel" aria-label="Value a return">
      <div className="grid grid-cols-2 gap-2.5">
        <label className="col-span-2 block text-xs font-medium text-ink-2">
          Product type
          <Select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="mt-1">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </label>
        <label className="block text-xs font-medium text-ink-2">
          Selling price (₹)
          <Input type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 tabular" />
        </label>
        <label className="block text-xs font-medium text-ink-2">
          Where it sells
          <Select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformKey)} className="mt-1">
            {PLATFORMS.map((x) => <option key={x} value={x}>{PLATFORM_LABEL[x]}</option>)}
          </Select>
        </label>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Condition">
        {([['A', 'Like new'], ['B', 'Fixable flaws'], ['C', 'Damaged']] as const).map(([c, l]) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={condition === c}
            onClick={() => setCondition(c)}
            className={clsx('rounded-xl border px-1 py-2 text-center text-xs transition', condition === c ? 'border-brand-700 bg-brand-50 font-medium ring-1 ring-brand-700' : 'border-line hover:bg-paper')}
          >
            <span className="block font-semibold">Grade {c}</span>
            <span className="block text-[11px] text-muted">{l}</span>
          </button>
        ))}
      </div>

      {best && (
        <div className="mt-3 rounded-2xl bg-brand-800 px-4 py-3 text-white" aria-live="polite">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200">Best option</p>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">{best.label}</p>
            <p className="font-display text-3xl tabular">{inr(best.net)}</p>
          </div>
          <p className="text-xs text-brand-100/85">{pct(best.recoveryRate)} of the {inr(p)} price reaches you, after fees, GST, repairs and delivery</p>
        </div>
      )}
      <div className="mt-2 space-y-1">
        {calc.routes.map((r) => {
          const isOpen = open === r.route
          return (
            <div key={r.route} className={clsx('rounded-xl border', calc.recommended === r.route ? 'border-brand-600 bg-brand-50/50' : 'border-line', !r.eligible && 'opacity-55')}>
              <button type="button" onClick={() => setOpen(isOpen ? null : r.route)} aria-expanded={isOpen} className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="flex items-center gap-1.5 font-medium">
                    {r.label}
                    {calc.recommended === r.route && <Trophy className="size-3.5 text-brand-700" aria-label="best" />}
                  </span>
                  {!r.eligible && <span className="block text-[11px] text-muted">{r.ineligibleReason}</span>}
                </span>
                <span className={clsx('font-display text-lg tabular', r.net < 0 && 'text-red-700')}>{inr(r.net)}</span>
                <ChevronDown className={clsx('size-3.5 shrink-0 text-muted transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <dl className="space-y-0.5 border-t border-line/70 px-3 py-1.5 text-[12px]">
                  {r.lines.map((l) => (
                    <div key={l.label} className="flex justify-between gap-3">
                      <dt className="text-ink-2">{l.label}</dt>
                      <dd className={clsx('tabular', l.amount < 0 && 'text-red-700')}>{inr(l.amount)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <button type="button" onClick={onAi} className="font-medium text-brand-700 hover:underline">Not sure of the grade? Let AI grade it from a photo →</button>
        <Link to="/calculator" className="text-muted hover:text-ink hover:underline">Full calculator</Link>
      </div>
    </div>
  )
}

function AiPanel() {
  const o = offer()
  const { session } = useAuth()
  // Straight to adding a return with a photo; new visitors sign up first, then land there.
  const aiHref = !accountsEnabled ? '/demo/returns/new' : session ? '/app/returns/new' : '/signup?next=/app/returns/new'
  return (
    <div className="p-4" role="tabpanel" aria-label="AI photo grading">
      <ol className="grid grid-cols-3 gap-2 text-center text-[12px]">
        {[
          [Camera, 'Snap a photo'],
          [ScanSearch, 'AI finds every defect'],
          [Trophy, 'Best option, priced'],
        ].map(([Icon, t], i) => {
          const I = Icon as typeof Camera
          return (
            <li key={i} className="rounded-xl bg-paper px-1.5 py-2.5">
              <I className="mx-auto size-4 text-brand-700" />
              <span className="mt-1 block font-medium leading-tight">{t as string}</span>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        <div className="flex items-center justify-between border-b border-line bg-brand-50 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-900"><ScanSearch className="size-4" /> AI inspection</span>
          <span className="text-[11px] text-muted">White canvas sneaker</span>
        </div>
        <div className="space-y-2 p-3 text-[12px]">
          <div className="flex items-center gap-1.5"><Badge tone="blue">Grade B</Badge><Badge>medium confidence</Badge></div>
          <ul className="space-y-1">
            <li className="flex justify-between"><span>Scuff · left toe cap</span><Badge>minor</Badge></li>
            <li className="flex justify-between"><span>Box corner crushed</span><Badge>minor</Badge></li>
          </ul>
          <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-900">Check by hand: insole wear and odour — photos can’t show these.</p>
          <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/60 px-2.5 py-2">
            <span><span className="block text-[11px] text-muted">Best option, saved automatically</span><span className="font-semibold">Repackage / refurbish</span></span>
            <span className="font-display text-xl tabular">₹886</span>
          </div>
          <p className="text-[10.5px] text-muted">Example result for a fictional sample. Fixed rules check every AI grade; the AI never sets a price.</p>
        </div>
      </div>
      <Link to={aiHref} className={buttonClass('primary', 'md', 'mt-3 w-full')}>
        {o.open ? 'Grade your own returns free' : `Grade your returns — ₹${PACK.price}`} <ArrowRight className="size-4" />
      </Link>
      <p className="mt-1.5 text-center text-[11px] text-muted">{o.open ? `${LAUNCH.freeInspections} AI inspections each until ${LAUNCH.endLabel}` : `${PACK.inspections} AI inspections, one-time · no subscription`}</p>
      <Link to="/demo" className="mt-1 block text-center text-[12px] text-muted hover:text-ink hover:underline">Or explore the demo with 10 sample returns</Link>
    </div>
  )
}
