// Answer-first guides. Plain text here (no markup) so the same answers go into each page's
// structured data; the page bodies are in Guide.tsx. Numbers come from the real engine.

import { inr, pct } from '../../lib/format'
import { quoteReturn } from '../../lib/quote'
import { liquidateEverythingLoss, minorFlawCost, recoveryRate, recyclingRange } from '../../lib/report'

export interface Article {
  path: string
  title: string
  /** Shown as the page heading. */
  h1: string
  description: string
  /** The direct answer, first thing on the page. */
  answer: string
  faqs: { q: string; a: string }[]
}

const amz = (condition: 'A' | 'B') => quoteReturn({ category: 'Topwear', price: 1499, platform: 'amazon', condition }).calc
const fk = quoteReturn({ category: 'Topwear', price: 1499, platform: 'flipkart', condition: 'A' }).calc
const amzA = amz('A')
const amzB = amz('B')

export const amazonExample = { a: amzA, b: amzB, flipkartA: fk }

export const ARTICLES: Article[] = [
  {
    path: '/amazon-return-cost',
    title: 'How much does a return cost an Amazon.in fashion seller in 2026? — ReturnRescue',
    h1: 'How much does a return cost an Amazon.in fashion seller in 2026?',
    description: `A ₹1,499 apparel return resold on Amazon.in in like-new condition leaves about ${inr(amzA.recommendedNet)} after fees, GST and delivery. With small flaws, about ${inr(amzB.recommendedNet)}. Worked example and how to keep more.`,
    answer: `If a ₹1,499 apparel item comes back in like-new condition and you resell it on Amazon.in, about ${inr(amzA.recommendedNet)} (${pct((amzA.recommendedNet ?? 0) / 1499)}) of the price reaches you once referral and closing fees, GST and delivery are taken out. If it has small, fixable flaws — a crease or a missing tag — it can’t be sold as new, and the best option leaves about ${inr(amzB.recommendedNet)}. The same like-new item resold on Flipkart leaves about ${inr(fk.recommendedNet)}.`,
    faqs: [
      { q: 'What fees does Amazon.in charge when I resell a returned item?', a: 'A referral fee (a percentage of the price, which depends on the category and price band), a closing fee per order, and a weight-handling (delivery) fee. GST applies to these fees; a GST-registered seller can claim it back as input tax credit.' },
      { q: 'Should I count the return shipping I already paid?', a: 'No. Return shipping you’ve already paid is spent whichever option you choose, so it shouldn’t change the decision. Track it for your profit and loss, but leave it out when comparing restock, refurbish, liquidate and recycle.' },
      { q: 'Is it cheaper to resell returns on another platform?', a: `It can be. In ReturnRescue’s 2026 model, a like-new ₹1,499 shirt leaves ${inr(amzA.recommendedNet)} on Amazon.in and ${inr(fk.recommendedNet)} on Flipkart. Check your own fees with the free calculator before deciding.` },
    ],
  },
  {
    path: '/what-to-do-with-returned-products',
    title: 'Restock, refurbish, liquidate or recycle? What to do with a returned product — ReturnRescue',
    h1: 'Restock, refurbish, liquidate or recycle: what to do with a returned product',
    description: `Choose by condition: restock like-new items, repair or repackage small flaws, liquidate damaged stock, and recycle only as a last resort. Liquidating good stock loses about ${inr(liquidateEverythingLoss('A').rupees)} per item.`,
    answer: `Decide by condition, then by money. Like-new items should go straight back to stock — liquidating them instead loses about ${inr(liquidateEverythingLoss('A').rupees)} per item. Items with small, fixable flaws should be cleaned, repaired or repackaged and resold, which beats liquidation by about ${inr(liquidateEverythingLoss('B').rupees)} per item. Damaged items should be liquidated in bulk. Recycling costs ${inr(-recyclingRange().max)}–${inr(-recyclingRange().min)} per item, so use it only when nothing else is allowed.`,
    faqs: [
      { q: 'When should I liquidate returned stock?', a: 'When the item has damage that can’t be repaired for full-price resale — a lasting stain, heavy wear, a broken zip or worn sole. Liquidation is a bulk sale to an off-price buyer: you pay commission and freight but no per-order fees.' },
      { q: 'Can returned innerwear or swimwear be restocked?', a: 'Only if the hygiene seal is intact and confirmed by a person. Without it, restock and refurbish are not allowed, whatever the condition looks like in photos.' },
      { q: 'Is recycling ever the best option?', a: 'Rarely. Sorting and transport usually make it a small cost. It’s the right choice when an item can’t legally or safely be resold and no liquidator will take it.' },
    ],
  },
  {
    path: '/how-to-grade-returned-clothes-and-shoes',
    title: 'How to grade returned clothes and shoes (A, B, C) — ReturnRescue',
    h1: 'How to grade returned clothes and shoes: A, B, C — and when a person must check',
    description: `Grade A: no visible damage. Grade B: small, fixable issues. Grade C: damage you can’t fix for full price. One grade apart is worth about ${pct(minorFlawCost().avg)} of the price, so grade consistently.`,
    answer: `Use three grades and one rule for anything uncertain. Grade A: no visible defects, looks unused — it can go straight back to stock. Grade B: only small or moderate issues that cleaning, pressing, re-tagging, repackaging or a small repair can fix. Grade C: at least one major defect, or damage that can’t be fixed for full-price resale. Anything photos can’t settle — odour, hygiene, authenticity, a possible mismatch — goes to a person before it gets a grade. The grade matters: on average, a grade-B item recovers ${pct(recoveryRate((s) => s.condition === 'B'))} of its price against ${pct(recoveryRate((s) => s.condition === 'A'))} for grade A.`,
    faqs: [
      { q: 'Can AI grade returned products from photos?', a: 'It can find visible defects and propose a grade, and fixed rules can check that grade against the defects — any visible defect rules out A, a major one means C. It cannot check smell, hidden damage, hygiene or authenticity, so a person should still check those.' },
      { q: 'How do I grade one shoe from a pair?', a: 'Grade the shoe you can see and add a physical check that the other shoe matches, including the soles and insides.' },
      { q: 'Why does consistent grading matter?', a: `Because the grade decides what you can do with the item. In ReturnRescue’s 2026 model, one grade apart is worth about ${pct(minorFlawCost().avg)} of the price on average, so two people grading the same item differently costs real money.` },
    ],
  },
]

export const articleFor = (path: string) => ARTICLES.find((a) => a.path === path)
