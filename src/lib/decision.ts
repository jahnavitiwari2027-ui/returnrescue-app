// Grading and the choice of route happen automatically. A person can still re-run
// the inspection, change the grade or pick another option; those are corrections,
// not a required confirmation step.

import { estimateFromRates, estimateInputFor, ratesPatch, type RateCard } from './rates'
import { calculateRecovery } from './recovery'
import type { AIInspection, ReturnInput, ReturnItem } from './types'

export const AUTO_REASON = 'Best option, chosen automatically.'

const NO_DECISION = { decision_route: null, decision_net: null, decided_at: null, recommended_route: null, decision_reason: '' } as const

/**
 * The decision fields for an item whose grade and values are final: the recommended
 * route, or no decision when there isn't one (manual review, or no values to compare).
 */
export function autoDecision(item: ReturnItem, now = new Date()): Partial<ReturnInput> {
  if (!item.grade || item.grade === 'MANUAL_REVIEW') return { ...NO_DECISION, status: 'inspected' }
  const calc = calculateRecovery(item)
  const best = calc.routes.find((r) => r.route === calc.recommended)
  if (!best) return { ...NO_DECISION, status: 'inspected' }
  return {
    decision_route: best.route,
    decision_net: best.net,
    recommended_route: best.route,
    decision_reason: AUTO_REASON,
    decided_at: now.toISOString(),
    status: 'decided',
  }
}

/** Grade fields from an AI result. A refused photo, or one the AI can't judge, gets no grade. */
export function aiGradePatch(ai: AIInspection): Partial<ReturnInput> {
  if (ai.out_of_scope || ai.proposed_grade === 'MANUAL_REVIEW')
    return { grade: null, grade_source: null, grade_note: '', defects: [] }
  return {
    grade: ai.proposed_grade,
    grade_source: 'ai_accepted',
    grade_note: '',
    defects: ai.defects.map((d) => ({ ...d, source: 'ai' as const })),
  }
}

/** True when the grade came from the AI (saved automatically, or still only a suggestion). */
export function gradedByAI(item: Pick<ReturnItem, 'grade' | 'grade_source' | 'ai_inspection'>) {
  return item.grade_source === 'ai_accepted' || (!item.grade && !!item.ai_inspection)
}

/**
 * Everything saved when an AI inspection comes back: the inspection, its grade, rate-card
 * prices for the defects found and the best option. A re-run replaces the earlier grade and
 * decision. Items outside apparel, footwear and accessories get no grade, price or decision.
 */
export function inspectionPatch(item: ReturnItem, inspection: AIInspection, rates: RateCard, now = new Date()): Partial<ReturnInput> {
  const fresh: ReturnItem = { ...item, ai_inspection: inspection, ...aiGradePatch(inspection), decision_route: null, decision_net: null, decided_at: null }
  if (inspection.out_of_scope) return { ai_inspection: inspection, ...aiGradePatch(inspection), ...autoDecision(fresh, now), status: 'awaiting_inspection' }
  // Price the defects with the rate card. Values the user entered or quoted are left alone.
  const prices = ratesPatch(fresh, estimateFromRates(estimateInputFor(fresh), rates))
  return { ai_inspection: inspection, ...aiGradePatch(inspection), ...prices, ...autoDecision({ ...fresh, ...prices }, now) }
}
