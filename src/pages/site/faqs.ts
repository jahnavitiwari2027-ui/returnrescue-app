import { PACK_LINE, WITHOUT_PLAN } from '../../config'
import { inr } from '../../lib/format'
import { AI_INSPECTIONS, LAUNCH, PACK, PRICE, yearlySaving } from '../../lib/plans'

/** Plain text (no markup) so the same answers can go into the page's structured data. */
export interface Faq {
  q: string
  a: string
  /** Shown on the Pricing page too. */
  pricing?: boolean
}

export const FAQS: Faq[] = [
  {
    q: 'What does the AI do?',
    a: 'It looks at your photos and notes, lists each visible defect with how severe it is, and proposes a grade. It never sets a price. Fixed rules check the grade against the defects, then the grade and the best option are saved automatically. You can re-run the inspection, change the grade or choose another option at any time.',
  },
  {
    q: 'Where do the rupee values come from?',
    a: 'A published rate card: Amazon.in, Flipkart and Meesho fees, courier rates, Delhi minimum wage for in-house work, real cleaner, cobbler and tailor price lists, and surplus-stock and scrap rates. Every line links to its source, assumptions are labelled, and you can change any rate to your own.',
  },
  {
    q: 'How is GST handled?',
    a: 'If you’re GST-registered, the GST included in the selling price is deducted (it goes to the government), and GST on marketplace or gateway fees is treated as claimable input tax credit, not a cost. If you’re not registered, GST on fees counts as a cost. You set this on the Rates page.',
  },
  {
    q: 'How is the best option chosen?',
    a: 'By plain arithmetic, not AI: expected proceeds minus fees and costs for each route the grade allows. The highest net wins, and every line of the maths is visible.',
  },
  {
    q: 'What happens to past decisions if I change my rates?',
    a: 'Nothing. Saved decisions and completed returns keep the values they were decided with. Returns without a decision can be updated in one step.',
  },
  {
    q: 'What if the photo isn’t clothing, shoes or a bag?',
    a: 'The AI says what it sees and refuses to grade or price it. If the photo shows a shirt but the category says footwear, it goes to a person instead. Think it got it wrong? Every AI result has a link to contact support.',
  },
  {
    q: 'Can photos prove an item is fine to resell?',
    a: 'No. Hidden damage, hygiene, odour and authenticity need a person. Every AI result says what to check by hand.',
  },
  {
    q: 'Do I need to sign up?',
    a: `Not to look around — the demo is open. To inspect your own products, sign up with Google or your email. Until ${LAUNCH.endLabel} everything is free, with ${LAUNCH.freeInspections} AI inspections each; after that AI inspection starts at ${PACK_LINE}, one-time.`,
  },
  {
    q: 'What’s the difference between Starter and Pro?',
    a: `Starter (${inr(PRICE.starter.month)} a month) includes ${AI_INSPECTIONS.starter} AI inspections a month and everything else except AI-written briefings. Pro (${inr(PRICE.pro.month)} a month) raises AI inspections to ${AI_INSPECTIONS.pro} a month (fair use) and adds AI-written briefings on your returns.`,
    pricing: true,
  },
  {
    q: 'How does yearly billing work?',
    a: `You pay once a year instead of every month: Starter is ${inr(PRICE.starter.year)} a year (save ${inr(yearlySaving('starter'))}) and Pro is ${inr(PRICE.pro.year)} a year (save ${inr(yearlySaving('pro'))}). It renews each year until you cancel.`,
    pricing: true,
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes, from Plan & billing — between Starter and Pro, or between monthly and yearly. The difference is charged or credited straight away.',
    pricing: true,
  },
  {
    q: 'Is there a free trial?',
    a: `Instead of a trial, everything is free for everyone until ${LAUNCH.endLabel}, with ${LAUNCH.freeInspections} AI inspections each. After that, you can try AI inspection for ₹${PACK.price} (${PACK.inspections} inspections, one-time, up to ${PACK.maxPer30Days} packs a month) without subscribing. ${WITHOUT_PLAN} Nothing is charged unless you buy a pack or choose a plan.`,
    pricing: true,
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, from Plan & billing. Your plan stays active until the end of the period you’ve paid for.',
    pricing: true,
  },
]
