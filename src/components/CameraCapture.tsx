import { Camera, Check, ImageUp, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type CamState = 'starting' | 'live' | 'denied' | 'unavailable'

export function cameraSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

/**
 * Full-screen live camera. Each shutter press hands a JPEG File to onCapture;
 * the camera stays open so several angles can be shot in a row.
 */
export function CameraCapture({
  open,
  remaining,
  onCapture,
  onClose,
  onFallback,
}: {
  open: boolean
  /** How many more photos are allowed. */
  remaining: number
  onCapture: (file: File) => void
  onClose: () => void
  /** Open the device's own camera / file picker instead. */
  onFallback: (kind: 'camera' | 'upload') => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CamState>('starting')
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [canFlip, setCanFlip] = useState(false)
  const [shots, setShots] = useState<string[]>([])
  const [flash, setFlash] = useState(false)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setState('starting')
    stop()
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then(async (stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setState('live')
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        if (!cancelled) setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1)
      })
      .catch((err: DOMException) => {
        if (cancelled) return
        setState(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'unavailable')
      })
    return () => {
      cancelled = true
      stop()
    }
  }, [open, facing, stop])

  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Reset the session strip and lock page scroll while open.
  useEffect(() => {
    if (!open) return
    setShots([])
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      setShots((s) => {
        s.forEach((u) => URL.revokeObjectURL(u))
        return []
      })
    }
  }, [open])

  const shoot = () => {
    const v = videoRef.current
    if (!v || state !== 'live' || remaining <= 0 || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')!
    if (facing === 'user') {
      // Un-mirror the selfie preview so text on labels reads correctly.
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        setShots((s) => [...s, URL.createObjectURL(blob)])
        setFlash(true)
        setTimeout(() => setFlash(false), 150)
        navigator.vibrate?.(30)
      },
      'image/jpeg',
      0.9,
    )
  }

  if (!open) return null
  const full = remaining <= 0

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close camera">
          <X className="size-6" />
        </button>
        <p className="text-sm text-white/80">
          {full ? 'Photo limit reached' : shots.length ? `${shots.length} taken · ${remaining} more allowed` : 'Front, back, label and any damage'}
        </p>
        {canFlip && state === 'live' ? (
          <button type="button" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} className="rounded-full p-2 hover:bg-white/10" aria-label="Switch camera">
            <RefreshCw className="size-5" />
          </button>
        ) : (
          <span className="size-9" />
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 size-full object-contain ${facing === 'user' ? '-scale-x-100' : ''} ${state === 'live' ? '' : 'invisible'}`}
        />
        {flash && <div className="absolute inset-0 bg-white/70" />}
        {state === 'starting' && <p className="absolute inset-0 grid place-items-center text-sm text-white/70">Starting camera…</p>}
        {(state === 'denied' || state === 'unavailable') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Camera className="size-10 text-white/60" />
            <div>
              <p className="font-semibold">{state === 'denied' ? 'Camera access is blocked' : 'No camera found'}</p>
              <p className="mt-1 text-sm text-white/70">
                {state === 'denied'
                  ? 'Allow camera access for this site in your browser settings, then try again. Or use one of these:'
                  : 'This device or browser can’t open a camera here. Use one of these instead:'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => onFallback('camera')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-ink">
                <Camera className="size-4" /> Phone camera app
              </button>
              <button type="button" onClick={() => onFallback('upload')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-medium">
                <ImageUp className="size-4" /> Upload a photo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
        <div className="flex w-24 gap-1">
          {shots.slice(-3).map((u) => (
            <img key={u} src={u} alt="" className="size-10 rounded-lg border border-white/40 object-cover" />
          ))}
        </div>
        <button
          type="button"
          onClick={shoot}
          disabled={state !== 'live' || full}
          className="grid size-[72px] place-items-center rounded-full border-4 border-white transition active:scale-95 disabled:opacity-40"
          aria-label="Take photo"
        >
          <span className="size-14 rounded-full bg-white" />
        </button>
        <div className="flex w-24 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${shots.length ? 'bg-brand-600 text-white' : 'text-white/80'}`}
          >
            {shots.length ? <><Check className="size-4" /> Done</> : 'Cancel'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
