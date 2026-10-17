// Rate card: turns a return's category, price, grade and the defects found into
// recovery estimates using published, editable rates. No AI is involved in any
// rupee figure — the AI only reports which defects it can see.
//
// Every default below is either taken from a cited public source (RATE_SOURCES)
// or marked as an assumption with the reasoning. A business can override any of
// them on the Rates page; overrides are stored per workspace.
//
// Shared by the browser app and Netlify Functions — keep it free of browser APIs.

import {
  CATEGORIES,
  DEFECT_LABEL,
  type Category,
  type Defect,
  type DefectType,
  type Grade,
  type ReturnInput,
  type ReturnItem,
  type RouteKey,
  type Severity,
} from './types'

// ─────────────────────────── Sources ───────────────────────────

export type SourceKey = 'amazon_fees' | 'closing_fees' | 'courier' | 'wage' | 'dryclean' | 'shoe' | 'tailor' | 'surplus' | 'scrap'

export const RATE_SOURCES: Record<SourceKey, { title: string; url: string; used_for: string }> = {
  amazon_fees: {
    title: 'Amazon.in — Pricing & seller fees',
    url: 'https://sell.amazon.in/fees-and-pricing',
    used_for: 'Referral fee by category (0% up to ₹1,000), weight-handling fee (₹51 first 500 g, ₹17 per extra 500 g), 18% GST on fees, closing-fee increase from 7 Sep 2026.',
  },
  closing_fees: {
    title: 'Shiprocket — Amazon commission rates in India',
    url: 'https://www.shiprocket.in/blog/amazon-commission-rates-in-india/',
    used_for: 'Easy Ship closing fee by price band (₹5 / ₹9 / ₹30 / ₹56).',
  },
  courier: {
    title: 'IndiaPost.org — Cheapest courier services for small businesses (2026)',
    url: 'https://indiapost.org/cheapest-courier-service',
    used_for: 'Own-website shipping: 500 g parcel via an aggregator ≈ ₹40–45 all-in.',
  },
  wage: {
    title: 'ClearTax — Minimum wages in Delhi (from 1 Apr 2026)',
    url: 'https://cleartax.in/s/minimum-wages-in-delhi',
    used_for: 'Labour: unskilled ₹710 per day ÷ 8 hours ≈ ₹89 per hour.',
  },
  dryclean: {
    title: 'Cloud Dhobi — Dry cleaning cost in Delhi (2026)',
    url: 'https://clouddhobi.com/dry-cleaning-cost-in-delhi/',
    used_for: 'Professional cleaning per garment: shirt ₹199, T-shirt ₹149, jeans ₹149, kurta ₹199.',
  },
  shoe: {
    title: 'My Shoe Clinic — Shoe repair & laundry prices',
    url: 'https://myshoeclinic.com/booking.php',
    used_for: 'Shoe cleaning ₹349, hard-stain removal ₹199, sole pasting ₹349, stitching ₹349, patch ₹299, sole replacement ₹999, heel ₹499, colour change ₹899, leather replacement ₹1,699.',
  },
  tailor: {
    title: 'AlterDry — Clothing alteration cost in India (2026)',
    url: 'https://alterdry.com/how-much-does-clothing-alteration-cost-in-india/',
    used_for: 'Zip replacement ₹300–700, seam work ₹400–1,000.',
  },
  surplus: {
    title: 'Apparel Resources — The surpassing surplus business',
    url: 'https://apparelresources.com/business-news/retail/surpassing-surplus-business/',
    used_for: 'Unsold branded stock loses 70–80% of its value at surplus buyers, i.e. sells for 20–30% of the original price.',
  },
  scrap: {
    title: 'KabadiDost — Scrap rates in India',
    url: 'https://kabadidost.in/scrap-rates',
    used_for: 'Old clothes / textile scrap ₹2–6 per kg.',
  },
}

/** Sources were checked on this date. */
export const RATES_CHECKED_ON = '17 Oct 2026'

// ─────────────────────────── Rate card ───────────────────────────

export type Channel = 'marketplace' | 'own_site'

export interface ServicePrices {
  /** Professional cleaning per garment, by apparel category. */
  dry_clean: Record<Category, number>
  shoe_clean: number
  shoe_hard_stain: number
  shoe_sole_paste: number
  shoe_sole_replace: number
  shoe_stitch: number
  shoe_patch: number
  shoe_heel: number
  shoe_colour: number
  shoe_leather_replace: number
  tailor_small_repair: number
  tailor_repair: number
  seam_repair: number
  zip_replace: number
  zip_replace_major: number
  shoe_box: number
}

export interface RateCard {
  channel: Channel
  /** Marketplace referral fee % by category, charged when the price is above fee_free_up_to. */
  referral_pct: Record<Category, number>
  fee_free_up_to: number
  payment_gateway_pct: number
  gst_on_fees_pct: number
  labour_per_hour: number
  packing_materials: number
  ship_first_500g: Record<Channel, number>
  ship_extra_500g: number
  weight_kg: Record<Category, number>
  refurb_resale_pct: number
  liquidation_pct: Record<Grade | 'ungraded', number>
  liquidation_commission_pct: number
  liquidation_freight: number
  scrap_per_kg: number
  recycle_transport: number
  services: ServicePrices
}

const byCat = (v: Record<Category, number>) => v

export const DEFAULT_RATES: RateCard = {
  channel: 'marketplace',
  // Amazon.in referral fees above ₹1,000 (most common sub-category per group).
  referral_pct: byCat({
    Topwear: 21, // Shirts 21% (Men's T-shirts 23%)
    Bottomwear: 19, // Pants, jeans, trackpants 19%
    'Ethnic wear': 16.5,
    Dresses: 19,
    Activewear: 19, // Apparel – other products
    'Innerwear & swimwear': 18, // Women's innerwear 18%, other innerwear 18.5%
    Footwear: 8, // Shoes 8% (Sports footwear 16%)
    'Bags & accessories': 12, // Handbags 12% (Backpacks 14.5%, Wallets 14%)
  }),
  fee_free_up_to: 1000,
  payment_gateway_pct: 2, // assumption: typical Indian payment gateway rate
  gst_on_fees_pct: 18,
  labour_per_hour: 89,
  packing_materials: 15, // assumption: polybag, label, tissue
  ship_first_500g: { marketplace: 51, own_site: 45 },
  ship_extra_500g: 17,
  // assumption: typical packed weight per unit
  weight_kg: byCat({
    Topwear: 0.3,
    Bottomwear: 0.5,
    'Ethnic wear': 0.5,
    Dresses: 0.4,
    Activewear: 0.3,
    'Innerwear & swimwear': 0.15,
    Footwear: 1,
    'Bags & accessories': 0.7,
  }),
  refurb_resale_pct: 70, // assumption: sold as "minor flaw" at 30% off
  liquidation_pct: { A: 30, B: 25, C: 10, MANUAL_REVIEW: 10, ungraded: 25 },
  liquidation_commission_pct: 0,
  liquidation_freight: 15, // assumption: share of a bulk courier / truck drop
  scrap_per_kg: 4,
  recycle_transport: 10, // assumption: share of a bulk drop to a recycler
  services: {
    dry_clean: byCat({
      Topwear: 199,
      Bottomwear: 149,
      'Ethnic wear': 199,
      Dresses: 199,
      Activewear: 149,
      'Innerwear & swimwear': 149,
      Footwear: 349,
      'Bags & accessories': 349,
    }),
    shoe_clean: 349,
    shoe_hard_stain: 199,
    shoe_sole_paste: 349,
    shoe_sole_replace: 999,
    shoe_stitch: 349,
    shoe_patch: 299,
    shoe_heel: 499,
    shoe_colour: 899,
    shoe_leather_replace: 1699,
    tailor_small_repair: 150, // assumption: local tailor, small darn or patch
    tailor_repair: 300, // assumption: larger darn or patch
    seam_repair: 400,
    zip_replace: 300,
    zip_replace_major: 500,
    shoe_box: 40, // assumption: replacement shoebox
  },
}

/** Which rate-card defaults are assumptions rather than sourced figures (shown on the Rates page). */
export const ASSUMPTIONS: string[] = [
  'Payment gateway 2% for your own website.',
  'Packing materials ₹15 per unit (polybag, label, tissue); replacement shoebox ₹40.',
  'Typical packed weight per item (0.15–1 kg by category).',
  'Repaired items resell at 70% of the original price (sold as “minor flaw”).',
  'Grade C items liquidate at 10% of the original price — damaged stock, below the 20–30% surplus buyers pay for unsold stock.',
  'Liquidation commission 0% — add your platform’s rate if it charges one. Bulk freight ₹15 per unit.',
  'Small clothing repairs at a local tailor ₹150, larger ₹300.',
  'Recycling transport ₹10 per unit (share of a bulk drop).',
  'In-house task times: steaming 5–10 min, spot clean 10 min, re-tag 3 min, repack 3 min.',
]

// ─────────────────────── Overrides (stored per workspace) ───────────────────────

export type RateOverrides = Partial<Omit<RateCard, 'services'>> & { services?: Partial<ServicePrices> }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const okNum = (v: unknown, max = 1_000_000) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max

/** Merge saved overrides onto the defaults, ignoring anything malformed. */
export function resolveRates(overrides: unknown): RateCard {
  const out: RateCard = JSON.parse(JSON.stringify(DEFAULT_RATES))
  if (!isObj(overrides)) return out
  const o = overrides as Record<string, unknown>
  if (o.channel === 'marketplace' || o.channel === 'own_site') out.channel = o.channel
  const pctKeys = ['payment_gateway_pct', 'gst_on_fees_pct', 'refurb_resale_pct', 'liquidation_commission_pct'] as const
  for (const k of pctKeys) if (okNum(o[k], 100)) out[k] = o[k] as number
  const numKeys = ['fee_free_up_to', 'labour_per_hour', 'packing_materials', 'ship_extra_500g', 'scrap_per_kg', 'recycle_transport', 'liquidation_freight'] as const
  for (const k of numKeys) if (okNum(o[k])) out[k] = o[k] as number
  const mergeMap = <K extends string>(target: Record<K, number>, src: unknown, max?: number) => {
    if (!isObj(src)) return
    for (const k of Object.keys(target) as K[]) if (okNum(src[k], max)) target[k] = src[k] as number
  }
  mergeMap(out.referral_pct, o.referral_pct, 100)
  mergeMap(out.weight_kg, o.weight_kg, 50)
  mergeMap(out.liquidation_pct, o.liquidation_pct, 100)
  mergeMap(out.ship_first_500g, o.ship_first_500g)
  if (isObj(o.services)) {
    const s = o.services
    for (const k of Object.keys(out.services) as (keyof ServicePrices)[]) {
      if (k === 'dry_clean') mergeMap(out.services.dry_clean, s.dry_clean)
      else if (okNum(s[k])) out.services[k] = s[k] as number
    }
  }
  return out
}

/** Only the values that differ from the defaults — what gets stored. */
export function diffRates(r: RateCard): RateOverrides {
  const d = DEFAULT_RATES
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(d) as (keyof RateCard)[]) {
    const a = d[k] as unknown
    const b = r[k] as unknown
    if (isObj(a) && isObj(b)) {
      const sub: Record<string, unknown> = {}
      for (const kk of Object.keys(a)) {
        const aa = a[kk]
        const bb = b[kk]
        if (isObj(aa) && isObj(bb)) {
          const sub2: Record<string, unknown> = {}
          for (const k3 of Object.keys(aa)) if (aa[k3] !== bb[k3]) sub2[k3] = bb[k3]
          if (Object.keys(sub2).length) sub[kk] = sub2
        } else if (aa !== bb) sub[kk] = bb
      }
      if (Object.keys(sub).length) out[k] = sub
    } else if (a !== b) out[k] = b
  }
  return out as RateOverrides
}

// ─────────────────────── Repairs: defect → action ───────────────────────

type Group = 'apparel' | 'footwear' | 'bags'

export function groupOf(category: Category): Group {
  if (category === 'Footwear') return 'footwear'
  if (category === 'Bags & accessories') return 'bags'
  return 'apparel'
}

/** One repair action. `min` = in-house minutes at the labour rate; `service` = outsourced price; `materials` = ₹. */
interface Action {
  label: string
  min?: number
  service?: (s: ServicePrices, c: Category) => number
  serviceSource?: SourceKey
  materials?: number
  materialsKey?: 'shoe_box'
}
type Plan = Action | 'unfixable'
type Matrix = Partial<Record<DefectType, Record<Severity, Plan>>>

const all = (p: Plan): Record<Severity, Plan> => ({ minor: p, moderate: p, major: p })
const dry: Action = { label: 'Professional cleaning', service: (s, c) => s.dry_clean[c], serviceSource: 'dryclean' }
const shoeClean: Action = { label: 'Professional shoe cleaning & polish', service: (s) => s.shoe_clean, serviceSource: 'shoe' }
const spot: Action = { label: 'Spot clean in-house', min: 10, materials: 10 }
const repack: Action = { label: 'Repackage', min: 3 }
const retag: Action = { label: 'Re-tag', min: 3, materials: 5 }

const APPAREL: Matrix = {
  packaging_damage: all(repack),
  missing_tags: all(retag),
  creasing: { minor: { label: 'Steam in-house', min: 5 }, moderate: { label: 'Steam & press in-house', min: 10 }, major: { ...dry, label: 'Professional clean & press' } },
  stain: { minor: spot, moderate: dry, major: 'unfixable' },
  discoloration: { minor: dry, moderate: 'unfixable', major: 'unfixable' },
  tear_or_hole: {
    minor: { label: 'Small darn / patch (tailor)', service: (s) => s.tailor_small_repair },
    moderate: { label: 'Darn / patch (tailor)', service: (s) => s.tailor_repair },
    major: 'unfixable',
  },
  loose_stitching: {
    minor: { label: 'Hand-stitch in-house', min: 10 },
    moderate: { label: 'Stitch repair (tailor)', service: (s) => s.tailor_repair },
    major: { label: 'Seam repair (tailor)', service: (s) => s.seam_repair, serviceSource: 'tailor' },
  },
  pilling_or_wear: { minor: { label: 'De-pill in-house', min: 10 }, moderate: 'unfixable', major: 'unfixable' },
  hardware_damage: {
    minor: { label: 'Replace button / hook in-house', min: 5, materials: 10 },
    moderate: { label: 'Zip replacement (tailor)', service: (s) => s.zip_replace, serviceSource: 'tailor' },
    major: { label: 'Zip & hardware replacement (tailor)', service: (s) => s.zip_replace_major, serviceSource: 'tailor' },
  },
  scuff_or_scratch: { minor: spot, moderate: dry, major: 'unfixable' },
  odor_reported: all(dry),
  signs_of_use: { minor: { label: 'Wash & steam in-house', min: 10 }, moderate: dry, major: 'unfixable' },
  sole_wear: { minor: spot, moderate: dry, major: 'unfixable' },
  other: { minor: { label: 'Minor fix in-house', min: 10 }, moderate: dry, major: 'unfixable' },
}

const FOOTWEAR: Matrix = {
  packaging_damage: all({ label: 'New shoebox & repack', min: 3, materialsKey: 'shoe_box' }),
  missing_tags: all(retag),
  scuff_or_scratch: {
    minor: { label: 'Clean & polish in-house', min: 10, materials: 20 },
    moderate: shoeClean,
    major: { label: 'Colour restoration', service: (s) => s.shoe_colour, serviceSource: 'shoe' },
  },
  stain: {
    minor: { label: 'Spot clean in-house', min: 10, materials: 20 },
    moderate: shoeClean,
    major: { label: 'Professional cleaning + hard-stain removal', service: (s) => s.shoe_clean + s.shoe_hard_stain, serviceSource: 'shoe' },
  },
  sole_wear: {
    minor: shoeClean,
    moderate: { label: 'Sole pasting', service: (s) => s.shoe_sole_paste, serviceSource: 'shoe' },
    major: { label: 'Sole replacement', service: (s) => s.shoe_sole_replace, serviceSource: 'shoe' },
  },
  loose_stitching: {
    minor: { label: 'Stitching work', service: (s) => s.shoe_stitch, serviceSource: 'shoe' },
    moderate: { label: 'Stitching work', service: (s) => s.shoe_stitch, serviceSource: 'shoe' },
    major: { label: 'Stitching + patch work', service: (s) => s.shoe_stitch + s.shoe_patch, serviceSource: 'shoe' },
  },
  tear_or_hole: {
    minor: { label: 'Patch work', service: (s) => s.shoe_patch, serviceSource: 'shoe' },
    moderate: { label: 'Patch + stitching work', service: (s) => s.shoe_patch + s.shoe_stitch, serviceSource: 'shoe' },
    major: { label: 'Leather / upper replacement', service: (s) => s.shoe_leather_replace, serviceSource: 'shoe' },
  },
  hardware_damage: {
    minor: { label: 'Replace laces / eyelet in-house', min: 5, materials: 30 },
    moderate: { label: 'Repair (stitching rate)', service: (s) => s.shoe_stitch, serviceSource: 'shoe' },
    major: { label: 'Heel / hardware replacement', service: (s) => s.shoe_heel, serviceSource: 'shoe' },
  },
  creasing: { minor: { label: 'Shape with shoe trees in-house', min: 5 }, moderate: 'unfixable', major: 'unfixable' },
  discoloration: {
    minor: shoeClean,
    moderate: { label: 'Colour change', service: (s) => s.shoe_colour, serviceSource: 'shoe' },
    major: { label: 'Colour change', service: (s) => s.shoe_colour, serviceSource: 'shoe' },
  },
  pilling_or_wear: { minor: shoeClean, moderate: 'unfixable', major: 'unfixable' },
  odor_reported: all({ ...shoeClean, label: 'Professional cleaning & deodorising' }),
  signs_of_use: { minor: { label: 'Clean in-house', min: 10, materials: 20 }, moderate: shoeClean, major: 'unfixable' },
  other: { minor: { label: 'Minor fix in-house', min: 10 }, moderate: shoeClean, major: 'unfixable' },
}

const BAGS: Matrix = {
  ...FOOTWEAR,
  packaging_damage: all(repack),
  sole_wear: FOOTWEAR.signs_of_use,
  creasing: { minor: { label: 'Reshape in-house', min: 5 }, moderate: shoeClean, major: 'unfixable' },
  hardware_damage: {
    minor: { label: 'Fix strap / clasp in-house', min: 10, materials: 20 },
    moderate: { label: 'Zip replacement', service: (s) => s.zip_replace, serviceSource: 'tailor' },
    major: { label: 'Zip & hardware replacement', service: (s) => s.zip_replace_major, serviceSource: 'tailor' },
  },
}

const MATRIX: Record<Group, Matrix> = { apparel: APPAREL, footwear: FOOTWEAR, bags: BAGS }

/** Can this defect be fixed for resale at all? Used by grading guardrails too. */
export function isUnfixable(category: Category, d: Pick<Defect, 'type' | 'severity'>): boolean {
  return MATRIX[groupOf(category)][d.type]?.[d.severity] === 'unfixable'
}

// ─────────────────────────── Estimating ───────────────────────────

export interface EstimateLine {
  text: string
  amount: number
  source?: SourceKey
  assumption?: boolean
}

export type EstimateField =
  | 'resale_price'
  | 'refurb_resale_price'
  | 'refurb_cost'
  | 'liquidation_price'
  | 'liquidation_fee'
  | 'recycling_value'
  | 'recycling_cost'
  | 'selling_fee_pct'
  | 'handling_cost'

export interface RateEstimate {
  values: Record<EstimateField, number>
  notes: Partial<Record<EstimateField, EstimateLine[]>>
  /** Defects that can't be repaired for resale; refurbish values are left at 0. */
  unfixable: string[]
}

export interface EstimateInput {
  category: Category
  original_price: number
  grade: Grade | null
  defects: Pick<Defect, 'type' | 'severity'>[]
}

const r0 = (n: number) => Math.round(n)
const SEV_RANK: Record<Severity, number> = { minor: 0, moderate: 1, major: 2 }

/** Worst severity per defect type — the same problem listed twice is repaired once. */
function dedupe(defects: EstimateInput['defects']) {
  const m = new Map<DefectType, Severity>()
  for (const d of defects) {
    const cur = m.get(d.type)
    if (!cur || SEV_RANK[d.severity] > SEV_RANK[cur]) m.set(d.type, d.severity)
  }
  return [...m.entries()].map(([type, severity]) => ({ type, severity }))
}

function closingFee(price: number) {
  // Easy Ship bands + the 7 Sep 2026 increase (₹1 up to ₹500, ₹3 above).
  if (price <= 250) return 6
  if (price <= 500) return 10
  if (price <= 1000) return 33
  return 59
}

export function estimateFromRates(input: EstimateInput, rates: RateCard = DEFAULT_RATES): RateEstimate {
  const cat = (CATEGORIES as readonly string[]).includes(input.category) ? input.category : 'Topwear'
  const op = Math.max(0, Number(input.original_price) || 0)
  const perMin = rates.labour_per_hour / 60
  const gst = 1 + rates.gst_on_fees_pct / 100
  const notes: RateEstimate['notes'] = {}
  const unfixable: string[] = []

  // ── Selling fee (% of sale price) ──
  let feePct: number
  if (rates.channel === 'marketplace') {
    const ref = op > rates.fee_free_up_to ? rates.referral_pct[cat] : 0
    feePct = Math.round(ref * gst * 100) / 100
    notes.selling_fee_pct = [
      op > rates.fee_free_up_to
        ? { text: `Marketplace referral fee for ${cat.toLowerCase()} ${ref}% + ${rates.gst_on_fees_pct}% GST`, amount: feePct, source: 'amazon_fees' }
        : { text: `No referral fee at or below ₹${rates.fee_free_up_to.toLocaleString('en-IN')}`, amount: 0, source: 'amazon_fees' },
    ]
  } else {
    feePct = Math.round(rates.payment_gateway_pct * gst * 100) / 100
    notes.selling_fee_pct = [{ text: `Payment gateway ${rates.payment_gateway_pct}% + ${rates.gst_on_fees_pct}% GST`, amount: feePct, assumption: true }]
  }

  // ── Handling & outbound shipping (per unit, every sale route) ──
  const w = rates.weight_kg[cat]
  const extraSlabs = Math.max(0, Math.ceil(w / 0.5) - 1)
  const shipBase = rates.ship_first_500g[rates.channel] + extraSlabs * rates.ship_extra_500g
  const handlingLines: EstimateLine[] = []
  if (rates.channel === 'marketplace') {
    handlingLines.push({ text: `Weight handling, ${w} kg packed${extraSlabs ? ` (₹${rates.ship_first_500g.marketplace} + ${extraSlabs} × ₹${rates.ship_extra_500g})` : ''} + GST`, amount: r0(shipBase * gst), source: 'amazon_fees' })
    handlingLines.push({ text: 'Closing fee + GST', amount: r0(closingFee(op) * gst), source: 'closing_fees' })
  } else {
    handlingLines.push({ text: `Courier, ${w} kg packed`, amount: r0(shipBase), source: 'courier' })
  }
  handlingLines.push({ text: 'Pick & pack, 3 min', amount: r0(3 * perMin), source: 'wage' })
  handlingLines.push({ text: 'Packing materials', amount: rates.packing_materials, assumption: true })
  notes.handling_cost = handlingLines
  const handling = handlingLines.reduce((s, l) => s + l.amount, 0)

  // ── Restock: sold as new at your own price ──
  const resale = r0(op)
  notes.resale_price = [{ text: 'Your original selling price — sold as new', amount: resale }]

  // ── Refurbish: repair each defect once, resell at a markdown ──
  const repairLines: EstimateLine[] = [{ text: 'Re-inspection, 5 min', amount: r0(5 * perMin), source: 'wage' }]
  const seenService = new Set<string>()
  const matrix = MATRIX[groupOf(cat)]
  const defects = dedupe(input.defects)
  for (const d of defects) {
    const plan = matrix[d.type]?.[d.severity] ?? matrix.other![d.severity]
    const label = `${DEFECT_LABEL[d.type]} (${d.severity})`
    if (plan === 'unfixable') {
      unfixable.push(label)
      continue
    }
    if (plan.service && seenService.has(plan.label)) continue // e.g. one professional clean covers several issues
    if (plan.service) seenService.add(plan.label)
    let amount = 0
    if (plan.min) amount += plan.min * perMin
    if (plan.service) amount += plan.service(rates.services, cat)
    if (plan.materials) amount += plan.materials
    if (plan.materialsKey) amount += rates.services[plan.materialsKey]
    repairLines.push({
      text: `${label}: ${plan.label}${plan.min ? `, ${plan.min} min` : ''}`,
      amount: r0(amount),
      source: plan.serviceSource ?? (plan.min && !plan.service ? 'wage' : undefined),
      assumption: !plan.serviceSource && !!plan.service,
    })
  }
  if (!defects.length && input.grade === 'B') {
    // Graded B by hand without listing issues: a standard refresh.
    repairLines.push({ text: 'Standard refresh: steam, re-tag, repack, 10 min', amount: r0(10 * perMin + 5), source: 'wage' })
  }
  let refurbResale = r0((op * rates.refurb_resale_pct) / 100)
  let refurbCost = repairLines.reduce((s, l) => s + l.amount, 0)
  if (unfixable.length) {
    refurbResale = 0
    refurbCost = 0
    notes.refurb_resale_price = [{ text: `Not repairable for resale: ${unfixable.join(', ')}`, amount: 0 }]
    notes.refurb_cost = []
  } else {
    notes.refurb_resale_price = [{ text: `${rates.refurb_resale_pct}% of the original price — sold as “minor flaw”`, amount: refurbResale, assumption: true }]
    notes.refurb_cost = repairLines
  }

  // ── Liquidation ──
  const liqKey = input.grade ?? 'ungraded'
  const liqPct = rates.liquidation_pct[liqKey]
  const liqPrice = r0((op * liqPct) / 100)
  notes.liquidation_price = [
    {
      text: `${liqPct}% of the original price${input.grade ? ` for ${input.grade === 'MANUAL_REVIEW' ? 'an unreviewed item' : `Grade ${input.grade}`}` : ' (not graded yet)'}`,
      amount: liqPrice,
      source: liqKey === 'C' || liqKey === 'MANUAL_REVIEW' ? undefined : 'surplus',
      assumption: liqKey === 'C' || liqKey === 'MANUAL_REVIEW',
    },
  ]
  const liqLines: EstimateLine[] = [
    { text: 'Pack into bulk lot, 3 min', amount: r0(3 * perMin), source: 'wage' },
    { text: 'Share of bulk freight', amount: rates.liquidation_freight, assumption: true },
  ]
  if (rates.liquidation_commission_pct) liqLines.push({ text: `Buyer / platform commission ${rates.liquidation_commission_pct}%`, amount: r0((liqPrice * rates.liquidation_commission_pct) / 100), assumption: true })
  notes.liquidation_fee = liqLines
  const liqFee = liqLines.reduce((s, l) => s + l.amount, 0)

  // ── Recycling ──
  const recValue = r0(w * rates.scrap_per_kg)
  notes.recycling_value = [{ text: `${w} kg × ₹${rates.scrap_per_kg}/kg scrap rate`, amount: recValue, source: 'scrap' }]
  const recLines: EstimateLine[] = [
    { text: 'Sort & bag, 5 min', amount: r0(5 * perMin), source: 'wage' },
    { text: 'Transport share', amount: rates.recycle_transport, assumption: true },
  ]
  notes.recycling_cost = recLines

  return {
    values: {
      resale_price: resale,
      refurb_resale_price: refurbResale,
      refurb_cost: refurbCost,
      liquidation_price: liqPrice,
      liquidation_fee: liqFee,
      recycling_value: recValue,
      recycling_cost: recLines.reduce((s, l) => s + l.amount, 0),
      selling_fee_pct: feePct,
      handling_cost: handling,
    },
    notes,
    unfixable,
  }
}

// ─────────────────────── Applying estimates to a return ───────────────────────

const ROUTE_FIELDS: Record<RouteKey, EstimateField[]> = {
  restock: ['resale_price'],
  refurbish: ['refurb_resale_price', 'refurb_cost'],
  liquidate: ['liquidation_price', 'liquidation_fee'],
  recycle: ['recycling_value', 'recycling_cost'],
}
const COST_FIELDS: EstimateField[] = ['selling_fee_pct', 'handling_cost']
export const FIELD_ROUTE: Partial<Record<EstimateField, RouteKey>> = {
  resale_price: 'restock',
  refurb_resale_price: 'refurbish',
  refurb_cost: 'refurbish',
  liquidation_price: 'liquidate',
  liquidation_fee: 'liquidate',
  recycling_value: 'recycle',
  recycling_cost: 'recycle',
}

type Basisable = Pick<ReturnItem, 'value_basis' | EstimateField>

/** The rate-card inputs for an item: its confirmed grade/defects, else the AI's proposal. */
export function estimateInputFor(item: Pick<ReturnItem, 'category' | 'original_price' | 'grade' | 'defects' | 'ai_inspection'>, override?: { grade?: Grade | null; defects?: Defect[] }): EstimateInput {
  const grade = override?.grade !== undefined ? override.grade : item.grade ?? item.ai_inspection?.proposed_grade ?? null
  const defects = override?.defects ?? (item.grade ? item.defects : item.ai_inspection?.defects ?? item.defects)
  return { category: item.category, original_price: item.original_price, grade, defects }
}

/**
 * Patch that (re)fills recovery values from the rate card.
 * Filled: routes already on the rate card, and routes that are still empty.
 * Never touched: routes holding the user's own estimate or a third-party quote.
 * `replaceAi` also replaces values from the older AI-estimate method.
 */
export function ratesPatch(item: Basisable, est: RateEstimate, opts: { replaceAi?: boolean } = {}): Partial<ReturnInput> {
  const basis = { ...(item.value_basis ?? {}) }
  const patch: Partial<ReturnInput> = {}
  const set = (f: EstimateField) => ((patch as Record<string, number>)[f] = est.values[f])
  const hadAi = Object.values(basis).includes('ai')
  for (const route of Object.keys(ROUTE_FIELDS) as RouteKey[]) {
    const b = basis[route]
    const empty = ROUTE_FIELDS[route].every((f) => !item[f])
    if (b === 'rates' || (b === 'ai' && opts.replaceAi) || (empty && b !== 'quote' && b !== 'ai')) {
      ROUTE_FIELDS[route].forEach(set)
      basis[route] = 'rates'
    }
  }
  const cb = basis.costs
  const costsEmpty = COST_FIELDS.every((f) => !item[f])
  if (cb === 'rates' || (cb === undefined && (costsEmpty || (hadAi && opts.replaceAi)))) {
    COST_FIELDS.forEach(set)
    basis.costs = 'rates'
  }
  patch.value_basis = basis
  return patch
}

/** True when stored values for a route still match the rate card (so its breakdown can be shown). */
export function matchesRates(item: Basisable, est: RateEstimate, fields: EstimateField[]) {
  return fields.every((f) => Math.round(Number(item[f]) * 100) === Math.round(est.values[f] * 100))
}
