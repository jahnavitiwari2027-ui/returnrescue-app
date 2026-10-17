// Rate card: turns a return's category, price, grade and the defects found into
// recovery estimates. No AI is involved in any rupee figure — the AI only reports
// which defects it can see and how severe they are.
//
// Every number used is one of three kinds, and every line says which:
//   business   — a value the business entered or changed (its own price or rate)
//   published  — a default taken from a cited public source (RATE_SOURCES)
//   assumption — a default we chose where no public source exists; always editable
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

export type SourceKey =
  | 'amazon_fees'
  | 'closing_fees'
  | 'courier'
  | 'gateway'
  | 'gst_goods'
  | 'wage'
  | 'oncost'
  | 'dryclean'
  | 'shoe'
  | 'tailor'
  | 'surplus'
  | 'scrap'

export interface RateSource {
  title: string
  publisher: string
  url: string
  /** What the source says applies from, or its publication date. */
  effective: string
  used_for: string
}

/** Sources were last checked on this date. */
export const RATES_CHECKED_ON = '17 Oct 2026'

export const RATE_SOURCES: Record<SourceKey, RateSource> = {
  amazon_fees: {
    title: 'Pricing & seller fees',
    publisher: 'Amazon.in',
    url: 'https://sell.amazon.in/fees-and-pricing',
    effective: 'Current fee page; closing-fee change from 7 Sep 2026',
    used_for: 'Referral fee by category (0% up to ₹1,000), Easy Ship weight handling (₹51 first 500 g, ₹17 per extra 500 g), 18% GST on fees.',
  },
  closing_fees: {
    title: 'Amazon commission rates in India',
    publisher: 'Shiprocket (secondary source)',
    url: 'https://www.shiprocket.in/blog/amazon-commission-rates-in-india/',
    effective: 'Published Feb 2025, updated Jan 2026',
    used_for: 'Easy Ship closing fee by price band (₹5 / ₹9 / ₹30 / ₹56), plus Amazon’s 7 Sep 2026 increase of ₹1 (up to ₹500) or ₹3 (above). Confirm in Seller Central.',
  },
  courier: {
    title: 'Cheapest courier services for small businesses (2026)',
    publisher: 'IndiaPost.org',
    url: 'https://indiapost.org/cheapest-courier-service',
    effective: '2026',
    used_for: 'Own-website shipping: 500 g parcel via an aggregator ≈ ₹40–45 all-in.',
  },
  gateway: {
    title: 'Razorpay payment gateway pricing explained',
    publisher: 'Razorpay',
    url: 'https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/',
    effective: 'Published 13 Feb 2026',
    used_for: 'Standard domestic fee 2% per transaction + 18% GST on the fee.',
  },
  gst_goods: {
    title: 'GST for apparel and footwear after the slab change',
    publisher: 'Taxaj',
    url: 'https://www.taxaj.com/learn/gst-for-apparel-and-footwear-businesses-after-slab-change-pricing-impa/',
    effective: 'Rates effective 22 Sep 2025',
    used_for: 'Apparel and footwear: 5% GST up to ₹2,500 per piece or pair, 18% above.',
  },
  wage: {
    title: 'Minimum wages in Delhi',
    publisher: 'ClearTax',
    url: 'https://cleartax.in/s/minimum-wages-in-delhi',
    effective: 'Rates effective 1 Apr 2026',
    used_for: 'Unskilled worker ₹710 per day (₹88.75 per hour over 8 hours).',
  },
  oncost: {
    title: 'PF and ESI calculation: employee and employer contributions',
    publisher: 'Mynd Solution',
    url: 'https://www.myndsolution.com/pf-and-esi-calculation-how-to-compute-employee-and-employer-contributions-accurately/',
    effective: 'Current statutory rates',
    used_for: 'Employer EPF 12% + EDLI 0.5% + admin 0.5%, ESI 3.25% → 16.25% on top of wages.',
  },
  dryclean: {
    title: 'Dry cleaning cost in Delhi (2026)',
    publisher: 'Cloud Dhobi',
    url: 'https://clouddhobi.com/dry-cleaning-cost-in-delhi/',
    effective: '2026 price guide (Medium tier)',
    used_for: 'Professional cleaning per garment: shirt ₹199, T-shirt ₹149, jeans ₹149, kurta ₹199.',
  },
  shoe: {
    title: 'Shoe repair & laundry prices',
    publisher: 'My Shoe Clinic',
    url: 'https://myshoeclinic.com/booking.php',
    effective: 'Current price list (two prices shown per service; we use the higher)',
    used_for: 'Cleaning ₹449, hard-stain removal ₹199, sole pasting ₹449, stitching ₹449, patch ₹399, sole replacement ₹1,099, heel ₹599, colour change ₹999, leather replacement ₹1,799.',
  },
  tailor: {
    title: 'Clothing alteration cost in India (2026)',
    publisher: 'AlterDry',
    url: 'https://alterdry.com/how-much-does-clothing-alteration-cost-in-india/',
    effective: '2026 guide (prices include GST)',
    used_for: 'Zip replacement ₹300–700 (we use ₹500, and ₹700 for major), seam work ₹400–1,000 (we use ₹700).',
  },
  surplus: {
    title: 'The surpassing surplus business',
    publisher: 'Apparel Resources',
    url: 'https://apparelresources.com/business-news/retail/surpassing-surplus-business/',
    effective: 'Industry article (undated)',
    used_for: 'Unsold branded stock sells to surplus buyers for 20–30% of its original value (we use 20%).',
  },
  scrap: {
    title: 'Scrap rates in India',
    publisher: 'KabadiDost',
    url: 'https://kabadidost.in/scrap-rates',
    effective: 'Indicative current rates',
    used_for: 'Old clothes / textile scrap ₹2–6 per kg (we use ₹2).',
  },
}

/** How defaults are chosen when a source gives a range. Shown on the method page. */
export const RANGE_POLICY =
  'Where a source gives a range, money you receive uses the low end and costs use the midpoint; where a source lists two prices for the same service, we use the higher one.'

// ─────────────────────────── Rate card ───────────────────────────

export type Channel = 'marketplace' | 'own_site'
export type InputKind = 'business' | 'published' | 'assumption'

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
type SvcKey = Exclude<keyof ServicePrices, 'dry_clean'>

export interface RateCard {
  channel: Channel
  /** GST-registered sellers keep the price minus GST, and can claim GST on fees back as input tax credit. */
  gst_registered: boolean
  goods_gst_threshold: number
  goods_gst_low_pct: number
  goods_gst_high_pct: number
  bags_gst_pct: number
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
  gst_registered: true,
  goods_gst_threshold: 2500,
  goods_gst_low_pct: 5,
  goods_gst_high_pct: 18,
  bags_gst_pct: 18,
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
  payment_gateway_pct: 2,
  gst_on_fees_pct: 18,
  labour_per_hour: 103, // ₹88.75 wage + 16.25% employer PF/ESI
  packing_materials: 15,
  ship_first_500g: { marketplace: 51, own_site: 45 },
  ship_extra_500g: 17,
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
  refurb_resale_pct: 70,
  liquidation_pct: { A: 20, B: 15, C: 10, MANUAL_REVIEW: 10, ungraded: 15 },
  liquidation_commission_pct: 0,
  liquidation_freight: 15,
  scrap_per_kg: 2,
  recycle_transport: 10,
  services: {
    dry_clean: byCat({
      Topwear: 199,
      Bottomwear: 149,
      'Ethnic wear': 199,
      Dresses: 199,
      Activewear: 149,
      'Innerwear & swimwear': 149,
      Footwear: 449,
      'Bags & accessories': 449,
    }),
    shoe_clean: 449,
    shoe_hard_stain: 199,
    shoe_sole_paste: 449,
    shoe_sole_replace: 1099,
    shoe_stitch: 449,
    shoe_patch: 399,
    shoe_heel: 599,
    shoe_colour: 999,
    shoe_leather_replace: 1799,
    tailor_small_repair: 150,
    tailor_repair: 300,
    seam_repair: 700,
    zip_replace: 500,
    zip_replace_major: 700,
    shoe_box: 40,
  },
}

/** Where each default comes from. Anything not listed as published is an assumption. */
const SCALAR_META: Partial<Record<keyof RateCard, { kind: InputKind; source?: SourceKey }>> = {
  goods_gst_threshold: { kind: 'published', source: 'gst_goods' },
  goods_gst_low_pct: { kind: 'published', source: 'gst_goods' },
  goods_gst_high_pct: { kind: 'published', source: 'gst_goods' },
  bags_gst_pct: { kind: 'assumption' },
  referral_pct: { kind: 'published', source: 'amazon_fees' },
  fee_free_up_to: { kind: 'published', source: 'amazon_fees' },
  payment_gateway_pct: { kind: 'published', source: 'gateway' },
  gst_on_fees_pct: { kind: 'published', source: 'amazon_fees' },
  labour_per_hour: { kind: 'published', source: 'wage' },
  packing_materials: { kind: 'assumption' },
  ship_extra_500g: { kind: 'published', source: 'amazon_fees' },
  weight_kg: { kind: 'assumption' },
  refurb_resale_pct: { kind: 'assumption' },
  liquidation_commission_pct: { kind: 'assumption' },
  liquidation_freight: { kind: 'assumption' },
  scrap_per_kg: { kind: 'published', source: 'scrap' },
  recycle_transport: { kind: 'assumption' },
}

const SERVICE_META: Record<SvcKey | 'dry_clean', { kind: InputKind; source?: SourceKey }> = {
  dry_clean: { kind: 'published', source: 'dryclean' },
  shoe_clean: { kind: 'published', source: 'shoe' },
  shoe_hard_stain: { kind: 'published', source: 'shoe' },
  shoe_sole_paste: { kind: 'published', source: 'shoe' },
  shoe_sole_replace: { kind: 'published', source: 'shoe' },
  shoe_stitch: { kind: 'published', source: 'shoe' },
  shoe_patch: { kind: 'published', source: 'shoe' },
  shoe_heel: { kind: 'published', source: 'shoe' },
  shoe_colour: { kind: 'published', source: 'shoe' },
  shoe_leather_replace: { kind: 'published', source: 'shoe' },
  tailor_small_repair: { kind: 'assumption' },
  tailor_repair: { kind: 'assumption' },
  seam_repair: { kind: 'published', source: 'tailor' },
  zip_replace: { kind: 'published', source: 'tailor' },
  zip_replace_major: { kind: 'published', source: 'tailor' },
  shoe_box: { kind: 'assumption' },
}

/** Meta for a rate-card path, e.g. ['liquidation_pct','A'] or ['services','shoe_clean']. Used by the Rates page. */
export function rateMeta(path: string[]): { kind: InputKind; source?: SourceKey } {
  if (path[0] === 'services') return SERVICE_META[path[1] as SvcKey | 'dry_clean'] ?? { kind: 'assumption' }
  if (path[0] === 'ship_first_500g') return path[1] === 'marketplace' ? { kind: 'published', source: 'amazon_fees' } : { kind: 'published', source: 'courier' }
  if (path[0] === 'liquidation_pct') return path[1] === 'A' ? { kind: 'published', source: 'surplus' } : { kind: 'assumption' }
  return SCALAR_META[path[0] as keyof RateCard] ?? { kind: 'assumption' }
}

/** The assumptions in the default rate card, in plain words. */
export const ASSUMPTIONS: string[] = [
  'Repaired items resell at 70% of the original price (sold as “minor flaw”).',
  'Liquidation: Grade B at 15%, Grade C and unreviewed items at 10%, ungraded at 15% of the original price — below the 20% low end that surplus buyers pay for unsold stock, because returns are used or damaged.',
  'Liquidation commission 0% (add your platform’s rate) and bulk freight ₹15 per unit.',
  'Bags and accessories GST 18% — check your product’s HSN code.',
  'Packing materials ₹15 per unit (polybag, label, tissue); replacement shoebox ₹40.',
  'Packed weight per item (0.15–1 kg by category).',
  'Small clothing repairs at a local tailor ₹150, larger ₹300.',
  'In-house task times: steaming 5–10 min, spot clean 10 min, re-tag or repack 3 min, re-inspection 5 min. The hourly labour rate itself is sourced.',
  'Own-website courier: ₹17 per extra 500 g (Amazon’s slab rate used as a proxy).',
  'Recycling transport ₹10 per unit (share of a bulk drop).',
]

// ─────────────────────── Overrides (stored per workspace) ───────────────────────

export type RateOverrides = Partial<Omit<RateCard, 'services'>> & { services?: Partial<ServicePrices> }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const okNum = (v: unknown, max = 1_000_000) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max

/** Merge saved overrides onto the defaults, ignoring anything malformed or out of range. */
export function resolveRates(overrides: unknown): RateCard {
  const out: RateCard = JSON.parse(JSON.stringify(DEFAULT_RATES))
  if (!isObj(overrides)) return out
  const o = overrides as Record<string, unknown>
  if (o.channel === 'marketplace' || o.channel === 'own_site') out.channel = o.channel
  if (typeof o.gst_registered === 'boolean') out.gst_registered = o.gst_registered
  const pctKeys = ['payment_gateway_pct', 'gst_on_fees_pct', 'refurb_resale_pct', 'liquidation_commission_pct', 'goods_gst_low_pct', 'goods_gst_high_pct', 'bags_gst_pct'] as const
  for (const k of pctKeys) if (okNum(o[k], 100)) out[k] = o[k] as number
  const numKeys = ['fee_free_up_to', 'labour_per_hour', 'packing_materials', 'ship_extra_500g', 'scrap_per_kg', 'recycle_transport', 'liquidation_freight', 'goods_gst_threshold'] as const
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

/** One repair action: in-house minutes at the labour rate, outsourced services (summed), and materials. */
interface Action {
  label: string
  min?: number
  svc?: (SvcKey | 'dry_clean')[]
  materials?: number
}
type Plan = Action | 'unfixable'
type Matrix = Partial<Record<DefectType, Record<Severity, Plan>>>

const all = (p: Plan): Record<Severity, Plan> => ({ minor: p, moderate: p, major: p })
const dry: Action = { label: 'Professional cleaning', svc: ['dry_clean'] }
const shoeClean: Action = { label: 'Professional cleaning & polish', svc: ['shoe_clean'] }
const spot: Action = { label: 'Spot clean in-house', min: 10, materials: 10 }
const repack: Action = { label: 'Replace retail packaging', min: 3 }
const retag: Action = { label: 'Re-tag', min: 3, materials: 5 }

const APPAREL: Matrix = {
  packaging_damage: all(repack),
  missing_tags: all(retag),
  creasing: { minor: { label: 'Steam in-house', min: 5 }, moderate: { label: 'Steam & press in-house', min: 10 }, major: { ...dry, label: 'Professional clean & press' } },
  stain: { minor: spot, moderate: dry, major: 'unfixable' },
  discoloration: { minor: dry, moderate: 'unfixable', major: 'unfixable' },
  tear_or_hole: { minor: { label: 'Small darn / patch (tailor)', svc: ['tailor_small_repair'] }, moderate: { label: 'Darn / patch (tailor)', svc: ['tailor_repair'] }, major: 'unfixable' },
  loose_stitching: {
    minor: { label: 'Hand-stitch in-house', min: 10 },
    moderate: { label: 'Stitch repair (tailor)', svc: ['tailor_repair'] },
    major: { label: 'Seam repair (tailor)', svc: ['seam_repair'] },
  },
  pilling_or_wear: { minor: { label: 'De-pill in-house', min: 10 }, moderate: 'unfixable', major: 'unfixable' },
  hardware_damage: {
    minor: { label: 'Replace button / hook in-house', min: 5, materials: 10 },
    moderate: { label: 'Zip replacement (tailor)', svc: ['zip_replace'] },
    major: { label: 'Zip & hardware replacement (tailor)', svc: ['zip_replace_major'] },
  },
  scuff_or_scratch: { minor: spot, moderate: dry, major: 'unfixable' },
  odor_reported: all(dry),
  signs_of_use: { minor: { label: 'Wash & steam in-house', min: 10 }, moderate: dry, major: 'unfixable' },
  sole_wear: { minor: spot, moderate: dry, major: 'unfixable' },
  other: { minor: { label: 'Minor fix in-house', min: 10 }, moderate: dry, major: 'unfixable' },
}

const FOOTWEAR: Matrix = {
  packaging_damage: all({ label: 'New shoebox', min: 3, svc: ['shoe_box'] }),
  missing_tags: all(retag),
  scuff_or_scratch: { minor: { label: 'Clean & polish in-house', min: 10, materials: 20 }, moderate: shoeClean, major: { label: 'Colour restoration', svc: ['shoe_colour'] } },
  stain: { minor: { label: 'Spot clean in-house', min: 10, materials: 20 }, moderate: shoeClean, major: { label: 'Cleaning + hard-stain removal', svc: ['shoe_clean', 'shoe_hard_stain'] } },
  sole_wear: { minor: shoeClean, moderate: { label: 'Sole pasting', svc: ['shoe_sole_paste'] }, major: { label: 'Sole replacement', svc: ['shoe_sole_replace'] } },
  loose_stitching: { minor: { label: 'Stitching work', svc: ['shoe_stitch'] }, moderate: { label: 'Stitching work', svc: ['shoe_stitch'] }, major: { label: 'Stitching + patch work', svc: ['shoe_stitch', 'shoe_patch'] } },
  tear_or_hole: { minor: { label: 'Patch work', svc: ['shoe_patch'] }, moderate: { label: 'Patch + stitching work', svc: ['shoe_patch', 'shoe_stitch'] }, major: { label: 'Leather / upper replacement', svc: ['shoe_leather_replace'] } },
  hardware_damage: { minor: { label: 'Replace laces / eyelet in-house', min: 5, materials: 30 }, moderate: { label: 'Repair (stitching rate)', svc: ['shoe_stitch'] }, major: { label: 'Heel / hardware replacement', svc: ['shoe_heel'] } },
  creasing: { minor: { label: 'Shape with shoe trees in-house', min: 5 }, moderate: 'unfixable', major: 'unfixable' },
  discoloration: { minor: shoeClean, moderate: { label: 'Colour change', svc: ['shoe_colour'] }, major: { label: 'Colour change', svc: ['shoe_colour'] } },
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
    moderate: { label: 'Zip replacement', svc: ['zip_replace'] },
    major: { label: 'Zip & hardware replacement', svc: ['zip_replace_major'] },
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
  /** ₹ — or, for the selling-deductions field, percentage points of the sale price. */
  amount: number
  kind: InputKind
  source?: SourceKey
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

/** A line built from several inputs is only as firm as its weakest: any assumption makes it an assumption. */
function combine(...parts: { kind: InputKind; source?: SourceKey }[]): { kind: InputKind; source?: SourceKey } {
  const kind: InputKind = parts.some((p) => p.kind === 'assumption') ? 'assumption' : parts.some((p) => p.kind === 'business') ? 'business' : 'published'
  return { kind, source: parts.find((p) => p.source)?.source }
}
const TIME: { kind: InputKind } = { kind: 'assumption' } // in-house task minutes are our estimate

const r0 = (n: number) => Math.round(n)
const r2 = (n: number) => Math.round(n * 100) / 100
const SEV_RANK: Record<Severity, number> = { minor: 0, moderate: 1, major: 2 }
const inrTxt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

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
  // Easy Ship bands + Amazon's 7 Sep 2026 increase (₹1 up to ₹500, ₹3 above).
  if (price <= 250) return 6
  if (price <= 500) return 10
  if (price <= 1000) return 33
  return 59
}

/** GST rate on the goods themselves, by category and price. */
export function goodsGstPct(category: Category, price: number, rates: RateCard = DEFAULT_RATES) {
  if (category === 'Bags & accessories') return rates.bags_gst_pct
  return price > rates.goods_gst_threshold ? rates.goods_gst_high_pct : rates.goods_gst_low_pct
}

export function estimateFromRates(input: EstimateInput, rates: RateCard = DEFAULT_RATES): RateEstimate {
  const D = DEFAULT_RATES
  const cat = (CATEGORIES as readonly string[]).includes(input.category) ? input.category : 'Topwear'
  const op = Math.max(0, Number(input.original_price) || 0)
  const perMin = rates.labour_per_hour / 60
  const feeGst = rates.gst_on_fees_pct / 100
  const notes: RateEstimate['notes'] = {}
  const unfixable: string[] = []

  /** Kind of a scalar rate: 'business' once the business changed it from the default. */
  const k = (key: keyof RateCard, sub?: string): { kind: InputKind; source?: SourceKey } => {
    const cur = sub ? (rates[key] as Record<string, number>)[sub] : rates[key]
    const def = sub ? (D[key] as Record<string, number>)[sub] : D[key]
    const meta = rateMeta(sub ? [key, sub] : [key])
    return cur === def ? meta : { kind: 'business' }
  }
  const svcKind = (s: SvcKey | 'dry_clean'): { kind: InputKind; source?: SourceKey } => {
    const changed = s === 'dry_clean' ? rates.services.dry_clean[cat] !== D.services.dry_clean[cat] : rates.services[s] !== D.services[s]
    return changed ? { kind: 'business' } : SERVICE_META[s]
  }
  const labourKind = k('labour_per_hour')
  const labourText = (min: number) => `${min} min at ₹${rates.labour_per_hour}/h`

  // ── Selling deductions (% of the price the customer pays) ──
  // GST on the sale goes to the government; marketplace or gateway fees go to the channel.
  // A GST-registered seller claims GST on those fees back as input tax credit, so it isn't a cost.
  const feeLines: EstimateLine[] = []
  if (rates.gst_registered) {
    const g = goodsGstPct(cat, op, rates)
    const share = r2((g / (100 + g)) * 100)
    feeLines.push({ text: `GST on the sale: ${g}% is included in the price, so ${share}% of it goes to GST`, amount: share, ...(cat === 'Bags & accessories' ? k('bags_gst_pct') : k(op > rates.goods_gst_threshold ? 'goods_gst_high_pct' : 'goods_gst_low_pct')) })
  }
  const channelPct = rates.channel === 'marketplace' ? (op > rates.fee_free_up_to ? rates.referral_pct[cat] : 0) : rates.payment_gateway_pct
  if (rates.channel === 'marketplace') {
    feeLines.push(
      op > rates.fee_free_up_to
        ? { text: `Marketplace referral fee for ${cat.toLowerCase()}`, amount: channelPct, ...k('referral_pct', cat) }
        : { text: `No marketplace referral fee at or below ₹${rates.fee_free_up_to.toLocaleString('en-IN')}`, amount: 0, ...k('fee_free_up_to') },
    )
  } else {
    feeLines.push({ text: 'Payment gateway fee', amount: channelPct, ...k('payment_gateway_pct') })
  }
  if (channelPct) {
    feeLines.push(
      rates.gst_registered
        ? { text: `${rates.gst_on_fees_pct}% GST on the fee — claimable as input tax credit because you’re GST-registered, so not a cost`, amount: 0, ...k('gst_on_fees_pct') }
        : { text: `${rates.gst_on_fees_pct}% GST on the fee (not GST-registered, so it’s a cost)`, amount: r2(channelPct * feeGst), ...k('gst_on_fees_pct') },
    )
  }
  notes.selling_fee_pct = feeLines
  const feePct = r2(feeLines.reduce((s, l) => s + l.amount, 0))

  // ── Handling & shipping (per order; restock and refurbish) ──
  const w = rates.weight_kg[cat]
  const extraSlabs = Math.max(0, Math.ceil(w / 0.5) - 1)
  const first = rates.ship_first_500g[rates.channel]
  const shipBase = first + extraSlabs * rates.ship_extra_500g
  const gstMult = rates.gst_registered ? 1 : 1 + feeGst
  const gstNote = rates.gst_registered ? '' : ' + GST'
  const handlingLines: EstimateLine[] = []
  const wKind = k('weight_kg', cat)
  const shipKind = k('ship_first_500g', rates.channel)
  // Extra 500 g slabs depend on the assumed weight; for your own site the slab rate is Amazon's, used as a proxy.
  const slabKind = extraSlabs ? combine(wKind, rates.channel === 'own_site' ? { kind: 'assumption' } : k('ship_extra_500g')) : null
  const slabText = extraSlabs ? ` (₹${first} + ${extraSlabs} × ₹${rates.ship_extra_500g})` : ` (₹${first})`
  if (rates.channel === 'marketplace') {
    handlingLines.push({ text: `Easy Ship weight handling, ${w} kg packed${slabText}${gstNote}`, amount: r0(shipBase * gstMult), ...(slabKind ? combine(shipKind, slabKind) : shipKind) })
    handlingLines.push({ text: `Closing fee for a ₹${op.toLocaleString('en-IN')} item${gstNote}`, amount: r0(closingFee(op) * gstMult), kind: 'published', source: 'closing_fees' })
  } else {
    handlingLines.push({ text: `Courier, ${w} kg packed${slabText}`, amount: r0(shipBase), ...(slabKind ? combine(shipKind, slabKind) : shipKind) })
  }
  handlingLines.push({ text: `Pick & pack, ${labourText(3)}`, amount: r0(3 * perMin), ...combine(TIME, labourKind) })
  handlingLines.push({ text: 'Packing materials', amount: rates.packing_materials, ...k('packing_materials') })
  notes.handling_cost = handlingLines
  const handling = handlingLines.reduce((s, l) => s + l.amount, 0)

  // ── Restock: sold as new at your own price ──
  const resale = r0(op)
  notes.resale_price = [{ text: 'Your original selling price, sold as new', amount: resale, kind: 'business' }]

  // ── Refurbish: repair each defect once, resell at a markdown ──
  const lab = combine(TIME, labourKind)
  const repairLines: EstimateLine[] = [{ text: `Re-inspection after repair, ${labourText(5)}`, amount: r0(5 * perMin), ...lab }]
  const seen = new Set<string>()
  const defects = dedupe(input.defects)
  const matrix = MATRIX[groupOf(cat)]
  for (const d of defects) {
    const plan = matrix[d.type]?.[d.severity] ?? matrix.other![d.severity]
    const label = `${DEFECT_LABEL[d.type]} (${d.severity})`
    if (plan === 'unfixable') {
      unfixable.push(label)
      continue
    }
    // One outsourced service (e.g. a professional clean) covers every issue it fixes.
    const svcKeyStr = plan.svc?.join('+')
    if (svcKeyStr && seen.has(svcKeyStr)) continue
    if (svcKeyStr) seen.add(svcKeyStr)
    if (plan.min) {
      repairLines.push({ text: `${label}: ${plan.label}${plan.svc ? ' — labour' : ''}, ${labourText(plan.min)}${plan.materials ? ` + ₹${plan.materials} materials` : ''}`, amount: r0(plan.min * perMin + (plan.materials ?? 0)), ...lab })
    } else if (plan.materials) {
      repairLines.push({ text: `${label}: ${plan.label}`, amount: plan.materials, kind: 'assumption' })
    }
    if (plan.svc) {
      const amount = plan.svc.reduce((s, key) => s + (key === 'dry_clean' ? rates.services.dry_clean[cat] : rates.services[key]), 0)
      repairLines.push({ text: `${label}: ${plan.label}${plan.min ? ' — cost of the part' : ''}`, amount, ...combine(...plan.svc.map(svcKind)) })
    }
  }
  if (!defects.length && input.grade === 'B') {
    // Graded B by hand without listing issues: a standard refresh.
    repairLines.push({ text: `Standard refresh (steam, re-tag, repack), ${labourText(10)} + ₹5 tag`, amount: r0(10 * perMin + 5), ...lab })
  }
  let refurbResale = r0((op * rates.refurb_resale_pct) / 100)
  let refurbCost = repairLines.reduce((s, l) => s + l.amount, 0)
  if (unfixable.length) {
    refurbResale = 0
    refurbCost = 0
    notes.refurb_resale_price = [{ text: `Not repairable for resale: ${unfixable.join(', ')}`, amount: 0, kind: 'assumption' }]
    notes.refurb_cost = []
  } else {
    notes.refurb_resale_price = [{ text: `${rates.refurb_resale_pct}% of your price, sold as “minor flaw”`, amount: refurbResale, ...k('refurb_resale_pct') }]
    notes.refurb_cost = repairLines
  }

  // ── Liquidation: a bulk B2B sale (price excludes the GST you invoice the buyer) ──
  const liqKey = input.grade ?? 'ungraded'
  const liqPct = rates.liquidation_pct[liqKey]
  const liqPrice = r0((op * liqPct) / 100)
  notes.liquidation_price = [
    {
      text: `${liqPct}% of your price${input.grade ? ` for ${input.grade === 'MANUAL_REVIEW' ? 'an unreviewed item' : `Grade ${input.grade}`}` : ' (not graded yet)'}, before GST`,
      amount: liqPrice,
      ...k('liquidation_pct', liqKey),
    },
  ]
  const liqLines: EstimateLine[] = [
    { text: `Pack into a bulk lot, ${labourText(3)}`, amount: r0(3 * perMin), ...lab },
    { text: 'Share of bulk freight', amount: rates.liquidation_freight, ...k('liquidation_freight') },
  ]
  if (rates.liquidation_commission_pct) liqLines.push({ text: `Buyer / platform commission ${rates.liquidation_commission_pct}%`, amount: r0((liqPrice * rates.liquidation_commission_pct) / 100), ...k('liquidation_commission_pct') })
  notes.liquidation_fee = liqLines
  const liqFee = liqLines.reduce((s, l) => s + l.amount, 0)

  // ── Recycling ──
  const recValue = r0(w * rates.scrap_per_kg)
  notes.recycling_value = [{ text: `${w} kg × ${inrTxt(rates.scrap_per_kg)}/kg textile scrap`, amount: recValue, ...combine(wKind, k('scrap_per_kg')) }]
  const recLines: EstimateLine[] = [
    { text: `Sort & bag, ${labourText(5)}`, amount: r0(5 * perMin), ...lab },
    { text: 'Share of transport to a recycler', amount: rates.recycle_transport, ...k('recycle_transport') },
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

type Basisable = Pick<ReturnItem, 'value_basis' | EstimateField> & Partial<Pick<ReturnItem, 'decision_route' | 'status'>>

/** The rate-card inputs for an item: its confirmed grade/defects, else the AI's proposal. */
export function estimateInputFor(item: Pick<ReturnItem, 'category' | 'original_price' | 'grade' | 'defects' | 'ai_inspection'>, override?: { grade?: Grade | null; defects?: Defect[] }): EstimateInput {
  const grade = override?.grade !== undefined ? override.grade : item.grade ?? item.ai_inspection?.proposed_grade ?? null
  const defects = override?.defects ?? (item.grade ? item.defects : item.ai_inspection?.defects ?? item.defects)
  return { category: item.category, original_price: item.original_price, grade, defects }
}

/** True once a decision is saved: its values are the record of what was decided, so they're never repriced. */
export function isLocked(item: Partial<Pick<ReturnItem, 'decision_route' | 'status'>>) {
  return !!item.decision_route || item.status === 'completed'
}

/**
 * Patch that (re)fills recovery values from the rate card.
 * Filled: routes already on the rate card, and routes that are still empty.
 * Never touched: the user's own estimates and third-party quotes, and any return
 * with a saved decision (unless `allowDecided`, used when the decision is being cleared).
 * `replaceAi` also replaces values from the older AI-estimate method.
 */
export function ratesPatch(item: Basisable, est: RateEstimate, opts: { replaceAi?: boolean; allowDecided?: boolean } = {}): Partial<ReturnInput> {
  if (isLocked(item) && !opts.allowDecided) return {}
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

/** True when stored values still match the rate card (so the per-line breakdown applies). */
export function matchesRates(item: Pick<ReturnItem, EstimateField>, est: RateEstimate, fields: EstimateField[]) {
  return fields.every((f) => Math.round(Number(item[f]) * 100) === Math.round(est.values[f] * 100))
}

/** Undecided returns whose rate-card values would change under these rates. Decided ones are never included. */
export function repriceable<T extends ReturnItem>(items: T[], rates: RateCard): { item: T; patch: Partial<ReturnInput> }[] {
  const out: { item: T; patch: Partial<ReturnInput> }[] = []
  for (const item of items) {
    if (isLocked(item) || !Object.values(item.value_basis).includes('rates')) continue
    const patch = ratesPatch(item, estimateFromRates(estimateInputFor(item), rates))
    const changes = Object.entries(patch).some(([key, v]) => key !== 'value_basis' && (item as unknown as Record<string, unknown>)[key] !== v)
    if (changes) out.push({ item, patch })
  }
  return out
}
