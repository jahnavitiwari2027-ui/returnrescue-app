// Aggregations over stored return records. Pure functions, shared by the
// dashboard, the insights page and the server-side AI summary function.

import { calculateRecovery } from './recovery'
import {
  DEFECT_LABEL,
  ROUTES,
  ROUTE_LABEL,
  type DefectType,
  type Grade,
  type ReturnItem,
  type RouteKey,
} from './types'

export interface WorkspaceStats {
  total: number
  awaitingInspection: number
  inspected: number
  awaitingDecision: number
  decided: number
  completed: number
  originalValue: number
  estimatedRecoverable: number // decided: decision net; undecided: recommended net (if any)
  decidedEstimatedNet: number
  realizedTotal: number
  realizedCount: number
  byCategory: { key: string; count: number; originalValue: number }[]
  byReason: { key: string; count: number }[]
  byGrade: { key: Grade | 'Ungraded'; count: number }[]
  byStatus: { key: string; count: number }[]
  routesChosen: { route: RouteKey; count: number; estimatedNet: number }[]
  routeOpportunity: { route: RouteKey; eligibleItems: number; avgNet: number; bestForItems: number }[]
  defects: { type: DefectType; label: string; count: number }[]
  overrides: number
  unprocessed: { id: string; name: string; sku: string; status: string; ageDays: number }[]
  weekly: { week: string; count: number }[]
}

const countBy = <T,>(items: T[], key: (t: T) => string) => {
  const m = new Map<string, number>()
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1)
  return [...m.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count)
}

export function computeStats(items: ReturnItem[], now = new Date()): WorkspaceStats {
  const awaitingInspection = items.filter((i) => i.status === 'awaiting_inspection').length
  const awaitingDecision = items.filter((i) => i.status === 'inspected').length
  const decided = items.filter((i) => i.status === 'decided').length
  const completed = items.filter((i) => i.status === 'completed').length

  let estimatedRecoverable = 0
  let decidedEstimatedNet = 0
  let overrides = 0
  const routeAgg = new Map<RouteKey, { count: number; net: number }>()
  const opp = new Map<RouteKey, { n: number; sum: number; best: number }>()

  for (const item of items) {
    const calc = calculateRecovery(item)
    if (item.decision_route && item.decision_net != null) {
      estimatedRecoverable += item.decision_net
      decidedEstimatedNet += item.decision_net
      const r = routeAgg.get(item.decision_route) ?? { count: 0, net: 0 }
      r.count++
      r.net += item.decision_net
      routeAgg.set(item.decision_route, r)
      if (item.recommended_route && item.recommended_route !== item.decision_route) overrides++
    } else if (calc.recommendedNet != null && item.grade && item.grade !== 'MANUAL_REVIEW') {
      estimatedRecoverable += calc.recommendedNet
    }
    if (item.grade && item.grade !== 'MANUAL_REVIEW') {
      for (const r of calc.routes) {
        if (!r.eligible || !r.configured) continue
        const o = opp.get(r.route) ?? { n: 0, sum: 0, best: 0 }
        o.n++
        o.sum += r.net
        if (calc.recommended === r.route) o.best++
        opp.set(r.route, o)
      }
    }
  }

  const catMap = new Map<string, { count: number; originalValue: number }>()
  for (const i of items) {
    const c = catMap.get(i.category) ?? { count: 0, originalValue: 0 }
    c.count++
    c.originalValue += i.original_price || 0
    catMap.set(i.category, c)
  }

  const defectMap = new Map<DefectType, number>()
  for (const i of items) {
    // Count each defect type once per item so one item with three stains doesn't dominate.
    const types = new Set((i.defects ?? []).map((d) => d.type))
    for (const t of types) defectMap.set(t, (defectMap.get(t) ?? 0) + 1)
  }

  const realized = items.filter((i) => i.realized_amount != null)

  // Weekly intake for the last 8 weeks (weeks start Monday).
  const weekly: { week: string; count: number }[] = []
  const startOfWeek = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
    return x
  }
  const thisWeek = startOfWeek(now)
  for (let w = 7; w >= 0; w--) {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - w * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const count = items.filter((i) => {
      const t = new Date(i.created_at)
      return t >= start && t < end
    }).length
    weekly.push({ week: start.toISOString().slice(0, 10), count })
  }

  const statusOrder = ['awaiting_inspection', 'inspected', 'decided', 'completed']

  return {
    total: items.length,
    awaitingInspection,
    inspected: items.length - awaitingInspection,
    awaitingDecision,
    decided,
    completed,
    originalValue: round(items.reduce((s, i) => s + (i.original_price || 0), 0)),
    estimatedRecoverable: round(estimatedRecoverable),
    decidedEstimatedNet: round(decidedEstimatedNet),
    realizedTotal: round(realized.reduce((s, i) => s + (i.realized_amount ?? 0), 0)),
    realizedCount: realized.length,
    byCategory: [...catMap.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count),
    byReason: countBy(items, (i) => i.return_reason || 'Not recorded'),
    byGrade: (['A', 'B', 'C', 'MANUAL_REVIEW', 'Ungraded'] as const).map((g) => ({
      key: g,
      count: items.filter((i) => (i.grade ?? 'Ungraded') === g).length,
    })),
    byStatus: statusOrder.map((s) => ({ key: s, count: items.filter((i) => i.status === s).length })),
    routesChosen: ROUTES.map((route) => ({
      route,
      count: routeAgg.get(route)?.count ?? 0,
      estimatedNet: round(routeAgg.get(route)?.net ?? 0),
    })),
    routeOpportunity: ROUTES.map((route) => {
      const o = opp.get(route)
      return { route, eligibleItems: o?.n ?? 0, avgNet: o && o.n ? round(o.sum / o.n) : 0, bestForItems: o?.best ?? 0 }
    }),
    defects: [...defectMap.entries()]
      .map(([type, count]) => ({ type, label: DEFECT_LABEL[type] ?? type, count }))
      .sort((a, b) => b.count - a.count),
    overrides,
    unprocessed: items
      .filter((i) => i.status === 'awaiting_inspection' || i.status === 'inspected')
      .map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        status: i.status,
        ageDays: Math.max(0, Math.floor((now.getTime() - new Date(i.created_at).getTime()) / 86_400_000)),
      }))
      .sort((a, b) => b.ageDays - a.ageDays),
    weekly,
  }
}

export interface InsightStatement {
  id: string
  tone: 'neutral' | 'attention' | 'positive'
  title: string
  detail: string
}

/** Plain-language findings derived only from the stats. Nothing is inferred beyond the numbers. */
export function deriveInsights(s: WorkspaceStats): InsightStatement[] {
  const out: InsightStatement[] = []
  if (s.total === 0) return out
  const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`
  const inr = (n: number) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

  const topCat = s.byCategory[0]
  if (topCat) {
    out.push({
      id: 'top-category',
      tone: 'neutral',
      title: `${topCat.key} has the most returns`,
      detail: `${topCat.count} of ${s.total} returns (${pct(topCat.count, s.total)}), ${inr(topCat.originalValue)} in original selling value.`,
    })
  }
  const topReason = s.byReason[0]
  if (topReason && topReason.count > 1) {
    out.push({
      id: 'top-reason',
      tone: 'neutral',
      title: `Most common return reason: ${topReason.key}`,
      detail: `${topReason.count} returns (${pct(topReason.count, s.total)}).`,
    })
  }
  const topDefect = s.defects[0]
  if (topDefect) {
    const recorded = s.total - (s.byGrade.find((g) => g.key === 'Ungraded')?.count ?? 0)
    out.push({
      id: 'top-defect',
      tone: 'neutral',
      title: `${topDefect.label} is the most frequent recorded issue`,
      detail: `Found on ${topDefect.count} item${topDefect.count > 1 ? 's' : ''}${recorded ? ` out of ${recorded} graded` : ''}.`,
    })
  }
  const bestRoute = [...s.routeOpportunity].filter((r) => r.eligibleItems > 0).sort((a, b) => b.avgNet - a.avgNet)[0]
  if (bestRoute) {
    out.push({
      id: 'best-route',
      tone: 'positive',
      title: `${ROUTE_LABEL[bestRoute.route]} offers the highest average estimated net`,
      detail: `${inr(bestRoute.avgNet)} per item across ${bestRoute.eligibleItems} eligible graded item${bestRoute.eligibleItems > 1 ? 's' : ''}; it is the top option for ${bestRoute.bestForItems}.`,
    })
  }
  const pending = s.awaitingInspection + s.awaitingDecision
  if (pending > 0) {
    const oldest = s.unprocessed[0]
    out.push({
      id: 'unprocessed',
      tone: 'attention',
      title: `${pending} item${pending > 1 ? 's' : ''} still unprocessed`,
      detail: `${s.awaitingInspection} awaiting inspection, ${s.awaitingDecision} awaiting a recovery decision.${oldest ? ` Oldest: ${oldest.name} (${oldest.ageDays} day${oldest.ageDays === 1 ? '' : 's'}).` : ''}`,
    })
  }
  const review = s.byGrade.find((g) => g.key === 'MANUAL_REVIEW')?.count ?? 0
  if (review) {
    out.push({
      id: 'manual-review',
      tone: 'attention',
      title: `${review} item${review > 1 ? 's' : ''} flagged for manual review`,
      detail: 'These have no recommended route until a person sets a grade.',
    })
  }
  if (s.overrides) {
    out.push({
      id: 'overrides',
      tone: 'neutral',
      title: `${s.overrides} decision${s.overrides > 1 ? 's' : ''} overrode the recommendation`,
      detail: 'Review the recorded reasons to see whether your cost estimates need updating.',
    })
  }
  if (s.realizedCount) {
    out.push({
      id: 'realized',
      tone: 'positive',
      title: `${inr(s.realizedTotal)} realized from ${s.realizedCount} completed item${s.realizedCount > 1 ? 's' : ''}`,
      detail: 'Realized proceeds are amounts you recorded after the sale or disposal actually happened.',
    })
  }
  return out
}

const round = (n: number) => Math.round(n * 100) / 100
