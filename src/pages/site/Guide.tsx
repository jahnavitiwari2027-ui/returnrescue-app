import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../../components/SiteChrome'
import { buttonClass } from '../../components/ui'
import { accountsEnabled, offer } from '../../config'
import { inr } from '../../lib/format'
import type { RecoveryResult } from '../../lib/recovery'
import { amazonExample, ARTICLES, articleFor } from './articles'
import { CtaBand, Eyebrow, usePageMeta } from './shared'

function Breakdown({ calc, title }: { calc: RecoveryResult; title: string }) {
  const r = calc.routes.find((x) => x.route === calc.recommended)
  if (!r) return null
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-line bg-white">
      <p className="border-b border-line bg-paper px-4 py-2 text-sm font-medium">{title} — {r.label}</p>
      <dl className="space-y-1 px-4 py-3 text-sm">
        {r.lines.map((l) => (
          <div key={l.label} className="flex justify-between gap-3">
            <dt className="text-ink-2">{l.label}</dt>
            <dd className={clsx('tabular', l.amount < 0 && 'text-red-700')}>{inr(l.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold"><dt>Reaches you</dt><dd className="tabular">{inr(r.net)}</dd></div>
      </dl>
    </div>
  )
}

const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-10 font-display text-3xl tracking-tight text-ink">{children}</h2>

const BODIES: Record<string, ReactNode> = {
  '/amazon-return-cost': (
    <>
      <H2>The worked example</H2>
      <p>A ₹1,499 shirt, returned and resold on Amazon.in. Every line comes from Amazon’s published fee schedule, GST rules and courier rates on ReturnRescue’s rate card.</p>
      <Breakdown calc={amazonExample.a} title="Like new" />
      <Breakdown calc={amazonExample.b} title="Small, fixable flaws" />
      <H2>Why so much disappears</H2>
      <p>For apparel, Amazon’s referral fee is a percentage of the price that rises in higher price bands, and a closing fee and delivery charge apply to every order. If you’re GST-registered, the GST inside the price goes to the government, while GST on the fees comes back as input tax credit. A return also can’t be sold as new once it has any visible flaw, which is where most of the value goes.</p>
      <H2>How to keep more</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Grade returns the day they arrive — undecided stock loses value every week.</li>
        <li>Restock anything like-new instead of sending it to a liquidator.</li>
        <li>If you also sell on Flipkart, Meesho or your own site, compare where each return is worth most.</li>
        <li>Fix small issues in-house: pressing, re-tagging and repackaging cost far less than the value they save.</li>
      </ul>
    </>
  ),
  '/what-to-do-with-returned-products': (
    <>
      <H2>The decision, by condition</H2>
      <div className="my-6 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-line bg-paper">
            <tr><th className="px-3 py-2 font-medium">Condition</th><th className="px-3 py-2 font-medium">Usually best</th><th className="px-3 py-2 font-medium">Also allowed</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr><td className="px-3 py-2">A · like new</td><td className="px-3 py-2">Restock & resell</td><td className="px-3 py-2">Refurbish, liquidate, recycle</td></tr>
            <tr><td className="px-3 py-2">B · small, fixable issues</td><td className="px-3 py-2">Repackage / refurbish</td><td className="px-3 py-2">Liquidate, recycle</td></tr>
            <tr><td className="px-3 py-2">C · damaged</td><td className="px-3 py-2">Liquidate</td><td className="px-3 py-2">Recycle</td></tr>
            <tr><td className="px-3 py-2">Unclear</td><td className="px-3 py-2" colSpan={2}>A person checks it first — no option until then</td></tr>
          </tbody>
        </table>
      </div>
      <p>“Usually” matters: the right answer is whichever option leaves the most money after every fee and cost, and that depends on the price, the platform and what the repair costs. Work it out per item rather than by habit.</p>
      <H2>Three rules that save money</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Leave sunk costs out.</strong> Return shipping you’ve already paid doesn’t change which option is best.</li>
        <li><strong>Hygiene first.</strong> Innerwear and swimwear can only be restocked or refurbished with an intact hygiene seal.</li>
        <li><strong>Liquidate in batches.</strong> Liquidators usually buy in lots, so group damaged items together.</li>
      </ul>
    </>
  ),
  '/how-to-grade-returned-clothes-and-shoes': (
    <>
      <H2>The three grades</H2>
      <div className="my-6 grid gap-3 sm:grid-cols-3">
        {[
          ['A · Like new', 'No visible damage at all and looks unused, with tags attached.'],
          ['B · Fixable', 'A scuff, crease, loose thread, missing tag or damaged box — fixable by cleaning, pressing, re-tagging, repackaging or a small repair.'],
          ['C · Damaged', 'A lasting stain, tear, heavy wear, worn-through sole, broken zip or heel — not fixable for full price.'],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-line bg-white p-4"><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-ink-2">{b}</p></div>
        ))}
      </div>
      <H2>Checks photos can’t do</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Smell and hygiene — especially activewear, innerwear and swimwear.</li>
        <li>The inside: linings, insoles, inside seams and pockets.</li>
        <li>That both shoes of a pair match, and the soles.</li>
        <li>Authenticity, if the item could have been swapped.</li>
      </ul>
      <H2>Make it consistent</H2>
      <p>Write the rules down, use the same lighting and photo angles, and have a second person check anything borderline. Tools like ReturnRescue let an AI list the visible defects and propose a grade, then fixed rules check it — any visible defect rules out A, a major one means C — so two people get the same answer.</p>
    </>
  ),
}

export default function Guide({ path }: { path: string }) {
  usePageMeta(path)
  const a = articleFor(path)!
  return (
    <PublicLayout>
      <article>
        <header className="border-b border-line">
          <div className="mx-auto max-w-3xl px-5 pb-10 pt-14">
            <Eyebrow>Guide</Eyebrow>
            <h1 className="mt-4 font-display text-[40px] leading-[1.05] tracking-tight sm:text-[52px]">{a.h1}</h1>
            <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">Short answer</p>
              <p className="mt-2 text-[17px] leading-relaxed text-ink">{a.answer}</p>
            </div>
            <p className="mt-3 text-xs text-muted">Modelled with ReturnRescue’s published rate card, November 2026. Your own fees and prices may differ — <Link to="/calculator" className="underline">check yours</Link>.</p>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-5 py-10 text-[15px] leading-relaxed text-ink-2">
          {BODIES[path]}
          <H2>Common questions</H2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {a.faqs.map((f) => (
              <div key={f.q} className="py-4">
                <h3 className="font-medium text-ink">{f.q}</h3>
                <p className="mt-1.5">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            <Link to="/calculator" className={buttonClass('primary', 'lg')}>Value a return free <ArrowRight className="size-4" /></Link>
            <Link to="/returns-report-2026" className={buttonClass('secondary', 'lg')}>The 2026 returns report</Link>
            {accountsEnabled && <Link to="/signup" className={buttonClass('ghost', 'lg')}>{offer().cta}</Link>}
          </div>
          <div className="mt-10">
            <p className="text-sm font-semibold text-ink">More guides</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {ARTICLES.filter((x) => x.path !== path).map((x) => (
                <li key={x.path}><Link to={x.path} className="text-brand-700 underline">{x.h1}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </article>
      <CtaBand />
    </PublicLayout>
  )
}
