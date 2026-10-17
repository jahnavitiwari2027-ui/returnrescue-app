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
  | 'amazon_2026'
  | 'flipkart'
  | 'flipkart_fixed'
  | 'flipkart_ship'
  | 'meesho'
  | 'courier'
  | 'speedpost'
  | 'gateway'
  | 'gst_goods'
  | 'wage'
  | 'oncost'
  | 'dryclean'
  | 'shoe'
  | 'tailor'
  | 'tailor_delhi'
  | 'bgrade'
  | 'surplus'
  | 'surplus_delhi'
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
    effective: 'Current fee page',
    used_for: 'Referral fee by category (0% up to ₹1,000), 18% GST on fees.',
  },
  amazon_2026: {
    title: 'Amazon seller fees India 2026: referral, closing & FBA fees',
    publisher: 'Blooprint (secondary source, cites Amazon.in)',
    url: 'https://blooprint.in/blog/amazon-seller-fees-india-explained/',
    effective: 'Published 16 Sep 2026; closing fees from 7 Sep 2026',
    used_for: 'Easy Ship closing fee ₹2 (up to ₹300), ₹23 (₹301–500), ₹48 (₹501–1,000), ₹79 (above ₹1,000). Easy Ship weight handling ₹55 up to 500 g, ₹75 up to 1 kg, ₹112 up to 2 kg, ₹34 per extra kg.',
  },
  flipkart: {
    title: 'Flipkart seller fees & commission 2026: rate card explained',
    publisher: 'Blooprint (secondary source, cites Flipkart Seller Hub)',
    url: 'https://blooprint.in/blog/flipkart-seller-fees-explained/',
    effective: 'Fee schedule checked 18 Sep 2026; fashion change from 8 Jul 2026',
    used_for: 'Fashion pays 0% commission at any price; local and zonal shipping is free under 500 g; no collection fee on prepaid orders. Flipkart shows exact fixed and shipping fees only inside Seller Hub.',
  },
  flipkart_fixed: {
    title: 'Flipkart seller fees 2026: complete cost breakdown',
    publisher: 'Brand Chanakya (secondary source)',
    url: 'https://brandchanakya.in/flipkart-seller-commission-fees/',
    effective: 'Published 29 Jul 2026',
    used_for: 'Fixed fee roughly ₹8–35 per order by price slab and seller tier (we use the ₹22 midpoint).',
  },
  flipkart_ship: {
    title: 'Flipkart fee revision November 2025',
    publisher: 'Rekonsile (secondary source)',
    url: 'https://rekonsile.com/flipkart-fee-revision-november-2025-complete-guide',
    effective: 'Updated 25 Nov 2025',
    used_for: 'National shipping under 500 g ₹16; local and zonal under 500 g free.',
  },
  meesho: {
    title: 'Meesho commission & seller fees',
    publisher: 'GoNukkad (secondary source)',
    url: 'https://www.gonukkad.com/blog/meesho-commission-seller-fees',
    effective: 'Published 24 Mar 2026 (shipping rates are 2026 estimates)',
    used_for: '0% commission and no fixed or closing fee. Shipping is deducted from your payout: under 500 g ₹35–45 local, ₹45–70 regional, ₹55–90 national; 500 g–1 kg ₹50–70 / ₹65–95 / ₹80–120; 1–2 kg ₹60–85 / ₹80–120 / ₹100–150, plus 18% GST. We use each midpoint.',
  },
  courier: {
    title: 'Shipping plans & pricing',
    publisher: 'Shiprocket',
    url: 'https://shiprocket.in/pricing/',
    effective: 'Current pricing page',
    used_for: 'Free (Lite) plan: average shipment cost ₹45.',
  },
  speedpost: {
    title: 'Speed Post charges 2026',
    publisher: 'Shiprocket (secondary source, India Post tariff)',
    url: 'https://www.shiprocket.in/blog/speed-post-charges/',
    effective: 'Published 4 Dec 2025 (tariff excludes taxes)',
    used_for: 'Speed Post 251–500 g: ₹28 local, ₹70 up to 200 km, ₹93 above 2,000 km.',
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
  tailor_delhi: {
    title: 'Tailors in Delhi: doorstep alterations',
    publisher: 'RunTailor',
    url: 'https://www.runtailor.com/tailors-in/delhi',
    effective: 'Current Delhi price list (starting prices)',
    used_for: 'Tear fixing & damage repair from ₹89; open & re-stitch from ₹449.',
  },
  bgrade: {
    title: 'B-grade products explained',
    publisher: 'Liquidation Stock (secondary source)',
    url: 'https://liquidationstock.com/blogs/guides/b-grade-products-explained-how-resellers-can-maximize-profit-margins',
    effective: 'Published 12 Nov 2025',
    used_for: 'Most B-grade goods sell 20–50% below new (we use 50% of the price, the low end of what you receive). The same guide lists apparel at 50–80% off through resellers, so lower this if you clear stock that way.',
  },
  surplus: {
    title: 'The surpassing surplus business',
    publisher: 'Apparel Resources',
    url: 'https://apparelresources.com/business-news/retail/surpassing-surplus-business/',
    effective: 'Industry article (undated)',
    used_for: 'Unsold branded stock sells to surplus buyers for 20–30% of its original value (we use 20%).',
  },
  surplus_delhi: {
    title: 'Surplus garments in Delhi',
    publisher: 'IndiaMART listings',
    url: 'https://m.indiamart.com/city/delhi/surplus-garments.html',
    effective: 'Listings checked 17 Oct 2026',
    used_for: 'Market check: 22 Delhi NCR listings of adult surplus clothing ask ₹50–490 a piece (median ₹109). Traders pay sellers less than they ask.',
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

// ─────────────────────────── Platforms ───────────────────────────

export type PlatformKey = 'amazon' | 'flipkart' | 'meesho' | 'own_site'
export const PLATFORMS: PlatformKey[] = ['amazon', 'flipkart', 'meesho', 'own_site']
export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  amazon: 'Amazon.in',
  flipkart: 'Flipkart',
  meesho: 'Meesho',
  own_site: 'Your own website',
}

/**
 * Where a return will be resold, and anything the seller set by hand for it.
 * Fields left out are worked out from the rate card.
 */
export interface SaleSetup {
  platform: PlatformKey
  /** GST rate on the sale (%), when the seller sets it instead of the automatic rate. */
  gst_pct?: number
  /** Commission, referral or gateway fee (% of the price), when set by hand. */
  commission_pct?: number
  /** Closing or fixed fee (₹ per order), when set by hand. */
  fixed_fee?: number
  /** A delivery preset id (see deliveryPresets). Left out = picked by packed weight. */
  delivery?: string
  /** A delivery charge (₹ per order) typed by the seller. Wins over a preset. */
  delivery_custom?: number
}

export const GST_CHOICES = [0, 5, 18] as const

// ─────────────────────────── Rate card ───────────────────────────

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
  /** Used for new returns, and for returns saved before platforms existed. */
  default_sale: SaleSetup
  /** GST-registered sellers keep the price minus GST, and can claim GST on fees back as input tax credit. */
  gst_registered: boolean
  goods_gst_threshold: number
  goods_gst_low_pct: number
  goods_gst_high_pct: number
  bags_gst_pct: number
  gst_on_fees_pct: number
  // Amazon.in (Easy Ship)
  /** Referral fee % by category, charged when the price is above fee_free_up_to. */
  referral_pct: Record<Category, number>
  fee_free_up_to: number
  amazon_closing_fee: { up_to_300: number; up_to_500: number; up_to_1000: number; above_1000: number }
  amazon_weight_handling: { up_to_500g: number; up_to_1kg: number; up_to_2kg: number; per_extra_kg: number }
  // Flipkart
  flipkart_commission_pct: number
  flipkart_fixed_fee: number
  flipkart_shipping: { local_zonal_500g: number; national_500g: number }
  // Meesho
  meesho_commission_pct: number
  meesho_shipping: {
    local_500g: number
    regional_500g: number
    national_500g: number
    local_1kg: number
    regional_1kg: number
    national_1kg: number
    local_2kg: number
    regional_2kg: number
    national_2kg: number
  }
  // Your own website
  payment_gateway_pct: number
  courier_first_500g: number
  courier_extra_500g: number
  // Costs
  labour_per_hour: number
  packing_materials: number
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
  default_sale: { platform: 'amazon' },
  gst_registered: true,
  goods_gst_threshold: 2500,
  goods_gst_low_pct: 5,
  goods_gst_high_pct: 18,
  bags_gst_pct: 18,
  gst_on_fees_pct: 18,
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
  amazon_closing_fee: { up_to_300: 2, up_to_500: 23, up_to_1000: 48, above_1000: 79 },
  amazon_weight_handling: { up_to_500g: 55, up_to_1kg: 75, up_to_2kg: 112, per_extra_kg: 34 },
  flipkart_commission_pct: 0,
  flipkart_fixed_fee: 22,
  flipkart_shipping: { local_zonal_500g: 0, national_500g: 16 },
  meesho_commission_pct: 0,
  // Midpoints of the seller-reported ranges.
  meesho_shipping: {
    local_500g: 40,
    regional_500g: 58,
    national_500g: 73,
    local_1kg: 60,
    regional_1kg: 80,
    national_1kg: 100,
    local_2kg: 73,
    regional_2kg: 100,
    national_2kg: 125,
  },
  payment_gateway_pct: 2,
  courier_first_500g: 45,
  courier_extra_500g: 17,
  labour_per_hour: 103, // ₹88.75 wage + 16.25% employer PF/ESI
  packing_materials: 15,
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
  refurb_resale_pct: 50,
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
    tailor_small_repair: 89,
    tailor_repair: 449,
    seam_repair: 700,
    zip_replace: 500,
    zip_replace_major: 700,
    shoe_box: 40,
  },
}

type Meta = { kind: InputKind; source?: SourceKey }

/** Where each default comes from. Anything not listed as published is an assumption. */
const SCALAR_META: Partial<Record<keyof RateCard, Meta>> = {
  goods_gst_threshold: { kind: 'published', source: 'gst_goods' },
  goods_gst_low_pct: { kind: 'published', source: 'gst_goods' },
  goods_gst_high_pct: { kind: 'published', source: 'gst_goods' },
  bags_gst_pct: { kind: 'assumption' },
  gst_on_fees_pct: { kind: 'published', source: 'amazon_fees' },
  referral_pct: { kind: 'published', source: 'amazon_fees' },
  fee_free_up_to: { kind: 'published', source: 'amazon_fees' },
  amazon_closing_fee: { kind: 'published', source: 'amazon_2026' },
  amazon_weight_handling: { kind: 'published', source: 'amazon_2026' },
  flipkart_commission_pct: { kind: 'published', source: 'flipkart' },
  // Flipkart publishes fixed fees only inside Seller Hub; secondary sources give a range.
  flipkart_fixed_fee: { kind: 'assumption', source: 'flipkart_fixed' },
  meesho_commission_pct: { kind: 'published', source: 'meesho' },
  meesho_shipping: { kind: 'published', source: 'meesho' },
  payment_gateway_pct: { kind: 'published', source: 'gateway' },
  courier_first_500g: { kind: 'published', source: 'courier' },
  courier_extra_500g: { kind: 'assumption' },
  labour_per_hour: { kind: 'published', source: 'wage' },
  packing_materials: { kind: 'assumption' },
  weight_kg: { kind: 'assumption' },
  refurb_resale_pct: { kind: 'published', source: 'bgrade' },
  liquidation_commission_pct: { kind: 'assumption' },
  liquidation_freight: { kind: 'assumption' },
  scrap_per_kg: { kind: 'published', source: 'scrap' },
  recycle_transport: { kind: 'assumption' },
}

const SERVICE_META: Record<SvcKey | 'dry_clean', Meta> = {
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
  tailor_small_repair: { kind: 'published', source: 'tailor_delhi' },
  tailor_repair: { kind: 'published', source: 'tailor_delhi' },
  seam_repair: { kind: 'published', source: 'tailor' },
  zip_replace: { kind: 'published', source: 'tailor' },
  zip_replace_major: { kind: 'published', source: 'tailor' },
  shoe_box: { kind: 'assumption' },
}

/** Meta for a rate-card path, e.g. ['liquidation_pct','A'] or ['services','shoe_clean']. Used by the Rates page. */
export function rateMeta(path: string[]): Meta {
  if (path[0] === 'services') return SERVICE_META[path[1] as SvcKey | 'dry_clean'] ?? { kind: 'assumption' }
  if (path[0] === 'liquidation_pct') return path[1] === 'A' ? { kind: 'published', source: 'surplus' } : { kind: 'assumption' }
  if (path[0] === 'flipkart_shipping') return path[1] === 'national_500g' ? { kind: 'published', source: 'flipkart_ship' } : { kind: 'published', source: 'flipkart' }
  return SCALAR_META[path[0] as keyof RateCard] ?? { kind: 'assumption' }
}

const at = (obj: unknown, path: string[]): unknown => path.reduce<unknown>((o, k) => (isObj(o) ? o[k] : undefined), obj)

/** Meta for a path in a rate card: the default's meta, or 'business' once the business changed it. */
export function metaIn(rates: RateCard, path: string[]): Meta {
  return at(rates, path) === at(DEFAULT_RATES, path) ? rateMeta(path) : { kind: 'business' }
}

/** The assumptions in the default rate card, in plain words. */
export const ASSUMPTIONS: string[] = [
  'Liquidation: Grade B at 15%, Grade C and unreviewed items at 10%, ungraded at 15% of the original price — below the 20% low end that surplus buyers pay for unsold stock, because returns are used or damaged. Your own completed sales can replace these (see “From your own results”).',
  'Liquidation commission 0% (add your platform’s rate) and bulk freight ₹15 per unit.',
  'Flipkart fixed fee ₹22 per order: the midpoint of the ₹8–35 range reported for 2026. Flipkart shows the exact fee only in Seller Hub.',
  'Flipkart parcels over 500 g: Flipkart doesn’t publish these rates, so we use the own-website courier rate.',
  'Meesho and Flipkart shipping use the national zone unless you pick another, because the buyer’s location isn’t known in advance.',
  'Bags and accessories GST 18% — check your product’s HSN code.',
  'Packing materials ₹15 per unit (polybag, label, tissue); replacement shoebox ₹40.',
  'Packed weight per item (0.15–1 kg by category).',
  'In-house task times: steaming 5–10 min, spot clean 10 min, re-tag or repack 3 min, re-inspection 5 min. The hourly labour rate itself is sourced.',
  'Own-website courier: ₹17 per extra 500 g (half of Amazon’s ₹34 per extra kg, used as a proxy).',
  'Recycling transport ₹10 per unit (share of a bulk drop).',
]

// ─────────────────────── Overrides (stored per workspace) ───────────────────────

export type RateOverrides = Partial<Omit<RateCard, 'services'>> & { services?: Partial<ServicePrices> }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const okNum = (v: unknown, max = 1_000_000) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max

/** A sale setup from storage or a form, with anything malformed dropped. Null if it has no valid platform. */
export function sanitizeSale(v: unknown): SaleSetup | null {
  if (!isObj(v) || !PLATFORMS.includes(v.platform as PlatformKey)) return null
  const out: SaleSetup = { platform: v.platform as PlatformKey }
  if (okNum(v.gst_pct, 28)) out.gst_pct = v.gst_pct as number
  if (okNum(v.commission_pct, 100)) out.commission_pct = v.commission_pct as number
  if (okNum(v.fixed_fee, 100_000)) out.fixed_fee = v.fixed_fee as number
  if (typeof v.delivery === 'string' && /^[a-z0-9_]{1,40}$/.test(v.delivery)) out.delivery = v.delivery
  if (okNum(v.delivery_custom, 100_000)) out.delivery_custom = v.delivery_custom as number
  return out
}

/** Merge saved overrides onto the defaults, ignoring anything malformed or out of range. */
export function resolveRates(overrides: unknown): RateCard {
  const out: RateCard = JSON.parse(JSON.stringify(DEFAULT_RATES))
  if (!isObj(overrides)) return out
  const o = overrides as Record<string, unknown>
  const sale = sanitizeSale(o.default_sale)
  if (sale) out.default_sale = sale
  else if (o.channel === 'own_site') out.default_sale = { platform: 'own_site' } // saved before platforms existed
  if (typeof o.gst_registered === 'boolean') out.gst_registered = o.gst_registered
  const pctKeys = ['payment_gateway_pct', 'gst_on_fees_pct', 'refurb_resale_pct', 'liquidation_commission_pct', 'goods_gst_low_pct', 'goods_gst_high_pct', 'bags_gst_pct', 'flipkart_commission_pct', 'meesho_commission_pct'] as const
  for (const k of pctKeys) if (okNum(o[k], 100)) out[k] = o[k] as number
  const numKeys = ['fee_free_up_to', 'labour_per_hour', 'packing_materials', 'scrap_per_kg', 'recycle_transport', 'liquidation_freight', 'goods_gst_threshold', 'flipkart_fixed_fee', 'courier_first_500g', 'courier_extra_500g'] as const
  for (const k of numKeys) if (okNum(o[k])) out[k] = o[k] as number
  // Older saved keys: one shipping table shared by Amazon and the own website.
  const legacyShip = o.ship_first_500g
  if (isObj(legacyShip)) {
    if (okNum(legacyShip.own_site) && !okNum(o.courier_first_500g)) out.courier_first_500g = legacyShip.own_site as number
    if (okNum(legacyShip.marketplace) && !isObj(o.amazon_weight_handling)) out.amazon_weight_handling.up_to_500g = legacyShip.marketplace as number
  }
  if (okNum(o.ship_extra_500g) && !okNum(o.courier_extra_500g)) out.courier_extra_500g = o.ship_extra_500g as number
  const mergeMap = <T extends object>(target: T, src: unknown, max?: number) => {
    if (!isObj(src)) return
    const t = target as Record<string, number>
    for (const k of Object.keys(t)) if (okNum(src[k], max)) t[k] = src[k] as number
  }
  mergeMap(out.referral_pct, o.referral_pct, 100)
  mergeMap(out.weight_kg, o.weight_kg, 50)
  mergeMap(out.liquidation_pct, o.liquidation_pct, 100)
  mergeMap(out.amazon_closing_fee, o.amazon_closing_fee)
  mergeMap(out.amazon_weight_handling, o.amazon_weight_handling)
  mergeMap(out.flipkart_shipping, o.flipkart_shipping)
  mergeMap(out.meesho_shipping, o.meesho_shipping)
  if (isObj(o.services)) {
    const s = o.services
    for (const k of Object.keys(out.services) as (keyof ServicePrices)[]) {
      if (k === 'dry_clean') mergeMap(out.services.dry_clean, s.dry_clean)
      else if (okNum(s[k])) out.services[k] = s[k] as number
    }
  }
  return out
}

const sameSale = (a: SaleSetup, b: SaleSetup) => JSON.stringify(sanitizeSale(a)) === JSON.stringify(sanitizeSale(b))

/** Only the values that differ from the defaults — what gets stored. */
export function diffRates(r: RateCard): RateOverrides {
  const d = DEFAULT_RATES
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(d) as (keyof RateCard)[]) {
    if (k === 'default_sale') {
      if (!sameSale(d.default_sale, r.default_sale)) out.default_sale = sanitizeSale(r.default_sale)
      continue
    }
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
  /** Context only (e.g. a market check): not part of the figure, and shown without an amount. */
  info?: boolean
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
  /** Where it will be resold; null uses the rate card's default. */
  sale?: SaleSetup | null
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

/** GST rate on the goods themselves, by category and price. */
export function goodsGstPct(category: Category, price: number, rates: RateCard = DEFAULT_RATES) {
  if (category === 'Bags & accessories') return rates.bags_gst_pct
  return price > rates.goods_gst_threshold ? rates.goods_gst_high_pct : rates.goods_gst_low_pct
}

const extraSlabs = (w: number) => Math.max(0, Math.ceil(w / 0.5 - 1e-9) - 1)
const g = (w: number) => `${w.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`

export interface DeliveryPreset {
  id: string
  label: string
  /** ₹ per order, before GST. */
  amount: number
  kind: InputKind
  source?: SourceKey
}

/** Delivery options for a platform and packed weight, and the one picked automatically. */
export function deliveryPresets(platform: PlatformKey, weightKg: number, rates: RateCard = DEFAULT_RATES): { presets: DeliveryPreset[]; auto: string } {
  const w = Math.max(0, weightKg)
  const m = (path: string[]) => metaIn(rates, path)
  const courier = (wt: number): DeliveryPreset => {
    const n = extraSlabs(wt)
    const amount = rates.courier_first_500g + n * rates.courier_extra_500g
    const meta = n ? combine(m(['courier_first_500g']), m(['courier_extra_500g'])) : m(['courier_first_500g'])
    return { id: 'courier', label: n ? `Courier, ${g(wt)} (₹${rates.courier_first_500g} + ${n} × ₹${rates.courier_extra_500g})` : 'Courier, up to 500 g (Shiprocket free-plan average)', amount, ...meta }
  }
  if (platform === 'amazon') {
    const wh = rates.amazon_weight_handling
    const presets: DeliveryPreset[] = [
      { id: 'amz_500g', label: 'Up to 500 g', amount: wh.up_to_500g, ...m(['amazon_weight_handling', 'up_to_500g']) },
      { id: 'amz_1kg', label: '500 g – 1 kg', amount: wh.up_to_1kg, ...m(['amazon_weight_handling', 'up_to_1kg']) },
      { id: 'amz_2kg', label: '1 – 2 kg', amount: wh.up_to_2kg, ...m(['amazon_weight_handling', 'up_to_2kg']) },
    ]
    if (w > 2) {
      const extra = Math.ceil(w - 2 - 1e-9)
      presets.push({ id: 'amz_heavy', label: `${g(w)} (₹${wh.up_to_2kg} + ${extra} × ₹${wh.per_extra_kg})`, amount: wh.up_to_2kg + extra * wh.per_extra_kg, ...combine(m(['amazon_weight_handling', 'up_to_2kg']), m(['amazon_weight_handling', 'per_extra_kg'])) })
    }
    return { presets, auto: w <= 0.5 ? 'amz_500g' : w <= 1 ? 'amz_1kg' : w <= 2 ? 'amz_2kg' : 'amz_heavy' }
  }
  if (platform === 'flipkart') {
    if (w > 0.5) return { presets: [{ ...courier(w), id: 'fk_heavier', label: `Over 500 g — not published by Flipkart, courier estimate for ${g(w)}`, kind: 'assumption' }], auto: 'fk_heavier' }
    const fs = rates.flipkart_shipping
    return {
      presets: [
        { id: 'fk_local', label: 'Local or zonal, under 500 g', amount: fs.local_zonal_500g, ...m(['flipkart_shipping', 'local_zonal_500g']) },
        { id: 'fk_national', label: 'National, under 500 g', amount: fs.national_500g, ...m(['flipkart_shipping', 'national_500g']) },
      ],
      auto: 'fk_national',
    }
  }
  if (platform === 'meesho') {
    const band = w <= 0.5 ? '500g' : w <= 1 ? '1kg' : '2kg'
    const bandLabel = band === '500g' ? 'under 500 g' : band === '1kg' ? '500 g – 1 kg' : w <= 2 ? '1 – 2 kg' : '1 – 2 kg rate (heavier parcels cost more)'
    const ms = rates.meesho_shipping as Record<string, number>
    const zone = (z: 'local' | 'regional' | 'national', label: string): DeliveryPreset => ({ id: `ms_${z}`, label: `${label}, ${bandLabel}`, amount: ms[`${z}_${band}`], ...m(['meesho_shipping', `${z}_${band}`]) })
    return { presets: [zone('local', 'Local'), zone('regional', 'Regional'), zone('national', 'National')], auto: 'ms_national' }
  }
  const presets: DeliveryPreset[] = [courier(w)]
  if (w <= 0.5) {
    presets.push(
      { id: 'sp_local', label: 'Speed Post, local, up to 500 g', amount: 28, kind: 'published', source: 'speedpost' },
      { id: 'sp_200', label: 'Speed Post, up to 200 km, up to 500 g', amount: 70, kind: 'published', source: 'speedpost' },
      { id: 'sp_far', label: 'Speed Post, above 2,000 km, up to 500 g', amount: 93, kind: 'published', source: 'speedpost' },
    )
  }
  return { presets, auto: 'courier' }
}

export interface PlatformFees {
  platform: PlatformKey
  gst: { pct: number; auto: number; set: boolean; meta: Meta }
  commission: { label: string; pct: number; auto: number; set: boolean; meta: Meta }
  /** Null when the platform has no fixed fee and none was set. */
  fixed: { label: string; amount: number; auto: number; set: boolean; meta: Meta } | null
  delivery: { label: string; amount: number; chosen: string; presets: DeliveryPreset[]; auto: string; meta: Meta }
}

const CUSTOM = 'custom'

/** Every fee for selling one item on a platform: automatic values, and what the seller set by hand. */
export function platformFees(category: Category, price: number, sale: SaleSetup, rates: RateCard = DEFAULT_RATES): PlatformFees {
  const p = sale.platform
  const op = Math.max(0, price)
  const m = (path: string[]) => metaIn(rates, path)
  const BIZ: Meta = { kind: 'business' }

  const gstAuto = rates.gst_registered ? goodsGstPct(category, op, rates) : 0
  const gstMeta = !rates.gst_registered ? BIZ : category === 'Bags & accessories' ? m(['bags_gst_pct']) : m([op > rates.goods_gst_threshold ? 'goods_gst_high_pct' : 'goods_gst_low_pct'])
  const gst = sale.gst_pct !== undefined ? { pct: sale.gst_pct, auto: gstAuto, set: true, meta: BIZ } : { pct: gstAuto, auto: gstAuto, set: false, meta: gstMeta }

  let cLabel: string
  let cAuto: number
  let cMeta: Meta
  if (p === 'amazon') {
    const charged = op > rates.fee_free_up_to
    cLabel = charged ? `Amazon referral fee for ${category.toLowerCase()}` : `Amazon referral fee (none at or below ₹${rates.fee_free_up_to.toLocaleString('en-IN')})`
    cAuto = charged ? rates.referral_pct[category] : 0
    cMeta = charged ? m(['referral_pct', category]) : m(['fee_free_up_to'])
  } else if (p === 'flipkart') {
    cLabel = 'Flipkart commission (fashion)'
    cAuto = rates.flipkart_commission_pct
    cMeta = m(['flipkart_commission_pct'])
  } else if (p === 'meesho') {
    cLabel = 'Meesho commission'
    cAuto = rates.meesho_commission_pct
    cMeta = m(['meesho_commission_pct'])
  } else {
    cLabel = 'Payment gateway fee'
    cAuto = rates.payment_gateway_pct
    cMeta = m(['payment_gateway_pct'])
  }
  const commission = sale.commission_pct !== undefined ? { label: cLabel.replace(/ \(none.*\)$/, ''), pct: sale.commission_pct, auto: cAuto, set: true, meta: BIZ } : { label: cLabel, pct: cAuto, auto: cAuto, set: false, meta: cMeta }

  let fixed: PlatformFees['fixed'] = null
  let fAuto: { label: string; amount: number; meta: Meta } | null = null
  if (p === 'amazon') {
    const cf = rates.amazon_closing_fee
    const band = op <= 300 ? 'up_to_300' : op <= 500 ? 'up_to_500' : op <= 1000 ? 'up_to_1000' : 'above_1000'
    fAuto = { label: `Amazon closing fee for a ₹${op.toLocaleString('en-IN')} item`, amount: cf[band], meta: m(['amazon_closing_fee', band]) }
  } else if (p === 'flipkart') {
    fAuto = { label: 'Flipkart fixed fee', amount: rates.flipkart_fixed_fee, meta: m(['flipkart_fixed_fee']) }
  } else if (p === 'meesho') {
    fAuto = { label: 'Meesho has no fixed or closing fee', amount: 0, meta: { kind: 'published', source: 'meesho' } }
  }
  if (sale.fixed_fee !== undefined) fixed = { label: p === 'amazon' ? 'Closing fee' : 'Fixed fee per order', amount: sale.fixed_fee, auto: fAuto?.amount ?? 0, set: true, meta: BIZ }
  else if (fAuto) fixed = { ...fAuto, auto: fAuto.amount, set: false }

  const w = rates.weight_kg[category]
  const { presets, auto } = deliveryPresets(p, w, rates)
  const dLabel = p === 'amazon' ? 'Easy Ship weight handling' : p === 'flipkart' ? 'Flipkart shipping' : p === 'meesho' ? 'Meesho shipping, deducted from your payout' : 'Delivery'
  let delivery: PlatformFees['delivery']
  if (sale.delivery_custom !== undefined) {
    delivery = { label: `${dLabel}: your amount`, amount: sale.delivery_custom, chosen: CUSTOM, presets, auto, meta: BIZ }
  } else {
    const chosen = presets.find((x) => x.id === sale.delivery) ?? presets.find((x) => x.id === auto)!
    const picked = chosen.id !== auto || sale.delivery === chosen.id
    // Picked automatically from the assumed packed weight, so it's only as firm as that assumption.
    const meta: Meta = picked ? { kind: chosen.kind, source: chosen.source } : combine(m(['weight_kg', category]), { kind: chosen.kind, source: chosen.source })
    delivery = { label: `${dLabel}: ${chosen.label}${picked ? '' : ` (packed weight ${g(w)})`}`, amount: chosen.amount, chosen: chosen.id, presets, auto, meta }
  }
  return { platform: p, gst, commission, fixed, delivery }
}

/** The sale setup that applies to a return: its own, else the rate card's default. */
export function saleOf(sale: unknown, rates: RateCard = DEFAULT_RATES): SaleSetup {
  return sanitizeSale(sale) ?? rates.default_sale
}

/** Approximate fees on one item for a platform, in ₹ — for the platform picker. */
export function feeSummary(category: Category, price: number, sale: SaleSetup, rates: RateCard = DEFAULT_RATES): { fees: number; delivery: number } {
  const f = platformFees(category, price, sale, rates)
  const feeGst = rates.gst_registered ? 1 : 1 + rates.gst_on_fees_pct / 100
  return {
    fees: Math.round(((price * f.commission.pct) / 100 + (f.fixed?.amount ?? 0)) * feeGst),
    delivery: Math.round(f.delivery.amount * feeGst),
  }
}

export function estimateFromRates(input: EstimateInput, rates: RateCard = DEFAULT_RATES): RateEstimate {
  const D = DEFAULT_RATES
  const cat = (CATEGORIES as readonly string[]).includes(input.category) ? input.category : 'Topwear'
  const op = Math.max(0, Number(input.original_price) || 0)
  const perMin = rates.labour_per_hour / 60
  const feeGst = rates.gst_on_fees_pct / 100
  const notes: RateEstimate['notes'] = {}
  const unfixable: string[] = []
  const sale = saleOf(input.sale, rates)

  /** Kind of a scalar rate: 'business' once the business changed it from the default. */
  const k = (key: keyof RateCard, sub?: string): Meta => metaIn(rates, sub ? [key, sub] : [key])
  const svcKind = (s: SvcKey | 'dry_clean'): Meta => {
    const changed = s === 'dry_clean' ? rates.services.dry_clean[cat] !== D.services.dry_clean[cat] : rates.services[s] !== D.services[s]
    return changed ? { kind: 'business' } : SERVICE_META[s]
  }
  const labourKind = k('labour_per_hour')
  const labourText = (min: number) => `${min} min at ₹${rates.labour_per_hour}/h`
  const w = rates.weight_kg[cat]
  const wKind = k('weight_kg', cat)
  const pf = platformFees(cat, op, sale, rates)
  const platform = PLATFORM_LABEL[sale.platform]

  // ── Selling deductions (% of the price the customer pays) ──
  // GST on the sale goes to the government; commission or gateway fees go to the channel.
  // A GST-registered seller claims GST on those fees back as input tax credit, so it isn't a cost.
  const feeLines: EstimateLine[] = []
  if (pf.gst.pct > 0) {
    const share = r2((pf.gst.pct / (100 + pf.gst.pct)) * 100)
    feeLines.push({ text: `GST on the sale: ${pf.gst.pct}% is included in the price, so ${share}% of it goes to GST${pf.gst.set ? ' (rate you set)' : ''}`, amount: share, ...pf.gst.meta })
  } else if (pf.gst.set) {
    feeLines.push({ text: 'GST on the sale: 0% (rate you set)', amount: 0, ...pf.gst.meta })
  }
  feeLines.push({ text: `${pf.commission.label}${pf.commission.set ? ' (rate you set)' : ''}`, amount: pf.commission.pct, ...pf.commission.meta })
  const channelPct = pf.commission.pct
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
  const gstMult = rates.gst_registered ? 1 : 1 + feeGst
  const gstNote = rates.gst_registered ? '' : ' + GST'
  const handlingLines: EstimateLine[] = []
  if (pf.fixed) handlingLines.push({ text: `${pf.fixed.label}${pf.fixed.set ? ' (amount you set)' : ''}${pf.fixed.amount ? gstNote : ''}`, amount: r0(pf.fixed.amount * gstMult), ...pf.fixed.meta })
  handlingLines.push({ text: `${pf.delivery.label}${pf.delivery.amount ? gstNote : ''}`, amount: r0(pf.delivery.amount * gstMult), ...pf.delivery.meta })
  handlingLines.push({ text: `Pick & pack, ${labourText(3)}`, amount: r0(3 * perMin), ...combine(TIME, labourKind) })
  handlingLines.push({ text: 'Packing materials', amount: rates.packing_materials, ...k('packing_materials') })
  notes.handling_cost = handlingLines
  const handling = handlingLines.reduce((s, l) => s + l.amount, 0)
  // ── Restock: sold as new at your own price ──
  const resale = r0(op)
  notes.resale_price = [{ text: `Your original selling price, sold as new on ${platform}`, amount: resale, kind: 'business' }]

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
  if (groupOf(cat) === 'apparel') {
    notes.liquidation_price.push({ text: 'Market check: Delhi surplus-clothing listings ask ₹50–490 a piece (median ₹109); traders pay you less than they ask', amount: 0, kind: 'published', source: 'surplus_delhi', info: true })
  }
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
export function estimateInputFor(
  item: Pick<ReturnItem, 'category' | 'original_price' | 'grade' | 'defects' | 'ai_inspection'> & { sale_setup?: SaleSetup | null },
  override?: { grade?: Grade | null; defects?: Defect[] },
): EstimateInput {
  const grade = override?.grade !== undefined ? override.grade : item.grade ?? item.ai_inspection?.proposed_grade ?? null
  const defects = override?.defects ?? (item.grade ? item.defects : item.ai_inspection?.defects ?? item.defects)
  return { category: item.category, original_price: item.original_price, grade, defects, sale: item.sale_setup ?? null }
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
