import { ArrowRight, MailCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Field, Input, LinkButton, Logo } from '../components/ui'
import { accountsEnabled } from '../config'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage({ mode }: { mode: Mode }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')?.startsWith('/app') ? params.get('next')! : '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [business, setBusiness] = useState('')
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (session && mode !== 'forgot') navigate(next, { replace: true })
  }, [session, mode, next, navigate])

  useEffect(() => {
    setErrors({})
    setFormError('')
    setDone('')
  }, [mode])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    const errs: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address.'
    if (mode !== 'forgot' && password.length < 8) errs.password = 'Use at least 8 characters.'
    if (mode === 'signup' && !agree) errs.agree = 'Please accept the terms to continue.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setFormError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { business_name: business.trim() }, emailRedirectTo: `${window.location.origin}/app` },
        })
        if (error) throw error
        if (!data.session) setDone('Check your inbox to confirm your email, then sign in.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/update-password`,
        })
        if (error) throw error
        setDone('If an account exists for that email, a reset link is on its way.')
      }
    } catch (err) {
      const msg = (err as Error).message
      setFormError(
        /invalid login/i.test(msg)
          ? 'Email or password is incorrect.'
          : /already registered/i.test(msg)
            ? 'An account with this email already exists. Try signing in.'
            : /rate limit/i.test(msg)
              ? 'Too many attempts right now. Please wait a minute and try again.'
              : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  const titles = {
    login: ['Welcome back', 'Sign in to your ReturnRescue workspace.'],
    signup: ['Create your workspace', 'Free to start. No card required.'],
    forgot: ['Reset your password', 'We’ll email you a secure link.'],
  }[mode]

  const google = async () => {
    if (!supabase) return
    setFormError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${next}` } })
    if (error) setFormError(/provider is not enabled|unsupported provider/i.test(error.message) ? 'Google sign-in isn’t switched on yet — please use email for now.' : error.message)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" aria-label="ReturnRescue home"><Logo /></Link>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-4xl tracking-tight">{titles[0]}</h1>
          <p className="mt-2 text-sm text-muted">{titles[1]}</p>

          {!accountsEnabled ? (
            <Alert tone="warning" className="mt-8" title="Accounts aren’t switched on for this deployment yet">
              You can still explore every feature in the demo workspace.
              <div className="mt-3"><LinkButton to="/demo" size="sm">Open the demo</LinkButton></div>
            </Alert>
          ) : done ? (
            <Alert tone="success" icon={<MailCheck className="size-4" />} className="mt-8">{done}</Alert>
          ) : (
            <form onSubmit={submit} noValidate className="mt-8 space-y-4">
              {mode !== 'forgot' && (
                <>
                  <Button variant="secondary" size="lg" className="w-full" onClick={google}>
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" /></div>
                </>
              )}
              {mode === 'signup' && (
                <Field label="Business name" hint="Optional">
                  {(id) => <Input id={id} value={business} onChange={(e) => setBusiness(e.target.value)} autoComplete="organization" />}
                </Field>
              )}
              <Field label="Work email" error={errors.email}>
                {(id, d) => <Input id={id} aria-describedby={d} type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} autoComplete="email" />}
              </Field>
              {mode !== 'forgot' && (
                <Field label="Password" error={errors.password} hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
                  {(id, d) => (
                    <Input id={id} aria-describedby={d} type="password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                  )}
                </Field>
              )}
              {mode === 'signup' && (
                <div>
                  <label className="flex items-start gap-2 text-sm text-ink-2">
                    <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                    <span>I agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</span>
                  </label>
                  {errors.agree && <p className="mt-1 text-xs font-medium text-red-700">{errors.agree}</p>}
                </div>
              )}
              {formError && <Alert tone="error">{formError}</Alert>}
              <Button type="submit" size="lg" className="w-full" loading={busy} icon={<ArrowRight className="size-4" />}>
                {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </Button>
            </form>
          )}

          <div className="mt-6 space-y-2 text-sm text-muted">
            {mode === 'login' && (
              <>
                <p>New here? <Link to={`/signup${params.toString() ? `?${params}` : ''}`} className="font-medium text-brand-700 hover:underline">Create a free account</Link></p>
                <p><Link to="/forgot-password" className="hover:underline">Forgot your password?</Link></p>
              </>
            )}
            {mode !== 'login' && <p>Already have an account? <Link to="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link></p>}
            <p>Just looking? <Link to="/demo" className="font-medium text-brand-700 hover:underline">Try the demo — no sign-up</Link></p>
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <div className="grain absolute inset-0 opacity-30" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="font-display text-5xl leading-[1.05]">Every return deserves<br /><em className="text-brand-200">a second chance.</em></p>
          <p className="mt-5 max-w-md text-brand-100/80">Grade returned apparel and footwear from photos, compare restock, refurbish, liquidate and recycle with transparent maths, and record every decision.</p>
        </div>
      </div>
    </div>
  )
}
