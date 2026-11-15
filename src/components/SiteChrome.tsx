import { Menu, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { accountsEnabled, config } from '../config'
import { useAuth } from '../context/AuthContext'
import { buttonClass, Logo } from './ui'

export function SiteHeader() {
  const { session } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const links = [
    ['Features', '/features'],
    ['Pricing', '/pricing'],
    ['FAQ', '/faq'],
    ['Contact', '/contact'],
    ['Demo', '/demo'],
  ]
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled || open ? 'border-b border-line bg-paper/85 backdrop-blur-md' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" aria-label="ReturnRescue home"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm text-ink-2 md:flex" aria-label="Main">
          {links.map(([l, h]) => (
            <NavLink key={h} to={h} className={({ isActive }) => `transition-colors hover:text-ink ${isActive ? 'font-medium text-ink' : ''}`}>{l}</NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <Link to="/app" className={buttonClass('primary', 'sm')}>Open workspace</Link>
          ) : (
            <>
              {accountsEnabled && <Link to="/login" className={buttonClass('ghost', 'sm')}>Log in</Link>}
              <Link to="/demo" className={buttonClass('primary', 'sm')}>Launch app</Link>
            </>
          )}
        </div>
        <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line px-5 py-4 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-3 text-sm">
            {links.map(([l, h]) => (
              <NavLink key={h} to={h} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'font-medium text-ink' : '')}>{l}</NavLink>
            ))}
            <div className="mt-2 flex gap-2">
              {accountsEnabled && !session && <Link to="/login" className={buttonClass('secondary', 'md', 'flex-1')}>Log in</Link>}
              <Link to={session ? '/app' : '/demo'} className={buttonClass('primary', 'md', 'flex-1')}>{session ? 'Open workspace' : 'Launch app'}</Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-2/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">
            AI-assisted inspection and recovery decisions for returned apparel and footwear. Built in India for D2C brands.
          </p>
          <p className="mt-4 text-xs text-muted">
            ReturnRescue is an early-stage product developed by students of the PGP in Technology & Business Management at Masters’ Union.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link to="/features" className="hover:text-ink">Features</Link></li>
            <li><Link to="/pricing" className="hover:text-ink">Pricing</Link></li>
            <li><Link to="/demo" className="hover:text-ink">Live demo</Link></li>
            <li><Link to="/faq" className="hover:text-ink">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-ink">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link to="/privacy" className="hover:text-ink">Privacy policy</Link></li>
            <li><Link to="/terms" className="hover:text-ink">Terms of service</Link></li>
            <li><Link to="/refunds" className="hover:text-ink">Refunds & cancellation</Link></li>
            {config.contactEmail && <li><a href={`mailto:${config.contactEmail}`} className="hover:text-ink">{config.contactEmail}</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">© {new Date().getFullYear()} ReturnRescue. All rights reserved.</div>
    </footer>
  )
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  )
}
