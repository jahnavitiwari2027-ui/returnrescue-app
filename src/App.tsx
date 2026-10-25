import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Spinner } from './components/ui'
import { accountsEnabled } from './config'
import { useAuth } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { PUBLIC_ROUTES } from './pages/site/routes'

const AuthPage = lazy(() => import('./pages/AuthPage'))
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AppLayout = lazy(() => import('./app/AppLayout'))
const Dashboard = lazy(() => import('./app/DashboardPage'))
const Inventory = lazy(() => import('./app/InventoryPage'))
const ReturnForm = lazy(() => import('./app/ReturnFormPage'))
const ReturnDetail = lazy(() => import('./app/ReturnDetailPage'))
const Insights = lazy(() => import('./app/InsightsPage'))
const Billing = lazy(() => import('./app/BillingPage'))
const Partners = lazy(() => import('./app/PartnersPage'))
const Rates = lazy(() => import('./app/RatesPage'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth()
  const location = useLocation()
  if (!accountsEnabled) return <Navigate to="/login" replace />
  if (!ready) return <FullPageSpinner />
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <>{children}</>
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner />
    </div>
  )
}

function workspaceRoutes(mode: 'demo' | 'account') {
  return (
    <>
      <Route index element={<Dashboard />} />
      <Route path="returns" element={<Inventory />} />
      <Route path="returns/new" element={<ReturnForm />} />
      <Route path="returns/:id" element={<ReturnDetail />} />
      <Route path="returns/:id/edit" element={<ReturnForm />} />
      <Route path="insights" element={<Insights />} />
      <Route path="partners" element={<Partners />} />
      <Route path="rates" element={<Rates />} />
      {mode === 'account' && <Route path="billing" element={<Billing />} />}
      <Route path="*" element={<NotFound inApp />} />
    </>
  )
}

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ScrollToTop />
      <Routes>
        {PUBLIC_ROUTES.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route
          path="/demo"
          element={
            <WorkspaceProvider mode="demo">
              <AppLayout />
            </WorkspaceProvider>
          }
        >
          {workspaceRoutes('demo')}
        </Route>
        <Route
          path="/app"
          element={
            <RequireAuth>
              <WorkspaceProvider mode="account">
                <AppLayout />
              </WorkspaceProvider>
            </RequireAuth>
          }
        >
          {workspaceRoutes('account')}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
