import clsx from 'clsx'
import { BarChart3, CreditCard, LayoutDashboard, LogOut, PackageSearch, Plus, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Badge, Button, buttonClass, Logo, Modal } from '../components/ui'
import { accountsEnabled } from '../config'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

export default function AppLayout() {
  const { mode, base, resetDemo } = useWorkspace()
  const { user, isPro, signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)

  const nav = [
    { to: base, label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: `${base}/returns`, label: 'Inventory', icon: PackageSearch, end: false },
    { to: `${base}/returns/new`, label: 'Add return', icon: Plus, end: true },
    { to: `${base}/insights`, label: 'Insights', icon: BarChart3, end: true },
    ...(mode === 'account' ? [{ to: `${base}/billing`, label: 'Plan & billing', icon: CreditCard, end: true }] : []),
  ]

  const navLink = (mobile: boolean) =>
    ({ isActive }: { isActive: boolean }) =>
      mobile
        ? clsx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand-700' : 'text-muted')
        : clsx(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-ink-2 hover:bg-white/60',
          )

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper-2/60 px-4 py-5 lg:flex">
        <Link to="/" className="px-2" aria-label="ReturnRescue home">
          <Logo />
        </Link>
        <div className="mt-6 rounded-xl border border-line bg-white px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Workspace</p>
          {mode === 'demo' ? (
            <p className="mt-0.5 flex items-center gap-2 text-sm font-medium">
              Demo <Badge>Sample data</Badge>
            </p>
          ) : (
            <p className="mt-0.5 flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{user?.email}</span>
              <Badge tone={isPro ? 'brand' : 'neutral'}>{isPro ? 'Pro' : 'Free'}</Badge>
            </p>
          )}
        </div>
        <nav className="mt-5 flex flex-col gap-1" aria-label="Workspace">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navLink(false)}>
              <n.icon className="size-[18px]" aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {mode === 'demo' ? (
            <>
              <Button variant="ghost" size="sm" className="w-full justify-start" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
                Reset demo data
              </Button>
              {accountsEnabled && (
                <Link to="/signup" className={buttonClass('dark', 'md', 'w-full')}>
                  Create free account
                </Link>
              )}
            </>
          ) : (
            <>
              {!isPro && (
                <Link to={`${base}/billing`} className={buttonClass('primary', 'md', 'w-full')}>
                  <Sparkles className="size-4" /> Upgrade to Pro
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                icon={<LogOut className="size-4" />}
                onClick={async () => {
                  await signOut()
                  navigate('/')
                }}
              >
                Sign out
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <Link to="/" aria-label="ReturnRescue home">
          <Logo />
        </Link>
        {mode === 'demo' ? (
          <div className="flex items-center gap-2">
            <Badge>Demo</Badge>
            <button className="rounded-lg p-2 text-muted hover:bg-ink/5" onClick={() => setConfirmReset(true)} aria-label="Reset demo data">
              <RotateCcw className="size-4" />
            </button>
          </div>
        ) : (
          <button
            className="rounded-lg p-2 text-muted hover:bg-ink/5"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        )}
      </header>

      <div className="lg:pl-64">
        {mode === 'demo' && (
          <div className="border-b border-brand-200 bg-brand-50 px-4 py-2 text-center text-xs text-brand-900 sm:text-sm">
            <strong className="font-semibold">Demo workspace.</strong> Ten fictional sample returns, stored only in this browser and kept separate from real accounts.
            {accountsEnabled && (
              <>
                {' '}
                <Link to="/signup" className="font-semibold underline underline-offset-2">
                  Create a free account
                </Link>{' '}
                to save your own.
              </>
            )}
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Workspace">
        {nav.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={navLink(true)}>
            <n.icon className="size-5" aria-hidden />
            {n.label === 'Plan & billing' ? 'Plan' : n.label}
          </NavLink>
        ))}
      </nav>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
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
        <p className="text-sm text-ink-2">
          This restores the ten sample returns and removes anything you added or changed in the demo. Real account data is never affected.
        </p>
      </Modal>
    </div>
  )
}
