const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inrFmt2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

export const inr = (n: number | null | undefined, precise = false) =>
  n == null || !Number.isFinite(n) ? '—' : (precise ? inrFmt2 : inrFmt).format(n)

export const pct = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : `${Math.round(n * 100)}%`

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const relativeDays = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}
