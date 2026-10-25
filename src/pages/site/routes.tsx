// Public pages, loaded eagerly (no spinner) and saved as HTML at build time by scripts/prerender.mjs.
import type { ReactElement } from 'react'
import LegalPage from '../LegalPage'
import Contact from './Contact'
import Faq from './Faq'
import Features from './Features'
import Home from './Home'
import Pricing from './Pricing'

export const PUBLIC_ROUTES: { path: string; element: ReactElement }[] = [
  { path: '/', element: <Home /> },
  { path: '/features', element: <Features /> },
  { path: '/pricing', element: <Pricing /> },
  { path: '/faq', element: <Faq /> },
  { path: '/contact', element: <Contact /> },
  { path: '/privacy', element: <LegalPage doc="privacy" /> },
  { path: '/terms', element: <LegalPage doc="terms" /> },
  { path: '/refunds', element: <LegalPage doc="refunds" /> },
]
