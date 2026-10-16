import { Download, ImageOff, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  GradeBadge,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  SampleBadge,
  Select,
  Spinner,
  StatusBadge,
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { usePhotoUrls, useWorkspace } from '../context/WorkspaceContext'
import { api } from '../lib/api'
import { downloadBlob, returnsToCsv } from '../lib/csv'
import { inr } from '../lib/format'
import { calculateRecovery } from '../lib/recovery'
import {
  CATEGORIES,
  GRADE_LABEL,
  GRADES,
  ROUTE_LABEL,
  ROUTES,
  STATUS_LABEL,
  type ReturnItem,
  type ReturnStatus,
} from '../lib/types'

type SortKey = 'newest' | 'oldest' | 'value' | 'name'

export default function InventoryPage() {
  const { items, loading, error, base, mode, remove } = useWorkspace()
  const { hasAccess } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [grade, setGrade] = useState('')
  const [category, setCategory] = useState('')
  const [route, setRoute] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [toDelete, setToDelete] = useState<ReturnItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [upsell, setUpsell] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const activeFilterCount = [status, grade, category, route].filter(Boolean).length

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = items
      .map((item) => ({ item, calc: calculateRecovery(item) }))
      .filter(({ item, calc }) => {
        if (needle && !`${item.name} ${item.sku} ${item.condition_notes} ${item.return_reason}`.toLowerCase().includes(needle)) return false
        if (status && item.status !== status) return false
        if (grade && (item.grade ?? 'none') !== grade) return false
        if (category && item.category !== category) return false
        if (route && (item.decision_route ?? calc.recommended) !== route) return false
        return true
      })
    const val = (r: (typeof out)[number]) => r.item.decision_net ?? r.calc.recommendedNet ?? -Infinity
    out.sort((a, b) =>
      sort === 'newest'
        ? b.item.created_at.localeCompare(a.item.created_at)
        : sort === 'oldest'
          ? a.item.created_at.localeCompare(b.item.created_at)
          : sort === 'value'
            ? val(b) - val(a)
            : a.item.name.localeCompare(b.item.name),
    )
    return out
  }, [items, q, status, grade, category, route, sort])

  const filtersActive = q || status || grade || category || route
  const clearFilters = () => {
    setQ('')
    setStatus('')
    setGrade('')
    setCategory('')
    setRoute('')
  }

  const exportCsv = async () => {
    setNotice(null)
    const stamp = new Date().toISOString().slice(0, 10)
    if (mode === 'demo') {
      downloadBlob(new Blob([returnsToCsv(rows.map((r) => r.item))], { type: 'text/csv;charset=utf-8' }), `returnrescue-demo-${stamp}.csv`)
      return
    }
    if (!hasAccess) {
      setUpsell(true)
      return
    }
    setExporting(true)
    try {
      downloadBlob(await api.exportCsv(), `returnrescue-inventory-${stamp}.csv`)
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message })
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return <Alert tone="error" title="Couldn’t load your returns">{error}</Alert>

  return (
    <>
      <PageHeader
        title="Inventory"
        
        actions={
          <>
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv} loading={exporting} disabled={!items.length}>
              Export CSV
            </Button>
            <LinkButton to={`${base}/returns/new`} icon={<Plus className="size-4" />}>
              Add return
            </LinkButton>
          </>
        }
      />

      {notice && (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      )}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Plus className="size-6" />}
            title="Your inventory is empty"
            body="Add returned products to grade them and choose a recovery route."
            action={<LinkButton to={`${base}/returns/new`}>Add your first return</LinkButton>}
          />
        </Card>
      ) : (
        <Card>
          <div className="flex gap-2 border-b border-line p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" className="pl-9" aria-label="Search inventory" />
            </div>
            <Button variant="secondary" icon={<SlidersHorizontal className="size-4" />} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
          </div>
          {showFilters && (
            <div className="grid gap-2 border-b border-line bg-paper/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Filter by grade">
                <option value="">All grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{GRADE_LABEL[g]}</option>
                ))}
                <option value="none">Ungraded</option>
              </Select>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Select value={route} onChange={(e) => setRoute(e.target.value)} aria-label="Filter by route">
                <option value="">All routes</option>
                {ROUTES.map((r) => (
                  <option key={r} value={r}>{ROUTE_LABEL[r]}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2 text-sm">
            <span className="text-muted">
              Showing {rows.length} of {items.length}
              {filtersActive && (
                <button onClick={clearFilters} className="ml-2 inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                  <X className="size-3.5" /> Clear filters
                </button>
              )}
            </span>
            <label className="flex items-center gap-2 text-muted">
              Sort
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-8 w-auto py-0 text-xs">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="value">Highest est. recovery</option>
                <option value="name">Name A–Z</option>
              </Select>
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">No returns match these filters.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr className="border-b border-line">
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 font-medium">Grade</th>
                      <th className="px-3 py-2.5 font-medium">Route</th>
                      <th className="px-3 py-2.5 text-right font-medium">Est. net recovery</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map(({ item, calc }) => (
                      <tr key={item.id} className="cursor-pointer transition-colors hover:bg-paper" onClick={() => navigate(`${base}/returns/${item.id}`)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Thumb refs={item.photos} />
                            <div className="min-w-0">
                              <Link to={`${base}/returns/${item.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-64 truncate font-medium hover:underline">
                                {item.name}
                              </Link>
                              <p className="flex items-center gap-1.5 font-mono text-xs text-muted">
                                {item.sku} {item.is_sample && <SampleBadge />}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <GradeBadge grade={item.grade} />
                        </td>
                        <td className="px-3 py-3">
                          {item.decision_route ? (
                            <span className="font-medium">{ROUTE_LABEL[item.decision_route]}</span>
                          ) : calc.recommended ? (
                            <span className="text-ink-2">{ROUTE_LABEL[calc.recommended]} <span className="text-xs text-muted">(suggested)</span></span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular font-medium">{inr(item.decision_net ?? calc.recommendedNet)}</td>
                        <td className="px-3 py-3"><StatusBadge status={item.status as ReturnStatus} /></td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Link to={`${base}/returns/${item.id}/edit`} className="rounded-lg p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${item.name}`}>
                              <Pencil className="size-4" />
                            </Link>
                            <button onClick={() => setToDelete(item)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${item.name}`}>
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <ul className="divide-y divide-line md:hidden">
                {rows.map(({ item, calc }) => (
                  <li key={item.id} className="flex gap-3 px-4 py-3">
                    <Link to={`${base}/returns/${item.id}`} className="flex min-w-0 flex-1 gap-3">
                      <Thumb refs={item.photos} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="font-mono text-xs text-muted">{item.sku}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <GradeBadge grade={item.grade} />
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-xs text-ink-2">
                          {item.decision_route ? ROUTE_LABEL[item.decision_route] : calc.recommended ? `${ROUTE_LABEL[calc.recommended]} (suggested)` : 'No route yet'} ·{' '}
                          <span className="font-medium tabular">{inr(item.decision_net ?? calc.recommendedNet)}</span>
                        </p>
                      </div>
                    </Link>
                    <div className="flex flex-col gap-1">
                      <Link to={`${base}/returns/${item.id}/edit`} className="rounded-lg p-1.5 text-muted" aria-label={`Edit ${item.name}`}>
                        <Pencil className="size-4" />
                      </Link>
                      <button onClick={() => setToDelete(item)} className="rounded-lg p-1.5 text-muted" aria-label={`Delete ${item.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this return?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                if (!toDelete) return
                setDeleting(true)
                try {
                  await remove(toDelete.id)
                  setNotice({ tone: 'success', text: `Deleted ${toDelete.name}.` })
                  setToDelete(null)
                } catch (e) {
                  setNotice({ tone: 'error', text: (e as Error).message })
                  setToDelete(null)
                } finally {
                  setDeleting(false)
                }
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          <strong>{toDelete?.name}</strong> ({toDelete?.sku}) and its photos, inspection and decision will be removed. This can’t be undone.
        </p>
      </Modal>

      <Modal
        open={upsell}
        onClose={() => setUpsell(false)}
        title="CSV export is a Pro feature"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUpsell(false)}>Not now</Button>
            <LinkButton to={`${base}/billing`}>See Pro</LinkButton>
          </>
        }
      >
        <p className="text-sm text-ink-2">Your free trial has ended. Upgrade to export your full inventory, decisions and realized values as a spreadsheet.</p>
      </Modal>
    </>
  )
}

export function Thumb({ refs, size = 'size-11' }: { refs: string[]; size?: string }) {
  const urls = usePhotoUrls(refs.slice(0, 1))
  const src = refs[0] ? urls[refs[0]] : undefined
  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-xl border border-line bg-paper-2`}>
      {src ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="grid size-full place-items-center text-muted">
          <ImageOff className="size-4" aria-hidden />
        </div>
      )}
    </div>
  )
}
