import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../components/SiteChrome'
import { config } from '../config'
import { usePageMeta } from './site/shared'

const UPDATED = '26 October 2026'

const contact = config.contactEmail ? (
  <a className="underline" href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
) : (
  <Link className="underline" to="/#contact">our contact form</Link>
)

const docs: Record<'privacy' | 'terms' | 'refunds', { title: string; body: ReactNode }> = {
  privacy: {
    title: 'Privacy policy',
    body: (
      <>
        <p>This policy explains what ReturnRescue (“we”, “us”) collects when you use our website and application, why, and the choices you have.</p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> your email address, an optional business name and a securely hashed password.</li>
          <li><strong>Workspace data:</strong> the return records you create — product names, SKUs, prices, notes, cost estimates, grades, decisions — and the product photos you upload.</li>
          <li><strong>Billing data:</strong> subscription status and identifiers sent to us by our payment provider. We never see or store your full card details.</li>
          <li><strong>Usage data:</strong> counts of AI inspections and summaries you run, used to apply plan limits. Our hosting provider keeps standard request logs. We use Microsoft Clarity to see how visitors use the site (pages visited, clicks and scrolling); it masks text you type and uses cookies.</li>
          <li><strong>Demo workspace:</strong> anything you enter in the demo stays in your browser’s local storage. Photos you submit for an AI inspection in the demo are sent to our AI provider for that single request and not stored by us.</li>
        </ul>
        <h2>How we use it</h2>
        <p>To provide the service: store your records, run AI inspections you request, calculate recovery values, process your subscription, and respond to you. We do not sell your data or use it for advertising.</p>
        <h2>Service providers</h2>
        <ul>
          <li><strong>Supabase</strong> — authentication, database and private photo storage.</li>
          <li><strong>Google (Gemini API)</strong> — the AI model that analyses photos and notes when you run an inspection or a summary. Data is sent only when you click to run it. While we use Google’s free API tier, Google may use submitted content to improve its products, so don’t upload photos showing people or personal information.</li>
          <li><strong>Dodo Payments</strong> — checkout, subscription billing, invoices and payment security, acting as merchant of record.</li>
          <li><strong>Netlify</strong> — website hosting and server functions.</li>
          <li><strong>Microsoft Clarity</strong> — site analytics (how pages are used). We don’t use it for advertising.</li>
        </ul>
        <h2>Retention and deletion</h2>
        <p>Your records stay until you delete them. Deleting a return removes its record and photos. To delete your account and all workspace data, contact us at {contact}; we act on requests within 30 days, except where billing records must be kept by law.</p>
        <h2>Security</h2>
        <p>Data is encrypted in transit. Each workspace is isolated with row-level security, photos are in a private bucket served through short-lived signed links, and secret keys never reach your browser.</p>
        <h2>Your rights</h2>
        <p>You can access, correct, export (on a paid plan) or delete your data. For any privacy request, contact {contact}. This policy is governed by the laws of India, including the Digital Personal Data Protection Act, 2023.</p>
      </>
    ),
  },
  terms: {
    title: 'Terms of service',
    body: (
      <>
        <p>By creating an account or using ReturnRescue you agree to these terms.</p>
        <h2>The service</h2>
        <p>ReturnRescue helps businesses assess returned products and compare recovery options. It provides AI-generated condition assessments and calculations based on figures you enter.</p>
        <h2>AI assessments are provisional</h2>
        <p>AI inspection analyses only what is visible in your photos and what you write. It cannot verify hidden defects, hygiene, odour, authenticity, safety or regulatory compliance, and it can be wrong. You are responsible for physically checking items and for every resale, liquidation or disposal decision you make.</p>
        <h2>Estimates are not offers</h2>
        <p>Recovery values are calculated from your rate card (published prices and stated assumptions), your own estimates and quotes. They are not guarantees, valuations or offers from ReturnRescue or any third party.</p>
        <h2>Your content</h2>
        <p>You own the data and photos you upload and grant us permission to process them only to provide the service. Do not upload images of people or personal data of your customers.</p>
        <h2>Plans and payment</h2>
        <p>The free plan has the limits shown on our pricing page. Starter and Pro are subscriptions billed in advance, monthly or yearly, through Dodo Payments, and renew automatically until cancelled. When you switch plans, the difference for the rest of the current period is charged or credited straight away. See our <Link className="underline" to="/refunds">refund & cancellation policy</Link>.</p>
        <h2>Acceptable use</h2>
        <p>Do not misuse the service, attempt to access other workspaces, overload the AI features, or use it for unlawful purposes. We may suspend accounts that do.</p>
        <h2>Liability</h2>
        <p>The service is provided “as is”. To the extent permitted by law, our total liability is limited to the fees you paid in the three months before a claim. We are not liable for indirect losses or for decisions made using the product’s outputs.</p>
        <h2>Changes and law</h2>
        <p>We may update these terms and will note the date below. These terms are governed by the laws of India. Questions: {contact}.</p>
      </>
    ),
  },
  refunds: {
    title: 'Refunds & cancellation',
    body: (
      <>
        <h2>Cancelling</h2>
        <p>You can cancel Starter or Pro at any time from <strong>Plan & billing → Manage or cancel subscription</strong>. Cancellation stops the next renewal; your workspace keeps its plan until the end of the month or year you already paid for, then moves to the free plan. Your data is not deleted when you cancel.</p>
        <h2>Switching plans</h2>
        <p>You can move between Starter and Pro, or between monthly and yearly billing, from Plan & billing. The difference for the rest of the current period is charged or credited straight away by Dodo Payments.</p>
        <h2>Refunds</h2>
        <ul>
          <li>If you are charged for a plan and haven’t used it, contact us within 7 days of the charge for a full refund.</li>
          <li>If a technical fault on our side prevents you from using your plan’s features, we will refund the affected period.</li>
          <li>Otherwise, unused parts of a month or year are not refunded.</li>
        </ul>
        <p>Refunds are issued through Dodo Payments to the original payment method and usually appear within 5–10 business days, depending on your bank.</p>
        <h2>Failed payments</h2>
        <p>If a renewal payment fails, paid features pause until payment succeeds. Your records remain available.</p>
        <h2>Contact</h2>
        <p>For billing help or refund requests, contact {contact} with the email on your account.</p>
      </>
    ),
  },
}

export default function LegalPage({ doc }: { doc: keyof typeof docs }) {
  const d = docs[doc]
  usePageMeta(`/${doc}`)
  return (
    <PublicLayout>
      <article className="mx-auto max-w-2xl px-5 py-16 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-ink-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-ink-2">
        <h1 className="font-display text-5xl tracking-tight">{d.title}</h1>
        <p className="!mt-2 text-sm !text-muted">Last updated {UPDATED}</p>
        {d.body}
      </article>
    </PublicLayout>
  )
}
