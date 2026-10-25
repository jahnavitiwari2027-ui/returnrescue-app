// Build-time only: renders each public page to HTML (see scripts/prerender.mjs), so search
// engines and AI tools that don't run JavaScript can still read the site.
import { renderToString } from 'react-dom/server'
import { Route, Routes, StaticRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PUBLIC_ROUTES } from './pages/site/routes'

export function render(url: string) {
  return renderToString(
    <StaticRouter location={url}>
      <AuthProvider>
        <Routes>
          {PUBLIC_ROUTES.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
        </Routes>
      </AuthProvider>
    </StaticRouter>,
  )
}

export { FAQS } from './pages/site/faqs'
export { PAGES, SITE_URL } from './pages/site/meta'
export { PLAN_NAME, PRICE } from './lib/plans'
export { LIMITS } from './config'
