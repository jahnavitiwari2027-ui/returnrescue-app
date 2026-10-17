// Deterministic checks on an AI-proposed grade. The model's grade is kept only
// when it agrees with the defects it reported; rules can make a grade stricter,
// never more lenient. Every adjustment is recorded so a person can see why.
//
// Shared by the browser app and Netlify Functions.

import { groupOf, isUnfixable } from './rates'
import { DEFECT_LABEL, GRADE_LABEL, type AIInspection, type Category, type Defect, type Grade, type ItemKind } from './types'

const RANK: Record<Exclude<Grade, 'MANUAL_REVIEW'>, number> = { A: 0, B: 1, C: 2 }

export interface GuardrailInput {
  proposed: Grade
  category: Category
  defects: Pick<Defect, 'type' | 'severity'>[]
  image_quality: AIInspection['image_quality']
  product_match: AIInspection['product_match']
  confidence: AIInspection['confidence']
}

export interface GuardrailResult {
  grade: Grade
  /** Plain-language reasons for any change, plus cautions. Empty when the AI grade stands as-is. */
  notes: string[]
  changed: boolean
}

/** The least severe grade the listed defects allow. */
export function minimumGrade(category: Category, defects: GuardrailInput['defects']): { grade: Exclude<Grade, 'MANUAL_REVIEW'>; why: string } {
  const major = defects.find((d) => d.severity === 'major')
  if (major) return { grade: 'C', why: `${DEFECT_LABEL[major.type].toLowerCase()} is major` }
  const unfix = defects.find((d) => isUnfixable(category, d))
  if (unfix) return { grade: 'C', why: `${DEFECT_LABEL[unfix.type].toLowerCase()} (${unfix.severity}) can’t be repaired for resale` }
  if (defects.length) return { grade: 'B', why: 'a visible issue was found, and Grade A means no visible damage' }
  return { grade: 'A', why: '' }
}

export function applyGuardrails(i: GuardrailInput): GuardrailResult {
  const notes: string[] = []
  const toManual = (why: string): GuardrailResult => ({
    grade: 'MANUAL_REVIEW',
    notes: [i.proposed === 'MANUAL_REVIEW' ? why : `Sent to manual review instead of ${GRADE_LABEL[i.proposed]}: ${why}.`],
    changed: i.proposed !== 'MANUAL_REVIEW',
  })

  if (i.image_quality === 'unusable') return toManual('the photos are too unclear to grade')
  if (i.product_match === 'mismatch') return toManual('the photos may not show the described product')
  if (i.product_match === 'unclear' && i.confidence === 'low') return toManual('the photos may not show the described product and confidence is low')
  if (i.defects.some((d) => d.type === 'odor_reported')) return toManual('odour can’t be judged from photos')
  if (i.proposed === 'MANUAL_REVIEW') return { grade: 'MANUAL_REVIEW', notes, changed: false }

  const floor = minimumGrade(i.category, i.defects)
  let grade: Grade = i.proposed
  if (RANK[floor.grade] > RANK[i.proposed]) {
    grade = floor.grade
    notes.push(`Changed from ${GRADE_LABEL[i.proposed]} to ${GRADE_LABEL[floor.grade]}: ${floor.why}.`)
  } else if (RANK[i.proposed] > RANK[floor.grade]) {
    notes.push(`The AI chose ${GRADE_LABEL[i.proposed]} though the listed issues would allow ${GRADE_LABEL[floor.grade]} — kept the stricter grade; check by hand.`)
  }
  if (i.confidence === 'low') notes.push('The AI’s confidence is low — check the item by hand before acting.')
  if (i.image_quality === 'limited') notes.push('Photo quality is limited, so smaller defects may have been missed.')
  return { grade, notes, changed: grade !== i.proposed }
}

const KIND_GROUP: Partial<Record<ItemKind, ReturnType<typeof groupOf>>> = { apparel: 'apparel', footwear: 'footwear', bag_or_accessory: 'bags' }
const KIND_LABEL: Record<ItemKind, string> = { apparel: 'clothing', footwear: 'footwear', bag_or_accessory: 'a bag or accessory', other: 'something else', unclear: 'unclear' }

export interface ScopeResult {
  /** The photos show something outside apparel, footwear and accessories. Refuse to grade or price it. */
  outOfScope: boolean
  /** The photos show an item we do inspect, but not the category the seller chose. */
  categoryMismatch: boolean
  note: string | null
}

/** Is the photographed item one ReturnRescue inspects, and does it match the category chosen? */
export function scopeCheck(category: Category, kind: ItemKind, seen: string): ScopeResult {
  const what = seen.trim() || 'something other than clothing, footwear or a bag'
  if (kind === 'other') {
    return { outOfScope: true, categoryMismatch: false, note: `These photos don’t look like clothing, footwear or a bag — they look like ${what}. ReturnRescue only inspects apparel, footwear and accessories, so this item wasn’t graded or priced.` }
  }
  const group = KIND_GROUP[kind]
  if (group && group !== groupOf(category)) {
    return { outOfScope: false, categoryMismatch: true, note: `The photos look like ${KIND_LABEL[kind]} (${what}), but the category is ${category}. If the category is wrong, edit the return and run the inspection again.` }
  }
  return { outOfScope: false, categoryMismatch: false, note: null }
}
