import clsx from 'clsx'
import { ArrowRight, ScanSearch, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge, buttonClass, GradeBadge } from '../../components/ui'
import { accountsEnabled, LIMITS } from '../../config'
import { buildDemoItems } from '../../data/demoSeed'
import { inr, pct } from '../../lib/format'
import { calculateRecovery, GRADE_ELIGIBILITY } from '../../lib/recovery'
import { GRADE_GUIDE, GRADES, ROUTE_LABEL, type Grade } from '../../lib/types'
import { metaFor } from './meta'

/** Keeps the browser tab title and description right when moving between pages. */
export function usePageMeta(path: string) {
  useEffect(() => {
    const m = metaFor(path)
    document.title = m.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', m.description)
  }, [path])
}

/** Fades content in as it scrolls into view. Without JavaScript (or for crawlers) the text is still in the page. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return setShown(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={clsx(className, 'transition-all duration-700 ease-out', shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('text-xs font-semibold uppercase tracking-[0.18em] text-brand-700', className)}>{children}</p>
}

/** The heading block at the top of an inner page. */
export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="grain pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-14 lg:pt-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-[44px] leading-[1.02] tracking-tight sm:text-[60px]">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{children}</div>}
      </div>
    </section>
  )
}

/** Start-trial and demo buttons, shown at the end of pages. */
export function CtaBand({ title = 'See it in 30 seconds.', body = 'Ten sample returns in the demo. No sign-up.' }: { title?: string; body?: string }) {
  return (
    <section className="px-5 py-20">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand-800 px-8 py-12 text-white sm:px-14">
        <div className="grain absolute inset-0 opacity-25" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-4xl leading-tight">{title}</h2>
            <p className="mt-2 text-brand-100/85">{body}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {accountsEnabled && (
              <Link to="/signup" className={buttonClass('secondary', 'lg', 'border-transparent')}>
                Start {LIMITS.trialDays}-day free trial <ArrowRight className="size-4" />
              </Link>
            )}
            <Link to="/demo" className={buttonClass('ghost', 'lg', 'text-white ring-1 ring-white/30 hover:bg-white/10 hover:text-white')}>Open the demo</Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/** Live preview of the real recovery engine, run on a fictional sample product. */
export function RecoveryPreview({ compact }: { compact?: boolean }) {
  const sample = useMemo(() => buildDemoItems().find((i) => i.sku === 'SAMPLE-FTW-0311')!, [])
  const calc = useMemo(() => calculateRecovery(sample), [sample])
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-30px_rgb(11_61_47/0.35)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{sample.name}</p>
          <p className="font-mono text-[11px] text-muted">{sample.sku} · original {inr(sample.original_price)}</p>
        </div>
        <GradeBadge grade={sample.grade} />
      </div>
      <div className="space-y-1.5 p-3">
        {calc.routes.map((r) => (
          <div
            key={r.route}
            className={clsx(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5',
              calc.recommended === r.route ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600' : 'border-line',
              !r.eligible && 'opacity-55',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[13px] font-medium">
                {r.label}
                {calc.recommended === r.route && <Trophy className="size-3.5 text-brand-700" aria-label="highest" />}
              </p>
              {!compact && <p className="text-[11px] text-muted">{r.eligible ? `Recovers ${pct(r.recoveryRate)} of original` : r.ineligibleReason}</p>}
            </div>
            <p className={clsx('font-display text-xl tabular', r.net < 0 && 'text-red-700')}>{inr(r.net)}</p>
          </div>
        ))}
      </div>
      <p className="border-t border-line bg-paper px-4 py-2 text-[11px] text-muted">Calculated live by the ReturnRescue engine · fictional sample product</p>
    </div>
  )
}

export function InspectionPreview() {
  return (
    <div className="w-72 overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-[0_24px_60px_-28px_rgb(20_26_23/0.35)]">
      <div className="flex items-center gap-2 border-b border-line bg-brand-50 px-3.5 py-2.5 text-[13px] font-semibold text-brand-900">
        <ScanSearch className="size-4" /> AI inspection
      </div>
      <div className="space-y-2.5 p-3.5 text-[12px]">
        <div className="flex items-center gap-1.5">
          <Badge tone="blue">Grade B</Badge> <Badge>medium confidence</Badge>
        </div>
        <ul className="space-y-1">
          <li className="flex justify-between"><span>Scuff · left toe cap</span><Badge>minor</Badge></li>
          <li className="flex justify-between"><span>Box corner crushed</span><Badge>minor</Badge></li>
        </ul>
        <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-900">Check: insole wear and odour — not visible in photos.</p>
        <p className="text-[10.5px] text-muted">Illustrative layout — real results come from your photos.</p>
      </div>
    </div>
  )
}

const GRADE_TONE: Record<Grade, { card: string; chip: string }> = {
  A: { card: 'border-brand-200 bg-brand-50/40', chip: 'bg-brand-100 text-brand-800' },
  B: { card: 'border-sky-200 bg-sky-50/40', chip: 'bg-sky-100 text-sky-800' },
  C: { card: 'border-amber-200 bg-amber-50/40', chip: 'bg-amber-100 text-amber-800' },
  MANUAL_REVIEW: { card: 'border-red-200 bg-red-50/40', chip: 'bg-red-100 text-red-800' },
}

/** The four grades and which options each allows. */
export function GradeCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {GRADES.map((g, i) => (
        <Reveal key={g} delay={i * 70}>
          <div className={clsx('flex h-full flex-col rounded-2xl border p-5', GRADE_TONE[g].card)}>
            <div className="flex items-center gap-3">
              <span className={clsx('grid size-11 place-items-center rounded-xl font-display text-2xl', GRADE_TONE[g].chip)}>{g === 'MANUAL_REVIEW' ? '?' : g}</span>
              <div>
                <p className="text-xs font-medium text-muted">{g === 'MANUAL_REVIEW' ? 'Manual review' : `Grade ${g}`}</p>
                <h3 className="font-semibold leading-tight">{GRADE_GUIDE[g].short}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-2">{GRADE_GUIDE[g].meaning}</p>
            <div className="min-h-4 flex-1" />
            <div className="border-t border-line pt-3">
              <p className="text-xs font-medium text-muted">What happens next</p>
              <p className="mt-0.5 text-sm font-medium">{GRADE_GUIDE[g].allows}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {GRADE_ELIGIBILITY[g].length ? (
                  GRADE_ELIGIBILITY[g].map((r) => <li key={r} className="rounded-md bg-paper-2 px-2 py-0.5 text-xs text-ink-2">{ROUTE_LABEL[r]}</li>)
                ) : (
                  <li className="rounded-md bg-paper-2 px-2 py-0.5 text-xs text-ink-2">Held until checked</li>
                )}
              </ul>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}
