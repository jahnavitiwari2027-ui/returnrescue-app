// Title and description for each public page. Used for the browser tab, for the HTML saved at
// build time (what search engines and AI tools read) and for sitemap.xml.

import { ARTICLES } from './articles'

export const SITE_URL = 'https://returnrescue.dpdns.org'

export interface PageMeta {
  path: string
  title: string
  description: string
}

export const PAGES: PageMeta[] = [
  {
    path: '/',
    title: 'ReturnRescue — AI grading and recovery for returned fashion',
    description:
      'Photograph a returned product. ReturnRescue grades it with AI, prices every option for where it sells — Amazon.in, Flipkart, Meesho or your own site — and saves the one that recovers the most. For Indian D2C fashion and footwear brands.',
  },
  {
    path: '/features',
    title: 'Features — ReturnRescue',
    description:
      'How ReturnRescue works: AI photo inspection with rule checks, automatic grading, platform fees and GST, a sourced rate card, the recovery calculator, next steps with local partners, inventory and insights.',
  },
  {
    path: '/pricing',
    title: 'Pricing — ReturnRescue',
    description: 'Free trial until Mon 16 Nov 2026 with 8 complimentary AI runs. Plans from ₹69: 15 AI runs one-time, or Starter ₹499 a month (₹5,388 a year) and Pro ₹999 a month (₹10,788 a year).',
  },
  {
    path: '/faq',
    title: 'FAQ — ReturnRescue',
    description: 'Answers about AI grading, where the rupee values come from, GST, plans, yearly billing, switching and cancelling.',
  },
  {
    path: '/contact',
    title: 'Contact — ReturnRescue',
    description: 'Questions about ReturnRescue, an AI result or your plan? Send a message — we reply within two working days.',
  },
  {
    path: '/calculator',
    title: 'Free return value calculator for Amazon, Flipkart & Meesho sellers — ReturnRescue',
    description:
      'What is a returned product worth? Enter the price, platform and condition to see what restocking, refurbishing, liquidating or recycling actually leaves you after fees, GST and delivery. Free, no sign-up.',
  },
  {
    path: '/returns-report-2026',
    title: 'What a return really costs Indian fashion sellers in 2026 — ReturnRescue report',
    description:
      'We modelled 216 typical fashion returns across Amazon.in, Flipkart, Meesho and own websites. Like-new returns recover about 80% of their price; one small flaw costs about 47% more. Findings, method and limits.',
  },
  ...ARTICLES.map((a) => ({ path: a.path, title: a.title, description: a.description })),
  { path: '/privacy', title: 'Privacy policy — ReturnRescue', description: 'What ReturnRescue collects, why, who processes it and how to delete it.' },
  { path: '/terms', title: 'Terms of service — ReturnRescue', description: 'The terms for using ReturnRescue.' },
  { path: '/refunds', title: 'Refunds and cancellation — ReturnRescue', description: 'How cancelling, plan changes and refunds work for ReturnRescue plans.' },
]

export const metaFor = (path: string) => PAGES.find((p) => p.path === path) ?? PAGES[0]
