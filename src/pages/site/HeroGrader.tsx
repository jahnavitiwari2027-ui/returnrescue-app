import clsx from 'clsx'
import { Camera, ChevronDown, ImageUp, Loader2, ScanSearch, Trophy, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, buttonClass, GradeBadge, Input, Select } from '../../components/ui'
import { accountsEnabled, offer } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { supabaseRepo } from '../../data/supabaseRepo'
import { api, ApiError } from '../../lib/api'
import { inspectionPatch } from '../../lib/decision'
import { inr, pct } from '../../lib/format'
import { imageForInspection, imageToDataUrl, validateImageFile } from '../../lib/image'
import { LAUNCH, PACK } from '../../lib/plans'
import { DEFAULT_RATES, PLATFORM_LABEL, PLATFORMS, type PlatformKey } from '../../lib/rates'
import { calculateRecovery, type RecoveryResult } from '../../lib/recovery'
import { supabase } from '../../lib/supabase'
import { CATEGORIES, GRADE_GUIDE, emptyReturnInput, type AIInspection, type Category, type ReturnItem } from '../../lib/types'

const PENDING_KEY = 'rr.heroGrade'

interface Details {
  name: string
  category: Category
  price: string
  platform: PlatformKey
}

interface Result {
  id: string
  ai: AIInspection
  calc: RecoveryResult | null
}

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob()

/**
 * The homepage tool, in one piece: add a photo and a few details, press Grade, and the AI's real
 * grade and defects come back with every option priced. Signing in (needed to count each person's
 * free inspections) happens when Grade is pressed; the photo and details are kept through it.
 */
export function HeroGrader() {
  const { session, ready, refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const [photo, setPhoto] = useState<string | null>(null) // data URL
  const [d, setD] = useState<Details>({ name: '', category: 'Footwear', price: '', platform: 'amazon' })
  const [err, setErr] = useState<{ text: string; buy?: boolean } | null>(null)
  const [needSignIn, setNeedSignIn] = useState(false)
  const [busy, setBusy] = useState<null | string>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const resumed = useRef(false)

  // Back from Google sign-in: restore the photo and details, then grade straight away.
  useEffect(() => {
    if (resumed.current || !ready || params.get('grade') !== '1') return
    resumed.current = true
    let saved: { photo: string; d: Details } | null = null
    try {
      saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null')
      sessionStorage.removeItem(PENDING_KEY)
    } catch {
      saved = null
    }
    params.delete('grade')
    setParams(params, { replace: true })
    if (!saved) return
    setPhoto(saved.photo)
    setD(saved.d)
    if (session) void grade(saved.photo, saved.d)
  }, [ready, session]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (fileInput.current) fileInput.current.value = ''
    if (cameraInput.current) cameraInput.current.value = ''
    if (!file) return
    const v = validateImageFile(file)
    if (v) return setErr({ text: v })
    setErr(null)
    setResult(null)
    setPhoto(await imageToDataUrl(file, 1280, 0.85))
  }

  const check = () => {
    if (!photo) return 'Add a photo of the returned product.'
    const p = Number(d.price)
    if (!d.price || !Number.isFinite(p) || p <= 0) return 'Enter what the customer paid.'
    return null
  }

  const onGrade = async () => {
    const problem = check()
    if (problem) return setErr({ text: problem })
    setErr(null)
    if (!accountsEnabled) return
    if (!session) return setNeedSignIn(true)
    await grade(photo!, d)
  }

  const signInWithGoogle = async () => {
    if (!supabase) return
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ photo, d }))
    } catch {
      // Storage full or blocked: they'll just need to add the photo again after signing in.
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/?grade=1` } })
    if (error) setErr({ text: error.message })
  }

  async function grade(photoUrl: string, det: Details) {
    setNeedSignIn(false)
    setResult(null)
    setErr(null)
    try {
      const blob = await dataUrlToBlob(photoUrl)
      setBusy('Saving your photo…')
      const ref = await supabaseRepo.uploadPhoto(blob)
      const item = await supabaseRepo.create({
        ...emptyReturnInput(),
        name: det.name.trim() || `${det.category} return`,
        category: det.category,
        original_price: Math.round(Number(det.price) * 100) / 100,
        photos: [ref],
        sale_setup: { platform: det.platform },
      })
      setBusy('AI is inspecting the photo… (10–30 seconds)')
      const { inspection } = await api.inspect({
        mode: 'account',
        images: [await imageForInspection(blob)],
        context: { name: item.name, category: item.category, return_reason: item.return_reason, condition_notes: '', original_price: item.original_price },
      })
      const patch = inspectionPatch(item, inspection, DEFAULT_RATES)
      const saved = await supabaseRepo.update(item.id, patch)
      const graded = { ...item, ...patch, ...saved } as ReturnItem
      setResult({ id: item.id, ai: inspection, calc: inspection.out_of_scope || graded.grade === 'MANUAL_REVIEW' || !graded.grade ? null : calculateRecovery(graded) })
      refresh()
    } catch (e) {
      const code = e instanceof ApiError ? e.code : ''
      setErr({ text: (e as Error).message, buy: ['NEED_PACK', 'PACK_LIMIT', 'PLAN_LIMIT'].includes(code) })
    } finally {
      setBusy(null)
    }
  }

  const best = result?.calc?.routes.find((r) => r.route === result.calc?.recommended)
  const grade_ = result?.ai.out_of_scope ? null : result?.ai.proposed_grade ?? null
  const o = offer()
  const reset = () => {
    setResult(null)
    setPhoto(null)
    setErr(null)
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_30px_80px_-30px_rgb(11_61_47/0.35)]">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-brand-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-900"><ScanSearch className="size-4" /> Grade & value a return</p>
        <span className="text-[11px] text-brand-900/70">{o.open ? `Free · ${LAUNCH.freeInspections} AI inspections each` : `₹${PACK.price} for ${PACK.inspections}`}</span>
      </div>

      {!result ? (
        <div className="space-y-3 p-4">
          {/* Photo */}
          {photo ? (
            <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-2">
              <img src={photo} alt="Returned product" className="h-44 w-full object-contain" />
              {!busy && (
                <button type="button" onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 shadow-sm hover:text-red-700" aria-label="Remove photo">
                  <X className="size-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid h-32 grid-cols-2 overflow-hidden rounded-2xl border-2 border-dashed border-line text-sm">
              <button type="button" onClick={() => cameraInput.current?.click()} className="flex flex-col items-center justify-center gap-1 font-medium text-brand-800 hover:bg-brand-50">
                <Camera className="size-5" /> Take a photo
              </button>
              <button type="button" onClick={() => fileInput.current?.click()} className="flex flex-col items-center justify-center gap-1 border-l-2 border-dashed border-line text-ink-2 hover:bg-paper">
                <ImageUp className="size-5" /> Upload a photo
              </button>
            </div>
          )}
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload a photo of the return" onChange={(e) => pick(e.target.files)} />
          <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files)} />

          {/* Details */}
          <div className="grid grid-cols-2 gap-2.5">
            <label className="col-span-2 block text-xs font-medium text-ink-2">
              Product name <span className="font-normal text-muted">(optional)</span>
              <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. White canvas sneakers" className="mt-1" />
            </label>
            <label className="col-span-2 block text-xs font-medium text-ink-2">
              Product type
              <Select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as Category })} className="mt-1">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </label>
            <label className="block text-xs font-medium text-ink-2">
              Customer paid (₹)
              <Input type="number" inputMode="numeric" min={1} value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} placeholder="e.g. 1499" className="mt-1 tabular" />
            </label>
            <label className="block text-xs font-medium text-ink-2">
              Where it sells
              <Select value={d.platform} onChange={(e) => setD({ ...d, platform: e.target.value as PlatformKey })} className="mt-1">
                {PLATFORMS.map((x) => <option key={x} value={x}>{PLATFORM_LABEL[x]}</option>)}
              </Select>
            </label>
          </div>

          {needSignIn && !session ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3">
              <p className="text-sm font-medium">Sign in to grade it — {o.open ? 'free' : `₹${PACK.price} for ${PACK.inspections}`}</p>
              <Button className="mt-2 w-full" onClick={signInWithGoogle}>Continue with Google</Button>
              <Link to="/signup?next=/app/returns/new" className="mt-2 block text-center text-xs text-muted underline">Use email instead</Link>
            </div>
          ) : busy ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-paper py-3 text-sm text-ink-2" aria-live="polite">
              <Loader2 className="size-4 animate-spin text-brand-700" /> {busy}
            </div>
          ) : (
            <Button size="lg" className="w-full" icon={<ScanSearch className="size-4" />} onClick={accountsEnabled ? onGrade : undefined}>
              {accountsEnabled ? 'Grade & value it' : 'Sign-in is not available here'}
            </Button>
          )}
          {err && (
            <p className="text-xs font-medium text-red-700" role="alert">
              {err.text} {err.buy && <Link to="/pricing" className="underline">See plans</Link>}
            </p>
          )}
          <p className="text-center text-[11px] text-muted">The AI finds visible defects and proposes a grade; fixed rules check it. Prices come from each platform’s published fees.</p>
        </div>
      ) : (
        <div className="space-y-3 p-4" aria-live="polite">
          <div className="flex gap-3">
            {photo && <img src={photo} alt="" className="size-20 shrink-0 rounded-xl border border-line object-cover" />}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {grade_ ? <GradeBadge grade={grade_} /> : <Badge tone="red">Not graded</Badge>}
                {!result.ai.out_of_scope && <Badge>{result.ai.confidence} confidence</Badge>}
              </div>
              <p className="mt-1 text-sm font-medium">{grade_ ? GRADE_GUIDE[grade_].short : 'Not something ReturnRescue grades'}</p>
              <p className="text-xs text-ink-2">{result.ai.summary}</p>
            </div>
          </div>

          {result.ai.defects.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-line p-2.5 text-[13px]">
              {result.ai.defects.map((x) => (
                <li key={x.type} className="flex justify-between gap-2"><span>{x.description}{x.location ? ` · ${x.location}` : ''}</span><Badge>{x.severity}</Badge></li>
              ))}
            </ul>
          )}
          {result.ai.recommended_physical_checks[0] && !result.ai.out_of_scope && (
            <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">Check by hand: {result.ai.recommended_physical_checks[0]}</p>
          )}

          {result.calc && best ? (
            <>
              <div className="rounded-2xl bg-brand-800 px-4 py-3 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200">Best option</p>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{best.label}</p>
                  <p className="font-display text-3xl tabular">{inr(best.net)}</p>
                </div>
                <p className="text-xs text-brand-100/85">{pct(best.recoveryRate)} of the price reaches you, after fees, GST, repairs and delivery</p>
              </div>
              <div className="space-y-1">
                {result.calc.routes.map((r) => {
                  const isOpen = open === r.route
                  return (
                    <div key={r.route} className={clsx('rounded-xl border', result.calc!.recommended === r.route ? 'border-brand-600 bg-brand-50/50' : 'border-line', !r.eligible && 'opacity-55')}>
                      <button type="button" onClick={() => setOpen(isOpen ? null : r.route)} aria-expanded={isOpen} className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
                        <span className="min-w-0 flex-1 text-[13px]">
                          <span className="flex items-center gap-1.5 font-medium">{r.label}{result.calc!.recommended === r.route && <Trophy className="size-3.5 text-brand-700" aria-label="best" />}</span>
                          {!r.eligible && <span className="block text-[11px] text-muted">{r.ineligibleReason}</span>}
                        </span>
                        <span className={clsx('font-display text-lg tabular', r.net < 0 && 'text-red-700')}>{inr(r.net)}</span>
                        <ChevronDown className={clsx('size-3.5 shrink-0 text-muted transition', isOpen && 'rotate-180')} />
                      </button>
                      {isOpen && (
                        <dl className="space-y-0.5 border-t border-line/70 px-3 py-1.5 text-[12px]">
                          {r.lines.map((l) => (
                            <div key={l.label} className="flex justify-between gap-3"><dt className="text-ink-2">{l.label}</dt><dd className={clsx('tabular', l.amount < 0 && 'text-red-700')}>{inr(l.amount)}</dd></div>
                          ))}
                        </dl>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-paper p-3 text-sm text-ink-2">
              {result.ai.out_of_scope ? 'No grade or value was given. If that’s the wrong photo, try another.' : 'A person needs to check this one before it gets a grade and a value.'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link to={`/app/returns/${result.id}`} className={buttonClass('secondary', 'md')}>Open in my workspace</Link>
            <Button variant="ghost" onClick={reset}>Grade another</Button>
          </div>
          <p className="text-center text-[11px] text-muted">Saved to your workspace with next steps and partners who can help.</p>
        </div>
      )}
    </div>
  )
}
