import clsx from 'clsx'
import { Loader2, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { GRADE_GUIDE, GRADE_LABEL, STATUS_LABEL, type Grade, type ReturnStatus } from '../lib/types'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_1px_2px_rgb(11_61_47/0.3)]',
  dark: 'bg-ink text-white hover:bg-ink-2',
  secondary: 'bg-white text-ink border border-line hover:border-ink/25 hover:bg-paper',
  ghost: 'text-ink-2 hover:bg-ink/5',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return clsx(
    'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none',
    variants[variant],
    sizes[size],
    extra,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

export function LinkButton({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}

export function Card({ className, children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' }) {
  return <As className={clsx('rounded-2xl border border-line bg-white', className)}>{children}</As>
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={clsx('inline-flex items-center gap-2 text-sm text-muted', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'amber' | 'red' | 'blue' | 'dark'
  className?: string
}) {
  const tones = {
    neutral: 'bg-paper-2 text-ink-2 ring-line',
    brand: 'bg-brand-50 text-brand-800 ring-brand-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-sky-50 text-sky-800 ring-sky-200',
    dark: 'bg-ink text-white ring-ink',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function GradeBadge({ grade, className }: { grade: Grade | null; className?: string }) {
  if (!grade) return <Badge className={className}>Ungraded</Badge>
  const tone = grade === 'A' ? 'brand' : grade === 'B' ? 'blue' : grade === 'C' ? 'amber' : 'red'
  return (
    <span title={`${GRADE_LABEL[grade]}: ${GRADE_GUIDE[grade].short}. ${GRADE_GUIDE[grade].allows}`}>
      <Badge tone={tone} className={className}>
        {GRADE_LABEL[grade]}
      </Badge>
    </span>
  )
}

export function StatusBadge({ status }: { status: ReturnStatus }) {
  const tone = status === 'awaiting_inspection' ? 'amber' : status === 'inspected' ? 'blue' : status === 'decided' ? 'brand' : 'dark'
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>
}

export function SampleBadge() {
  return <Badge tone="neutral">Sample</Badge>
}

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string
  children: (id: string, describedBy?: string) => ReactNode
  className?: string
  required?: boolean
}

export function Field({ label, hint, error, children, className, required }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-2">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children(id, [hintId, errId].filter(Boolean).join(' ') || undefined)}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border bg-white px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:bg-paper'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(inputBase, 'h-10', invalid ? 'border-red-400' : 'border-line', className)}
        {...rest}
      />
    )
  },
)

export function MoneyInput({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">₹</span>
      <Input type="number" inputMode="decimal" min={0} step="1" className={clsx('pl-7 tabular', className)} invalid={invalid} {...rest} />
    </div>
  )
}

export function Select({ className, invalid, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={clsx(inputBase, 'h-10 pr-8', invalid ? 'border-red-400' : 'border-line', className)}
      {...rest}
    />
  )
}

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={clsx(inputBase, 'min-h-24 py-2.5', invalid ? 'border-red-400' : 'border-line', className)}
      {...rest}
    />
  )
}

export function Alert({
  tone = 'neutral',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'neutral' | 'error' | 'warning' | 'success' | 'info'
  title?: ReactNode
  children?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  const tones = {
    neutral: 'bg-paper border-line text-ink-2',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-brand-50 border-brand-200 text-brand-900',
    info: 'bg-sky-50 border-sky-200 text-sky-900',
  }
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={clsx('flex gap-3 rounded-xl border px-4 py-3 text-sm', tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-white shadow-2xl animate-rise sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-paper" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? '#fff' : '#0b5d45'} />
        <path d="M20 38a14 14 0 1 0 4-17" fill="none" stroke={light ? '#0b5d45' : '#fff'} strokeWidth="5" strokeLinecap="round" />
        <path d="M17 15v10h10" fill="none" stroke={light ? '#0b5d45' : '#fff'} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34" cy="32" r="4.5" fill="#6ee7b7" />
      </svg>
      <span className={clsx('text-[17px] font-semibold tracking-tight', light ? 'text-white' : 'text-ink')}>
        Return<span className={light ? 'text-brand-200' : 'text-brand-700'}>Rescue</span>
      </span>
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[34px] leading-none tracking-tight sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Expandable explanation of all grades, highlighting the current one. */
export function GradeGuide({ current }: { current?: Grade | null }) {
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer list-none font-medium text-brand-700 hover:underline [&::-webkit-details-marker]:hidden">
        What do the grades mean?
      </summary>
      <dl className="mt-3 space-y-2.5">
        {(['A', 'B', 'C', 'MANUAL_REVIEW'] as Grade[]).map((g) => (
          <div key={g} className={g === current ? 'rounded-lg bg-paper p-2.5 ring-1 ring-line' : 'px-2.5'}>
            <dt className="font-medium">
              {GRADE_LABEL[g]} · {GRADE_GUIDE[g].short}
            </dt>
            <dd className="text-muted">
              {GRADE_GUIDE[g].meaning} {GRADE_GUIDE[g].allows}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
