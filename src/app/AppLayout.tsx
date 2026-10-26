import clsx from 'clsx'
import { BarChart3, CreditCard, Handshake, LayoutDashboard, LogOut, PackageSearch, Plus, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Badge, Button, buttonClass, Logo, Modal } from '../components/ui'
import { accountsEnabled } from '../config'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { PLAN_NAME } from '../lib/plans'

export default function AppLayout() {
  useEffect(() => {
    document.title = 'ReturnRescue'
  }, [])
  const { mode, base, resetDemo } = useWorkspace()
  const { user, plan, inTrial, trialDaysLeft, signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)

  const planLabel = plan ? PLAN_NAME[plan] : inTrial ? `Trial · ${trialDaysLeft}d left` : 'Trial ended'
  const nav = [
    { to: base, label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
    { to: `${base}/returns`, label: 'Inventory', short: 'Inventory', icon: PackageSearch, end: false },
    { to: `${base}/partners`, label: 'Partners', short: 'Partners', icon: Handshake, end: true },
    { to: `${base}/insights`, label: 'Insights', short: 'Insights', icon: BarChart3, end: true },
    { to: `${base}/rates`, label: 'Your rates', short: 'Rates', icon: SlidersHorizontal, end: true },
    ...(mode === 'account' ? [{ to: `${base}/billing`, label: 'Plan & billing', short: 'Plan', icon: CreditCard, end: true }] : []),
  ]

  const doSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const sideLink = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-ink-2 hover:bg-white/60',
    )
  const tabLink = ({ isActive }: { isActive: boolean }) =>
    clsx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand-700' : 'text-muted')

  const mobileTabs = [nav[0], nav[1], null, nav[2], nav[3]]

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper-2/60 px-4 py-5 lg:flex">
        <Link to="/" className="px-2" aria-label="ReturnRescue home">
          <Logo />
        </Link>
        <Link to={`${base}/returns/new`} className={buttonClass('primary', 'md', 'mt-6 w-full')}>
          <Plus className="size-4" /> Add return
        </Link>
        <nav className="mt-5 flex flex-col gap-1" aria-label="Workspace">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={sideLink}>
              <n.icon className="size-[18px]" aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          {mode === 'demo' ? (
            <>
              {/* Signed-in visitors go back to their own workspace instead of being offered a trial. */}
              {user ? (
                <Link to="/app" className={buttonClass('dark', 'md', 'w-full')}>Open my workspace</Link>
              ) : (
                accountsEnabled && (
                  <Link to="/signup" className={buttonClass('dark', 'md', 'w-full')}>
                    <Sparkles className="size-4" /> Start free trial
                  </Link>
                )
              )}
              <button className="flex w-full items-center gap-2 px-2 text-sm text-muted hover:text-ink" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="size-4" /> Reset demo data
              </button>
            </>
          ) : (
            <div className="rounded-xl border border-line bg-white px-3 py-2.5">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <Link to={`${base}/billing`}><Badge tone={plan || inTrial ? 'brand' : 'amber'}>{planLabel}</Badge></Link>
                <button className="text-xs text-muted hover:text-ink" onClick={doSignOut}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <Link to="/" aria-label="ReturnRescue home"><Logo /></Link>
        {mode === 'demo' ? (
          <div className="flex items-center gap-1">
            {user ? (
              <Link to="/app" className={buttonClass('primary', 'sm')}>My workspace</Link>
            ) : (
              accountsEnabled && <Link to="/signup" className={buttonClass('primary', 'sm')}>Free trial</Link>
            )}
            <Link to={`${base}/rates`} className="rounded-lg p-2 text-muted hover:bg-ink/5" aria-label="Your rates">
              <SlidersHorizontal className="size-4" />
            </Link>
            <button className="rounded-lg p-2 text-muted hover:bg-ink/5" onClick={() => setConfirmReset(true)} aria-label="Reset demo data">
              <RotateCcw className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link to={`${base}/billing`} aria-label="Plan and billing"><Badge tone={plan || inTrial ? 'brand' : 'amber'}>{planLabel}</Badge></Link>
            <Link to={`${base}/rates`} className="rounded-lg p-2 text-muted hover:bg-ink/5" aria-label="Your rates">
              <SlidersHorizontal className="size-4" />
            </Link>
            <button className="rounded-lg p-2 text-muted hover:bg-ink/5" onClick={doSignOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </header>

      <div className="lg:pl-60">
        {mode === 'demo' && (
          <div className="border-b border-brand-200 bg-brand-50 px-4 py-2 text-center text-xs text-brand-900 sm:text-sm">
            <strong className="font-semibold">Demo</strong> · sample data, saved only in this browser.
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Workspace">
        {mobileTabs.map((n) =>
          n ? (
            <NavLink key={n.to} to={n.to} end={n.end} className={tabLink}>
              <n.icon className="size-5" aria-hidden />
              {n.short}
            </NavLink>
          ) : (
            <Link key="add" to={`${base}/returns/new`} className="flex flex-1 flex-col items-center pb-1.5" aria-label="Add return">
              <span className="-mt-5 grid size-12 place-items-center rounded-full bg-brand-700 text-white shadow-lg shadow-brand-900/25 ring-4 ring-paper">
                <Plus className="size-6" />
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-muted">Add</span>
            </Link>
          ),
        )}
      </nav>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                await resetDemo?.()
                setConfirmReset(false)
                navigate('/demo')
              }}
            >
              Reset demo
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">This restores the ten sample returns and removes your demo changes. Real accounts are never affected.</p>
      </Modal>
    </div>
  )
}
