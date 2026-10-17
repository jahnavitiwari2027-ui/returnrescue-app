// Fictional sample returns for the demo workspace. Every record is marked
// `is_sample` and every brand/product name is invented. Grades and defects on
// these records were entered by hand as sample data — they are NOT AI output.
// Their recovery values are worked out from the default rate card.

import { DEFAULT_RATES, estimateFromRates, estimateInputFor, ratesPatch } from '../lib/rates'
import { calculateRecovery } from '../lib/recovery'
import { emptyReturnInput, type ReturnItem, type ReturnInput } from '../lib/types'

type Seed = Partial<ReturnInput> & { name: string; sku: string; daysAgo: number }

const seeds: Seed[] = [
  {
    name: 'Harbor Linen Overshirt',
    sku: 'SAMPLE-TOP-0142',
    category: 'Topwear',
    original_price: 1899,
    return_reason: 'Size / fit issue',
    condition_notes: 'Customer says it was tried on once. Tags attached, folded in original polybag.',
    photos: ['/demo/overshirt.svg'],
    return_shipping_cost: 95,
    status: 'inspected',
    grade: 'A',
    grade_source: 'manual',
    grade_note: 'Sample record: graded by hand for the demo.',
    daysAgo: 3,
  },
  {
    name: 'Nimbus Canvas Low-top Sneakers',
    sku: 'SAMPLE-FTW-0311',
    category: 'Footwear',
    original_price: 2999,
    return_reason: 'Changed mind',
    condition_notes: 'Light scuffs on the left toe cap, box corner crushed.',
    photos: ['/demo/sneaker.svg'],
    return_shipping_cost: 120,
    status: 'decided',
    grade: 'B',
    grade_source: 'manual',
    grade_note: 'Sample record: graded by hand for the demo.',
    defects: [
      { type: 'scuff_or_scratch', description: 'Light scuffs on left toe cap', severity: 'minor', source: 'manual' },
      { type: 'packaging_damage', description: 'Shoebox corner crushed', severity: 'minor', source: 'manual' },
    ],
    decision_route: 'refurbish',
    decision_reason: 'Highest estimated net for Grade B.',
    daysAgo: 9,
  },
  {
    name: 'Indigo Block-print Cotton Kurta',
    sku: 'SAMPLE-ETH-0207',
    category: 'Ethnic wear',
    original_price: 1499,
    return_reason: 'Not as described',
    condition_notes: 'Customer felt the colour was darker than the listing photo. Not yet opened by the warehouse.',
    photos: ['/demo/kurta.svg'],
    return_shipping_cost: 90,
    status: 'awaiting_inspection',
    daysAgo: 1,
  },
  {
    name: 'Coastline High-rise Denim',
    sku: 'SAMPLE-BTM-0458',
    category: 'Bottomwear',
    original_price: 2299,
    return_reason: 'Defective / damaged on arrival',
    condition_notes: 'Oil-type stain on right thigh, about 3 cm. Customer reports it arrived like this.',
    photos: ['/demo/jeans.svg'],
    return_shipping_cost: 110,
    status: 'decided',
    grade: 'C',
    grade_source: 'manual',
    grade_note: 'Sample record: graded by hand for the demo.',
    defects: [{ type: 'stain', description: 'Oil-type stain on right thigh (~3 cm)', severity: 'major', source: 'manual' }],
    decision_route: 'liquidate',
    decision_reason: 'Stain unlikely to lift; liquidation beats recycling.',
    daysAgo: 16,
  },
  {
    name: 'Stride Seamless Running Tights',
    sku: 'SAMPLE-ACT-0093',
    category: 'Activewear',
    original_price: 1299,
    return_reason: 'Size / fit issue',
    condition_notes: 'Customer returned in original pouch. Needs inspection for signs of wear.',
    photos: ['/demo/tights.svg'],
    return_shipping_cost: 85,
    status: 'awaiting_inspection',
    daysAgo: 5,
  },
  {
    name: 'Marigold Wrap Midi Dress',
    sku: 'SAMPLE-DRS-0175',
    category: 'Dresses',
    original_price: 2599,
    return_reason: 'Wrong item delivered',
    condition_notes: 'Unopened — customer received the wrong size and sent it straight back.',
    photos: ['/demo/dress.svg'],
    return_shipping_cost: 100,
    status: 'completed',
    grade: 'A',
    grade_source: 'manual',
    grade_note: 'Sample record: graded by hand for the demo.',
    decision_route: 'restock',
    decision_reason: 'Unopened, restocked at full price.',
    realized_amount: 2050,
    daysAgo: 30,
  },
  {
    name: 'Atelier Leather Tote',
    sku: 'SAMPLE-BAG-0061',
    category: 'Bags & accessories',
    original_price: 3499,
    return_reason: 'Quality not as expected',
    condition_notes: 'Zip pull detached from the main compartment. Leather looks clean.',
    photos: ['/demo/tote.svg'],
    return_shipping_cost: 130,
    status: 'inspected',
    grade: 'B',
    grade_source: 'manual',
    grade_note: 'Sample record: graded by hand for the demo.',
    defects: [{ type: 'hardware_damage', description: 'Main zip pull detached', severity: 'moderate', source: 'manual' }],
    daysAgo: 12,
  },
  {
    name: 'Tidal Two-piece Swim Set',
    sku: 'SAMPLE-SWM-0034',
    category: 'Innerwear & swimwear',
    original_price: 1199,
    return_reason: 'Size / fit issue',
    condition_notes: 'Hygiene liner removed; pack opened.',
    photos: ['/demo/swim.svg'],
    seal_intact: false,
    return_shipping_cost: 80,
    status: 'inspected',
    grade: 'B',
    grade_source: 'manual',
    grade_note: 'Sample record: graded by hand for the demo.',
    defects: [{ type: 'packaging_damage', description: 'Hygiene seal broken, liner removed', severity: 'moderate', source: 'manual' }],
    daysAgo: 7,
  },
  {
    name: 'Terra Leather Strap Sandals',
    sku: 'SAMPLE-FTW-0288',
    category: 'Footwear',
    original_price: 1799,
    return_reason: 'Quality not as expected',
    condition_notes: 'Heavy wear on the heel, strap stitching loose. Clearly worn outdoors.',
    photos: ['/demo/sandal.svg'],
    return_shipping_cost: 105,
    status: 'completed',
    grade: 'C',
    grade_source: 'manual',
    grade_note: 'Sample record: graded by hand for the demo.',
    defects: [
      { type: 'sole_wear', description: 'Heavy heel wear', severity: 'major', source: 'manual' },
      { type: 'loose_stitching', description: 'Strap stitching loose', severity: 'moderate', source: 'manual' },
      { type: 'signs_of_use', description: 'Worn outdoors', severity: 'major', source: 'manual' },
    ],
    decision_route: 'liquidate',
    decision_reason: 'Liquidation lot for B-stock footwear.',
    realized_amount: 170,
    daysAgo: 37,
  },
  {
    name: 'Fog Oversized Fleece Hoodie',
    sku: 'SAMPLE-TOP-0519',
    category: 'Topwear',
    original_price: 1999,
    return_reason: 'Defective / damaged on arrival',
    condition_notes: 'Customer reports a smell. Photos inconclusive — needs a person to check.',
    photos: ['/demo/hoodie.svg'],
    return_shipping_cost: 100,
    status: 'inspected',
    grade: 'MANUAL_REVIEW',
    grade_source: 'manual',
    grade_note: 'Sample record: odour cannot be verified from photos.',
    defects: [{ type: 'odor_reported', description: 'Customer reports odour', severity: 'moderate', source: 'manual' }],
    daysAgo: 21,
  },
]

export function buildDemoItems(now = new Date()): ReturnItem[] {
  return seeds.map((s, idx) => {
    const { daysAgo, ...rest } = s
    const created = new Date(now.getTime() - daysAgo * 86_400_000 - idx * 3_600_000).toISOString()
    const item: ReturnItem = {
      ...emptyReturnInput(),
      ...rest,
      id: `sample-${String(idx + 1).padStart(2, '0')}`,
      created_at: created,
      updated_at: created,
      is_sample: true,
    }
    // Recovery values come from the published default rate card, like a new account's.
    Object.assign(item, ratesPatch(item, estimateFromRates(estimateInputFor(item), DEFAULT_RATES), { allowDecided: true }))
    const calc = calculateRecovery(item)
    if (item.grade) item.recommended_route = calc.recommended
    if (item.decision_route) {
      const r = calc.routes.find((x) => x.route === item.decision_route)!
      item.decision_net = r.net
      item.decided_at = created
    }
    if (item.status === 'completed') item.completed_at = created
    return item
  })
}
