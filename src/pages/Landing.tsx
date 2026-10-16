import clsx from 'clsx'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  Camera,
  Check,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Flag,
  Hourglass,
  Leaf,
  Recycle,
  Scale,
  ScanSearch,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Store,
  Trophy,
  Truck,
  Warehouse,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../components/SiteChrome'
import { Alert, Badge, Button, buttonClass, Field, GradeBadge, Input, Textarea } from '../components/ui'
import { accountsEnabled, AFTER_TRIAL, config, LIMITS, PLANS } from '../config'
import Methodology from './Methodology'
import { buildDemoItems } from '../data/demoSeed'
import { inr, pct } from '../lib/format'
import { calculateRecovery } from '../lib/recovery'

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
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

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{children}</p>
}

/** Live preview of the real recovery engine, run on a fictional sample product. */
function RecoveryPreview({ compact }: { compact?: boolean }) {
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

function InspectionPreview() {
  return (
    <div className="w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-28px_rgb(20_26_23/0.35)]">
      <div className="flex items-center gap-2 border-b border-line bg-brand-50 px-3.5 py-2.5 text-[13px] font-semibold text-brand-900">
        <ScanSearch className="size-4" /> AI inspection
      </div>
      <div className="space-y-2.5 p-3.5 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="text-muted">Proposed</span> <Badge tone="blue">Grade B</Badge> <Badge>medium confidence</Badge>
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

function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', 'bot-field': '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Please add your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email.'
    if (form.message.trim().length < 10) errs.message = 'Tell us a little more (10+ characters).'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setState('sending')
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'contact', ...form }).toString(),
      })
      if (!res.ok) throw new Error()
      setState('sent')
    } catch {
      setState('error')
    }
  }
  if (state === 'sent') return <Alert tone="success" title="Thanks — message received">We’ll reply to {form.email} within two working days.</Alert>
  return (
    <form name="contact" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="form-name" value="contact" />
      <p className="hidden"><label>Leave empty <input name="bot-field" value={form['bot-field']} onChange={(e) => setForm({ ...form, 'bot-field': e.target.value })} /></label></p>
      <Field label="Name" error={errors.name}>{(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} autoComplete="name" />}</Field>
      <Field label="Work email" error={errors.email}>{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} autoComplete="email" />}</Field>
      <Field label="Company (optional)" className="sm:col-span-2">{(id) => <Input id={id} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" />}</Field>
      <Field label="How can we help?" error={errors.message} className="sm:col-span-2">{(id) => <Textarea id={id} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} invalid={!!errors.message} placeholder="Monthly return volume, categories, what you’d like to see…" />}</Field>
      {state === 'error' && (
        <Alert tone="error" className="sm:col-span-2">
          The message couldn’t be sent right now.{config.contactEmail ? <> Please email <a className="underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.</> : ' Please try again shortly.'}
        </Alert>
      )}
      <div className="sm:col-span-2"><Button type="submit" loading={state === 'sending'}>Send message</Button></div>
    </form>
  )
}

const faqs: [string, ReactNode][] = [
  ['What does the AI actually do?', 'When you run an inspection, the product photos and your notes are sent to a vision-capable AI model (Google Gemini). It lists visible defects, proposes a condition grade (A, B, C or Manual review), explains why, states what it can’t tell from photos, and suggests physical checks. You accept or correct the grade — the AI never makes the final call.'],
  ['Can photos prove an item is fine to resell?', 'No. Photos can’t verify hidden defects, hygiene, odour, authenticity or safety. ReturnRescue treats every AI grade as provisional and prompts your team for the physical checks that matter, and hygiene-sensitive categories need a confirmed intact seal before restock.'],
  ['How is the recommended route chosen?', 'Not by AI. For each route the calculator subtracts the relevant fees and costs from your expected proceeds, removes routes the grade doesn’t allow, and recommends the highest estimated net. Return shipping you already paid is treated as a sunk cost so it doesn’t distort the comparison. Every line of the maths is visible.'],
  ['Are the values guaranteed?', 'No — they are based on your own estimates or, if you leave them blank, rough AI-suggested estimates that are clearly labelled. You can mark a figure as a third-party quote, and once an item is sold or disposed of you record the realized amount, so estimates, quotes and actual proceeds are always kept apart.'],
  ['Which products are supported?', 'This first version is designed for apparel, footwear and fashion accessories, which are visually inspectable and make up a large share of D2C returns.'],
  ['Is my data private?', 'Yes. Each workspace is isolated at the database level, photos are stored in a private bucket, and payment details are handled entirely by Dodo Payments. See our privacy policy for the full list of providers.'],
  ['Can I cancel anytime?', 'Yes. Cancel from the billing page; Pro stays active until the end of the paid month and your data remains in your workspace.'],
  ['Do I need to sign up to try it?', `To browse, no — the demo workspace has ten fictional returns and runs in your browser. To get AI results on your own products, create a free account: you get a ${LIMITS.trialDays}-day free trial of everything in Pro, with no card required.`],
  ['How are the recovery values estimated?', 'If you leave them blank, the AI suggests rough per-unit values from the original price, the product category and the condition it can see (for example, a clean unworn item keeps most of its price, a stained one is worth far less). They are labelled “AI estimate” and are a starting point, not market data. Replace them with your real channel prices or a liquidator’s quote whenever you have one — the recommendation recalculates instantly.'],
  ['What happens when the trial ends?', AFTER_TRIAL + ' Nothing is charged unless you choose to upgrade.'],
]

export default function Landing() {
  const steps = [
    { icon: ClipboardList, title: 'Log the return', body: 'A photo, the product name, category and price. Add your own resale, refurbish, liquidation and recycling values — or let the AI suggest them.' },
    { icon: ScanSearch, title: 'AI inspects the photos', body: 'Visible defects, a proposed grade with its reasoning, rough recovery-value estimates, stated limitations and the physical checks to do next.' },
    { icon: Calculator, title: 'Compare recovery routes', body: 'A deterministic calculator shows the net value of every eligible route, line by line, and highlights the best one.' },
    { icon: Flag, title: 'Decide and track', body: 'Accept or override with a reason, then record realized proceeds. Dashboards and insights update from your records.' },
  ]
  const problems = [
    { icon: Shuffle, title: 'Grading depends on who’s on shift', body: 'Without a shared standard, the same scuffed sneaker can be restocked by one person and written off by another.' },
    { icon: Hourglass, title: 'Returned stock waits', body: 'Items that need a decision sit in a corner of the warehouse while their resale window — and value — shrinks.' },
    { icon: Scale, title: 'Decisions without the numbers', body: 'Restock, repackage, liquidate or recycle is often a gut call, without fees, handling and repair costs side by side.' },
  ]
  const benefits = [
    { icon: Check, title: 'Consistent condition grading', body: 'One A/B/C/Manual-review standard, with the AI’s reasoning and your corrections recorded.' },
    { icon: Calculator, title: 'Transparent economics', body: 'Every recommendation can be traced to the inputs and rules that produced it.' },
    { icon: ShieldCheck, title: 'A decision audit trail', body: 'Who chose what, when, and why — including every override of the recommendation.' },
    { icon: Leaf, title: 'Less avoidable waste', body: 'Make recycling and disposal a deliberate last step instead of the default for anything uncertain.' },
  ]

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grain pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              <Sparkles className="size-3.5" /> Returns recovery for apparel & footwear brands
            </span>
            <h1 className="mt-6 font-display text-[52px] leading-[0.98] tracking-tight sm:text-[72px]">
              Every return deserves <em className="text-brand-700">a second chance.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              ReturnRescue inspects returned products from photos with AI, proposes a condition grade, and shows — with transparent maths — whether to restock, refurbish, liquidate or recycle each one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/demo" className={buttonClass('primary', 'lg')}>
                Try the live demo <ArrowRight className="size-4" />
              </Link>
              <Link to={accountsEnabled ? '/signup' : '/#pricing'} className={buttonClass('secondary', 'lg')}>
                {accountsEnabled ? `Start ${LIMITS.trialDays}-day free trial` : 'See pricing'}
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">{LIMITS.trialDays}-day free trial, no card · Demo without sign-up · Pro {inr(config.proPriceInr)}/month</p>
          </div>
          <div className="relative animate-rise [animation-delay:150ms]">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-paper to-transparent" />
            <RecoveryPreview />
            <div className="relative z-10 -mt-10 ml-auto mr-[-12px] hidden w-fit sm:block lg:-ml-14 lg:mr-0">
              <InspectionPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal className="max-w-2xl">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">Returns are where margin quietly leaks out.</h2>
            <p className="mt-4 text-ink-2">
              Opened-but-unworn, damaged packaging, a loose thread: most returned items still have value. But without a standard way to assess them and compare options, that value gets lost to delay, cheap liquidation or the bin.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {problems.map((p, i) => (
              <Reveal key={p.title} delay={i * 80}>
                <div className="h-full rounded-2xl border border-line bg-paper p-6">
                  <p.icon className="size-6 text-brand-700" />
                  <h3 className="mt-4 font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <Reveal className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">From returns bin to decision in four steps.</h2>
          </Reveal>
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <li className="group relative h-full rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-900/5">
                  <span className="font-display text-5xl text-brand-200 transition group-hover:text-brand-300">0{i + 1}</span>
                  <s.icon className="mt-4 size-6 text-brand-700" />
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">The product</p>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">AI where it helps. Arithmetic where it matters.</h2>
            <p className="mt-4 text-white/70">The AI looks; the calculator decides; your team confirms. Each part does the job it’s actually good at.</p>
          </Reveal>

          <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Badge tone="brand"><Eye className="size-3" /> AI product inspection</Badge>
              <h3 className="mt-4 text-2xl font-semibold">A second pair of eyes on every return</h3>
              <ul className="mt-5 space-y-3 text-white/75">
                {['Observable defects with location and severity', 'Grade A, B, C or Manual review — with the reasoning', 'What photos can’t show, stated plainly', 'Physical checks to do before acting', 'Accept, or correct with a note kept on record'].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="mt-1 size-4 shrink-0 text-brand-300" />{t}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100} className="flex justify-center text-ink">
              <InspectionPreview />
            </Reveal>
          </div>

          <div className="mt-20 grid items-center gap-10 lg:grid-cols-2">
            <Reveal className="order-2 text-ink lg:order-1">
              <RecoveryPreview compact />
            </Reveal>
            <Reveal delay={100} className="order-1 lg:order-2">
              <Badge tone="brand"><Calculator className="size-3" /> Recovery value calculator</Badge>
              <h3 className="mt-4 text-2xl font-semibold">The best route, with the working shown</h3>
              <ul className="mt-5 space-y-3 text-white/75">
                {['Net value of restock, refurbish, liquidate and recycle', 'Grade and hygiene rules decide which routes are eligible', 'Sunk return shipping excluded — no double counting', 'Estimates, third-party quotes and realized proceeds kept separate', 'Override with a reason; every decision is logged'].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="mt-1 size-4 shrink-0 text-brand-300" />{t}</li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="mt-20 grid gap-4 md:grid-cols-3">
            {[
              { icon: Boxes, title: 'Inventory workspace', body: 'Search, filter by status, grade, category or route, edit, delete and export to CSV.' },
              { icon: BarChart3, title: 'Live dashboard', body: 'Pipeline status, recoverable value, routes chosen and weekly intake — all computed from your records.' },
              { icon: Sparkles, title: 'Operational insights', body: 'Top return categories, most frequent defects, best-value routes and what’s still unprocessed, plus an AI-written briefing.' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <f.icon className="size-6 text-brand-300" />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits + use cases */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-14 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Why teams use it</Eyebrow>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight">Recover more value with less back-and-forth.</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {benefits.map((b) => (
                <div key={b.title}>
                  <div className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><b.icon className="size-4.5" /></div>
                  <h3 className="mt-3 text-sm font-semibold">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted">{b.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <Eyebrow>Built for</Eyebrow>
            <div className="mt-6 space-y-3">
              {[
                { icon: Store, title: 'D2C fashion & footwear brands', body: 'Ops teams handling returns from their own site and marketplaces who want one standard for every item.', tag: 'Now' },
                { icon: Truck, title: 'Marketplace sellers', body: 'Sellers on Indian marketplaces deciding quickly what goes back to stock and what goes to a liquidation lot.', tag: 'Now' },
                { icon: Warehouse, title: 'Returns warehouses & 3PLs', body: 'Processing returns for several brands with consistent grading and client-ready exports.', tag: 'Roadmap' },
                { icon: Recycle, title: 'Sustainability reporting', body: 'Recording what was recovered, resold or recycled instead of written off.', tag: 'Roadmap' },
              ].map((u) => (
                <div key={u.title} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
                  <u.icon className="mt-0.5 size-5 shrink-0 text-brand-700" />
                  <div>
                    <p className="flex items-center gap-2 font-semibold">{u.title} <Badge tone={u.tag === 'Now' ? 'brand' : 'neutral'}>{u.tag}</Badge></p>
                    <p className="mt-1 text-sm text-muted">{u.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Demo band */}
      <section className="px-5">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand-800 px-8 py-14 text-white sm:px-14">
          <div className="grain absolute inset-0 opacity-25" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-4xl leading-tight sm:text-5xl">See it working in 30 seconds.</h2>
              <p className="mt-3 max-w-xl text-brand-100/85">Open the demo workspace with ten fictional returns — no account needed. When you’re ready to inspect your own products with AI, start the free trial in under a minute.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/demo" className={buttonClass('secondary', 'lg', 'border-transparent')}>
                <Camera className="size-4" /> Launch the demo
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Simple, monthly, cancel anytime.</h2>
          <p className="mt-3 text-ink-2">Try everything free for {LIMITS.trialDays} days — no card. Upgrade when returns become a weekly workflow.</p>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 80}>
              <div className={clsx('relative flex h-full flex-col rounded-3xl border p-7', p.id === 'pro' ? 'border-brand-700 bg-white shadow-xl shadow-brand-900/10 ring-1 ring-brand-700' : 'border-line bg-white')}>
                {p.id === 'pro' && <span className="absolute -top-3 left-7 rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white">For growing brands</span>}
                <h3 className="text-lg font-semibold">ReturnRescue {p.name}</h3>
                <p className="mt-1 text-sm text-muted">{p.blurb}</p>
                <p className="mt-6 font-display text-6xl leading-none tabular">
                  {p.price ? inr(p.price) : '₹0'}
                  <span className="font-sans text-base text-muted"> {p.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{f}</li>)}
                </ul>
                <Link
                  to={p.id === 'pro' ? (accountsEnabled ? '/signup?next=/app/billing' : '/demo') : accountsEnabled ? '/signup' : '/demo'}
                  className={buttonClass(p.id === 'pro' ? 'primary' : 'secondary', 'lg', 'mt-8 w-full')}
                >
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-muted">
          {AFTER_TRIAL} Prices in Indian rupees. Payments are processed by Dodo Payments; applicable taxes are shown at checkout. See <Link to="/refunds" className="underline">refunds & cancellation</Link>.
        </p>
      </section>

      {/* Methodology & trust */}
      <Methodology />

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-24 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight">Straight answers.</h2>
            <p className="mt-3 text-sm text-muted">Something else? <Link to="/#contact" className="underline">Get in touch</Link>.</p>
          </Reveal>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 pr-10 text-sm leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <Eyebrow>Contact</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight">Talk to the team.</h2>
            <p className="mt-3 text-ink-2">Questions about fit, pilots, billing or your data — send a note and we’ll get back within two working days.</p>
            {config.contactEmail && (
              <p className="mt-6 text-sm">
                Or email <a className="font-medium text-brand-700 underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
              </p>
            )}
            <div className="mt-6 flex items-center gap-2 text-sm text-muted"><FileSpreadsheet className="size-4" /> Based in India · Serving D2C brands</div>
          </Reveal>
          <Reveal delay={100} className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  )
}
