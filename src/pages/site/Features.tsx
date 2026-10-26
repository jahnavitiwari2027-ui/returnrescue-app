import {
  BarChart3,
  Ban,
  Calculator,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  Handshake,
  Lock,
  MapPin,
  Phone,
  ReceiptIndianRupee,
  RotateCcw,
  ScanSearch,
  Store,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../../components/SiteChrome'
import { DIRECTORY, DIRECTORY_REGION } from '../../data/directory'
import { LIMITS } from '../../config'
import { AI_INSPECTIONS } from '../../lib/plans'
import Methodology from '../Methodology'
import { CtaBand, Eyebrow, GradeCards, InspectionPreview, PageIntro, RecoveryPreview, Reveal, usePageMeta } from './shared'

function Section({ id, eyebrow, title, intro, children, tone = 'paper' }: { id?: string; eyebrow: string; title: string; intro?: ReactNode; children: ReactNode; tone?: 'paper' | 'white' }) {
  return (
    <section id={id} className={`scroll-mt-20 border-b border-line ${tone === 'white' ? 'bg-white' : ''}`}>
      <div className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h2>
          {intro && <p className="mt-4 max-w-2xl text-ink-2">{intro}</p>}
        </Reveal>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

function Point({ icon: Icon, title, children }: { icon: typeof Camera; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="size-5" /></div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  )
}

const FLOW = [
  { icon: Camera, title: 'Add the return', body: 'A photo (upload or live camera), the product name, category, price and where it sells. SKU, reason and notes are optional.' },
  { icon: ScanSearch, title: 'AI inspection', body: 'Starts by itself and takes about 10–30 seconds.' },
  { icon: UserCheck, title: 'Automatic grade', body: 'Fixed rules check the AI’s grade against the defects it found.' },
  { icon: Calculator, title: 'Every option priced', body: 'Four routes, each with the fees, GST, repairs and delivery that apply.' },
  { icon: CheckCircle2, title: 'Best option saved', body: 'The decision is recorded, with next steps and who can help.' },
]

export default function Features() {
  usePageMeta('/features')
  return (
    <PublicLayout>
      <PageIntro eyebrow="Features" title="Everything ReturnRescue does, explained.">
        From the photo to the person who’ll repair, buy or recycle the item — here’s what happens to each return, and why you can trust the numbers.
      </PageIntro>

      <Section eyebrow="The flow" title="One return, start to finish." tone="white">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FLOW.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <li className="h-full rounded-2xl border border-line bg-paper p-5">
                <span className="font-display text-3xl text-brand-200">0{i + 1}</span>
                <s.icon className="mt-2 size-5 text-brand-700" />
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section
        id="inspection"
        eyebrow="AI photo inspection"
        title="It reports what it can see — and says what it can’t."
        intro="A vision AI model looks at up to four photos with your notes. It may only report damage that’s visible, and it never sets a price."
      >
        <div className="grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-6 sm:grid-cols-2">
            <Point icon={ScanSearch} title="Every visible defect">Stains, tears, scuffs, loose stitching, pilling, sole wear, missing tags, damaged packaging — each with how severe it is and where.</Point>
            <Point icon={UserCheck} title="A grade with reasons">Grade A, B, C or Manual review, with the reasoning and how confident it is. Fixed rules then check it: any visible defect rules out A, a major one means C.</Point>
            <Point icon={CheckCircle2} title="What to check by hand">Smell, the inside of the item, hidden stitching — and a plain list of what photos can’t show.</Point>
            <Point icon={Ban} title="Refuses what it shouldn’t grade">A photo of medicine filed as footwear gets no grade and no value. A shirt filed under shoes goes to a person. Every result links to support.</Point>
            <Point icon={RotateCcw} title="Easy to correct">Re-run the inspection with clearer photos, change the grade (the best option is picked again), or choose another option with a reason.</Point>
            <Point icon={Lock} title="Honest by design">If the AI isn’t available, you see an error — never a made-up result.</Point>
          </div>
          <Reveal delay={100} className="flex justify-center lg:justify-end">
            <InspectionPreview />
          </Reveal>
        </div>
      </Section>

      <section id="grades" className="scroll-mt-20 border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <Eyebrow>The grades</Eyebrow>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Every return gets one of four grades.</h2>
            <p className="mt-4 max-w-2xl text-ink-2">The grade decides which options are allowed. Innerwear and swimwear can only be restocked or refurbished if the hygiene seal is intact.</p>
          </Reveal>
          <div className="mt-10"><GradeCards /></div>
        </div>
      </section>

      <Section
        id="platforms"
        eyebrow="Platform pricing"
        title="Priced for where it will sell again."
        intro="Pick Amazon.in, Flipkart, Meesho or your own website for each return, or save a default. Fees, GST and delivery are worked out for that platform — and you can set any of them by hand."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Amazon.in', 'Referral fee, closing fee and weight-handling fee for the item’s price and size.'],
            ['Flipkart', 'Commission, fixed fee and shipping.'],
            ['Meesho', 'No commission; delivery by weight and zone.'],
            ['Your own website', 'Courier rates and payment-gateway fees.'],
          ].map(([name, body], i) => (
            <Reveal key={name} delay={i * 60}>
              <div className="h-full rounded-2xl border border-line bg-white p-5">
                <Store className="size-5 text-brand-700" />
                <h3 className="mt-3 font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Point icon={ReceiptIndianRupee} title="GST set for you">5% or 18% by category and price. GST-registered sellers have the GST inside the price deducted and GST on fees counted as input tax credit; unregistered sellers bear GST on fees as a cost.</Point>
          <Point icon={MapPin} title="Delivery your way">Presets by packed weight or zone, or a custom amount — saved as your default if you like.</Point>
        </div>
      </Section>

      <Section
        id="calculator"
        eyebrow="Recovery calculator"
        title="Four options. Plain arithmetic. The highest net wins."
        intro="For each route the grade allows, ReturnRescue works out what actually reaches you after fees, GST, repairs and handling — per unit, line by line."
        tone="white"
      >
        <div className="grid items-start gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-5">
            <Point icon={Calculator} title="Restock, refurbish, liquidate or recycle">Restock and refurbish include marketplace fees and delivery. Liquidation is a bulk sale: commission and freight, no per-order fees. Recycling can be negative, and it says so.</Point>
            <Point icon={CheckCircle2} title="Sunk costs left out">Return shipping you’ve already paid is shown, but it doesn’t change the decision — it’s spent whichever route you pick.</Point>
            <Point icon={TrendingUp} title="Decisions keep their values">Change a rate and saved decisions stay as they were. Returns without a decision can be re-priced in one step.</Point>
          </div>
          <Reveal delay={100} className="min-w-0"><RecoveryPreview /></Reveal>
        </div>
      </Section>

      <Section
        id="rates"
        eyebrow="Sourced rate card"
        title="Every rupee has a label."
        intro="Each value on the rate card is one of three kinds, so you always know how sure a number is."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Published rate', 'Linked to its source with a date: marketplace fee schedules, GST slabs, courier rates, Delhi minimum wage plus PF and ESI, real cleaner, cobbler and tailor prices, surplus and scrap rates.'],
            ['Your value', 'A price, rate or quote you entered. A quote stays a quote — it’s never overwritten.'],
            ['Assumption', 'Where there’s no public source. Clearly labelled, and replaceable with your own figure.'],
          ].map(([t, b], i) => (
            <Reveal key={t} delay={i * 60}>
              <div className="h-full rounded-2xl border border-line bg-white p-5">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm text-ink-2">
          <strong>Learns from your results:</strong> after five completed sales on a route, the median amount you actually received is offered as a suggested rate.
        </p>
      </Section>

      <Section
        id="partners"
        eyebrow="Next steps & partners"
        title="Know what to do next — and who can do it."
        intro="Once the best option is saved, each return shows numbered next steps for that route and the people who can help."
        tone="white"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Point icon={Handshake} title={`A ${DIRECTORY_REGION} directory`}>{DIRECTORY.length} real, independent businesses — shoe and leather repair, cleaning, liquidation, donation and recycling — matched to the route and product type, with address and public contact details. No paid listings.</Point>
          <Point icon={Phone} title="Your own partners">Save the repairers and buyers you already use and reach them in one tap: call, WhatsApp or email.</Point>
          <Point icon={MapPin} title="Find nearby">Opens a Google Maps search for repairers, recyclers or surplus buyers near you.</Point>
        </div>
      </Section>

      <Section id="insights" eyebrow="Inventory & insights" title="See where your returns value goes.">
        <div className="grid gap-6 md:grid-cols-3">
          <Point icon={FileSpreadsheet} title="Inventory">Search, filter and sort every return; edit anything; export the lot as CSV.</Point>
          <Point icon={BarChart3} title="Dashboard">Recoverable value, routes chosen, weekly intake, top categories, most common defects and returns still waiting.</Point>
          <Point icon={ScanSearch} title="AI-written briefings (Pro)">A short summary of what to act on, written only from your own numbers.</Point>
        </div>
        <p className="mt-8 text-sm text-muted">
          Each workspace is private: separate data for every business, photos in private storage, and keys kept on the server. Starter includes {AI_INSPECTIONS.starter} AI inspections a month, Pro {AI_INSPECTIONS.pro}. <Link to="/pricing" className="font-medium text-brand-700 underline">Compare plans</Link>
        </p>
      </Section>

      <Methodology />

      <CtaBand title="Try it on your own returns." body={`${LIMITS.trialDays} days free, every feature included. No card needed.`} />
    </PublicLayout>
  )
}
