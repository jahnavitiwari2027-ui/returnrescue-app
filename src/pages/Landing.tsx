import clsx from 'clsx'
import {
  ArrowRight,
  Boxes,
  Calculator,
  Camera,
  Check,
  Eye,
  Flag,
  Hourglass,
  Scale,
  ScanSearch,
  Shuffle,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../components/SiteChrome'
import { Alert, Badge, Button, buttonClass, Field, GradeBadge, Input, Textarea } from '../components/ui'
import { accountsEnabled, AFTER_TRIAL, config, LIMITS, PLANS } from '../config'
import Methodology from './Methodology'
import { buildDemoItems } from '../data/demoSeed'
import { inr, pct } from '../lib/format'
import { calculateRecovery, GRADE_ELIGIBILITY } from '../lib/recovery'
import { GRADE_GUIDE, GRADES, ROUTE_LABEL, type Grade } from '../lib/types'

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

const GRADE_TONE: Record<Grade, { card: string; chip: string }> = {
  A: { card: 'border-brand-200 bg-brand-50/40', chip: 'bg-brand-100 text-brand-800' },
  B: { card: 'border-sky-200 bg-sky-50/40', chip: 'bg-sky-100 text-sky-800' },
  C: { card: 'border-amber-200 bg-amber-50/40', chip: 'bg-amber-100 text-amber-800' },
  MANUAL_REVIEW: { card: 'border-red-200 bg-red-50/40', chip: 'bg-red-100 text-red-800' },
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
  ['What does the AI do?', 'It looks at your photos and notes, lists each visible defect with how severe it is, and proposes a grade. It never sets a price. Fixed rules check the grade matches the defects, and you confirm or correct it.'],
  ['Where do the rupee values come from?', 'A published rate card: Amazon.in, Flipkart and Meesho fees, courier rates, Delhi minimum wage for in-house work, real cleaner, cobbler and tailor price lists, and surplus-stock and scrap rates. Every line links to its source, assumptions are labelled, and you can change any rate to your own.'],
  ['How is GST handled?', 'If you’re GST-registered, the GST included in the selling price is deducted (it goes to the government), and GST on marketplace or gateway fees is treated as claimable input tax credit, not a cost. If you’re not registered, GST on fees counts as a cost. You set this on the Rates page.'],
  ['What happens to past decisions if I change my rates?', 'Nothing. Saved decisions and completed returns keep the values they were decided with. Returns without a decision can be updated in one step.'],
  ['How is the best option chosen?', 'By plain arithmetic, not AI: expected proceeds minus fees and costs for each route the grade allows. The highest net wins, and every line of the maths is visible.'],
  ['Can photos prove an item is fine to resell?', 'No. Hidden damage, hygiene, odour and authenticity need a person. Every AI result says what to check by hand.'],
  ['Do I need to sign up?', `Not to look around — the demo is open. To inspect your own products, start the ${LIMITS.trialDays}-day free trial. No card needed.`],
  ['What happens after the trial?', AFTER_TRIAL + ' Nothing is charged unless you upgrade.'],
  ['Can I cancel anytime?', 'Yes, from the billing page. Pro stays active until the end of the paid month.'],
]

export default function Landing() {
  const steps = [
    { icon: Camera, title: 'Snap a photo', body: 'Add the product, its price and a photo.' },
    { icon: ScanSearch, title: 'AI grades it', body: 'Visible defects and a grade in seconds.' },
    { icon: Calculator, title: 'See the best option', body: 'Each option priced from your rate card, best net value first.' },
    { icon: Flag, title: 'Confirm', body: 'One tap to record the decision. Track what you recover.' },
  ]
  const problems = [
    { icon: Shuffle, title: 'Inconsistent grading', body: 'The same item gets restocked by one person and written off by another.' },
    { icon: Hourglass, title: 'Stock sits waiting', body: 'Undecided returns lose value every week they wait.' },
    { icon: Scale, title: 'Gut-feel decisions', body: 'Fees, repair and handling costs are rarely compared side by side.' },
  ]
  const features = [
    { icon: Eye, title: 'AI photo inspection', body: 'Visible defects, a grade with reasons, and what to check by hand.' },
    { icon: Calculator, title: 'Recovery calculator', body: 'Every rupee traced to a published rate or your own price.' },
    { icon: Boxes, title: 'Inventory & insights', body: 'Search, export, and see where your returns value goes.' },
  ]
  const benefits = ['Consistent grading', 'Transparent maths', 'A decision record', 'Less waste']

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grain pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              <Sparkles className="size-3.5" /> For apparel & footwear brands
            </span>
            <h1 className="mt-6 font-display text-[52px] leading-[0.98] tracking-tight sm:text-[72px]">
              Every return deserves <em className="text-brand-700">a second chance.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
              Snap a photo of a returned product. ReturnRescue grades it with AI and tells you the most valuable thing to do with it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={accountsEnabled ? '/signup' : '/demo'} className={buttonClass('primary', 'lg')}>
                {accountsEnabled ? `Start ${LIMITS.trialDays}-day free trial` : 'Try the demo'} <ArrowRight className="size-4" />
              </Link>
              <Link to="/demo" className={buttonClass('secondary', 'lg')}>See the demo</Link>
            </div>
            <p className="mt-4 text-sm text-muted">No card needed · Then {inr(config.proPriceInr)}/month</p>
          </div>
          <div className="relative animate-rise [animation-delay:150ms]">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-paper to-transparent" />
            <RecoveryPreview />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">Returns quietly leak margin.</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {problems.map((p, i) => (
              <Reveal key={p.title} delay={i * 80}>
                <p.icon className="size-6 text-brand-700" />
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Four steps. About a minute.</h2>
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, i) => (
              <Reveal key={st.title} delay={i * 70}>
                <li className="h-full rounded-2xl border border-line bg-white p-5">
                  <span className="font-display text-4xl text-brand-200">0{i + 1}</span>
                  <st.icon className="mt-3 size-5 text-brand-700" />
                  <h3 className="mt-2 font-semibold">{st.title}</h3>
                  <p className="mt-1 text-sm text-muted">{st.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Grades */}
      <section id="grades" className="scroll-mt-20 border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <Eyebrow>The grades</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Every return gets one of four grades.</h2>
            <p className="mt-3 max-w-2xl text-ink-2">The grade decides which options are allowed. The AI proposes it from the photos, fixed rules check it against the defects found, and you confirm or change it.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GRADES.map((g, i) => (
              <Reveal key={g} delay={i * 70}>
                <div className={clsx('flex h-full flex-col rounded-2xl border p-5', GRADE_TONE[g].card)}>
                  <div className="flex items-center gap-3">
                    <span className={clsx('grid size-11 place-items-center rounded-xl font-display text-2xl', GRADE_TONE[g].chip)}>
                      {g === 'MANUAL_REVIEW' ? '?' : g}
                    </span>
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
                        GRADE_ELIGIBILITY[g].map((r) => (
                          <li key={r} className="rounded-md bg-paper-2 px-2 py-0.5 text-xs text-ink-2">{ROUTE_LABEL[r]}</li>
                        ))
                      ) : (
                        <li className="rounded-md bg-paper-2 px-2 py-0.5 text-xs text-ink-2">Held until checked</li>
                      )}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            Innerwear and swimwear can only be restocked or refurbished if the hygiene seal is intact. Among the allowed options, ReturnRescue recommends the one that recovers the most money.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">The product</p>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">AI looks. Maths decides. You confirm.</h2>
            </Reveal>
            <div className="mt-8 space-y-5">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 70} className="flex gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10"><f.icon className="size-5 text-brand-300" /></div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-0.5 text-sm text-white/65">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={100} className="flex justify-center text-ink">
            <InspectionPreview />
          </Reveal>
        </div>
      </section>

      {/* Benefits & use cases */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="grid gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Built for</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight">D2C fashion and footwear teams.</h2>
            <p className="mt-3 text-ink-2">Brands and marketplace sellers handling returns every week. Returns warehouses and 3PLs are next.</p>
          </div>
          <ul className="grid grid-cols-2 gap-3 self-center">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium">
                <Check className="size-4 text-brand-600" /> {b}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* Demo band */}
      <section className="px-5">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand-800 px-8 py-12 text-white sm:px-14">
          <div className="grain absolute inset-0 opacity-25" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-4xl leading-tight">See it in 30 seconds.</h2>
              <p className="mt-2 text-brand-100/85">Ten sample returns. No sign-up.</p>
            </div>
            <Link to="/demo" className={buttonClass('secondary', 'lg', 'border-transparent self-start lg:self-auto')}>Open the demo</Link>
          </div>
        </Reveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-20">
        <Reveal className="text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Try it free for {LIMITS.trialDays} days.</h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 80}>
              <div className={clsx('relative flex h-full flex-col rounded-3xl border bg-white p-7', p.id === 'pro' ? 'border-brand-700 shadow-xl shadow-brand-900/10 ring-1 ring-brand-700' : 'border-line')}>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-4 font-display text-5xl leading-none tabular">
                  {p.price ? inr(p.price) : '₹0'}
                  <span className="font-sans text-base text-muted"> {p.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" />{f}</li>)}
                </ul>
                <Link
                  to={p.id === 'pro' ? (accountsEnabled ? '/signup?next=/app/billing' : '/demo') : accountsEnabled ? '/signup' : '/demo'}
                  className={buttonClass(p.id === 'pro' ? 'primary' : 'secondary', 'lg', 'mt-7 w-full')}
                >
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-muted">
          {AFTER_TRIAL} Prices in INR, processed by Dodo Payments. <Link to="/refunds" className="underline">Refunds & cancellation</Link>.
        </p>
      </section>

      <Methodology />

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight">Questions</h2>
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
      <section id="contact" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <Eyebrow>Contact</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight">Talk to us.</h2>
            <p className="mt-3 text-ink-2">We reply within two working days.</p>
            {config.contactEmail && (
              <p className="mt-4 text-sm">Or email <a className="font-medium text-brand-700 underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a></p>
            )}
          </Reveal>
          <Reveal delay={100} className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  )
}
