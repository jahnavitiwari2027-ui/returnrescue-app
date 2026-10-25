import { Link } from 'react-router-dom'
import { PublicLayout } from '../../components/SiteChrome'
import { FAQS } from './faqs'
import { CtaBand, PageIntro, usePageMeta } from './shared'

export default function Faq() {
  usePageMeta('/faq')
  return (
    <PublicLayout>
      <PageIntro eyebrow="FAQ" title="Questions, answered.">
        How the AI and the maths work, what the plans include, and how billing works. Something missing? <Link to="/contact" className="font-medium text-brand-700 underline">Ask us</Link>.
      </PageIntro>
      <section className="mx-auto max-w-4xl px-5 py-16">
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                <h2 className="text-base font-medium">{f.q}</h2>
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 pr-10 text-sm leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <CtaBand />
    </PublicLayout>
  )
}
