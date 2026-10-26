import { ArrowRight, Calculator, Camera, CheckCircle2, Eye, Handshake, Hourglass, Scale, ScanSearch, Shuffle, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PublicLayout } from '../../components/SiteChrome'
import { buttonClass } from '../../components/ui'
import { accountsEnabled, LIMITS } from '../../config'
import { inr } from '../../lib/format'
import { PRICE } from '../../lib/plans'
import { CtaBand, Eyebrow, RecoveryPreview, Reveal, usePageMeta } from './shared'

// Sections that used to live on this page now have their own pages.
const MOVED: Record<string, string> = {
  '#pricing': '/pricing',
  '#faq': '/faq',
  '#contact': '/contact',
  '#features': '/features',
  '#grades': '/features#grades',
  '#trust': '/features#trust',
  '#how': '/features',
}

export default function Home() {
  usePageMeta('/')
  const { hash, search } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (MOVED[hash]) navigate(MOVED[hash].replace(/(#.*)?$/, `${search}$1`), { replace: true })
  }, [hash, search, navigate])

  const problems = [
    { icon: Shuffle, title: 'Inconsistent grading', body: 'The same item gets restocked by one person and written off by another.' },
    { icon: Hourglass, title: 'Stock sits waiting', body: 'Undecided returns lose value every week they wait.' },
    { icon: Scale, title: 'Gut-feel decisions', body: 'Fees, repair and handling costs are rarely compared side by side.' },
  ]
  const steps = [
    { icon: Camera, title: 'Snap a photo', body: 'Add the product, its price and where it sells.' },
    { icon: ScanSearch, title: 'AI grades it', body: 'Visible defects and a grade in seconds, checked by fixed rules.' },
    { icon: Calculator, title: 'Every option priced', body: 'Restock, refurbish, liquidate or recycle — with that platform’s fees and GST.' },
    { icon: CheckCircle2, title: 'Best option saved', body: 'Recorded automatically, with next steps and who can help. Change it any time.' },
  ]
  const highlights = [
    { icon: Eye, title: 'AI photo inspection', body: 'Defects, a grade with reasons, and what to check by hand.' },
    { icon: Calculator, title: 'Transparent maths', body: 'Every rupee traced to a published rate or your own price.' },
    { icon: Handshake, title: 'Partners near you', body: 'Repairers, cleaners, liquidators and recyclers matched to each return.' },
  ]

  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="grain pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              <Sparkles className="size-3.5" /> For Indian fashion & footwear brands
            </span>
            <h1 className="mt-6 font-display text-[52px] leading-[0.98] tracking-tight sm:text-[72px]">
              Every return deserves <em className="text-brand-700">a second chance.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
              ReturnRescue grades each returned product from a photo and tells you the most valuable thing to do with it — restock, refurbish, liquidate or recycle.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={accountsEnabled ? '/signup' : '/demo'} className={buttonClass('primary', 'lg')}>
                {accountsEnabled ? `Start ${LIMITS.trialDays}-day free trial` : 'Try the demo'} <ArrowRight className="size-4" />
              </Link>
              <Link to="/demo" className={buttonClass('secondary', 'lg')}>See the demo</Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              No card needed · Then from {inr(PRICE.starter.month)} a month · <Link to="/pricing" className="underline hover:text-ink">See pricing</Link>
            </p>
          </div>
          <div className="relative min-w-0 animate-rise [animation-delay:150ms]">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-paper to-transparent" />
            <RecoveryPreview />
          </div>
        </div>
      </section>

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

      <section>
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

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <Eyebrow className="text-brand-300">The product</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">AI looks. Maths decides. You stay in control.</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {highlights.map((f, i) => (
              <Reveal key={f.title} delay={i * 70} className="flex gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10"><f.icon className="size-5 text-brand-300" /></div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-0.5 text-sm text-white/65">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Link to="/features" className={buttonClass('secondary', 'lg', 'mt-10 border-transparent')}>
            See every feature <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </PublicLayout>
  )
}
