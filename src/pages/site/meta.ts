// Title and description for each public page. Used for the browser tab, for the HTML saved at
// build time (what search engines and AI tools read) and for sitemap.xml.

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
    description: '14-day free trial, no card. Starter ₹499 a month or ₹5,388 a year (save ₹600). Pro ₹999 a month or ₹10,788 a year (save ₹1,200).',
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
  { path: '/privacy', title: 'Privacy policy — ReturnRescue', description: 'What ReturnRescue collects, why, who processes it and how to delete it.' },
  { path: '/terms', title: 'Terms of service — ReturnRescue', description: 'The terms for using ReturnRescue.' },
  { path: '/refunds', title: 'Refunds and cancellation — ReturnRescue', description: 'How cancelling, plan changes and refunds work for ReturnRescue plans.' },
]

export const metaFor = (path: string) => PAGES.find((p) => p.path === path) ?? PAGES[0]
