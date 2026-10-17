// Delhi NCR directory of real, independent businesses a returns team can use for
// each recovery route. Every entry was taken from the business's own website on
// the date below. ReturnRescue has no partnership, affiliation or commercial tie
// with any of them and doesn't vouch for their work or prices.

import type { Category, RouteKey } from '../lib/types'

export const DIRECTORY_CHECKED_ON = '17 Oct 2026'
export const DIRECTORY_REGION = 'Delhi NCR'

export type NcrCity = 'Delhi' | 'Gurugram' | 'Noida' | 'Haryana' | 'Online'
export type Fits = 'apparel' | 'footwear' | 'bags'

export interface DirectoryEntry {
  id: string
  name: string
  kind: Exclude<RouteKey, 'restock'>
  city: NcrCity
  /** Where it is, as the business states it. */
  location: string
  /** Areas it says it covers. */
  serves: string
  services: string[]
  fits: Fits[]
  phone?: string
  email?: string
  website: string
  /** The page the details were checked on. */
  source: string
  /** Something useful to know, from the business's own page. */
  note?: string
}

export const DIRECTORY: DirectoryEntry[] = [
  // ── Repair & cleaning ──
  {
    id: 'ncr-doctor-uncle',
    name: 'Doctor Uncle',
    kind: 'refurbish',
    city: 'Delhi',
    location: 'Sultanpur Mandi Road, New Delhi 110030',
    serves: 'Delhi, Noida and Gurgaon, with free pickup and delivery',
    services: ['Sneaker cleaning', 'Sole & heel replacement', 'Handbag cleaning & repair', 'Leather & colour restoration'],
    fits: ['footwear', 'bags'],
    phone: '+91 85128 51321',
    email: 'Care@thedoctoruncle.com',
    website: 'https://www.thedoctoruncle.com/',
    source: 'https://www.thedoctoruncle.com/',
    note: 'Operating since 2013. Ask about bulk or business orders.',
  },
  {
    id: 'ncr-kicks-rewash',
    name: 'Kicks Rewash',
    kind: 'refurbish',
    city: 'Gurugram',
    location: 'Plot 84, Sheetla Mata Road, Sector 5, Gurugram 122001',
    serves: 'Pickup and drop across Delhi NCR; pan-India by post',
    services: ['Sole, heel, stitching & zipper repair', 'Sneaker & handbag cleaning', 'Darning', 'Garment laundry'],
    fits: ['footwear', 'bags', 'apparel'],
    phone: '+91 98214 10463',
    email: 'support@kicksrewash.com',
    website: 'https://kicksrewash.com/shoe-repair-gurgaon',
    source: 'https://kicksrewash.com/shoe-repair-gurgaon',
    note: 'Lists sneaker cleaning at ₹499 and handbag cleaning at ₹1,000. Mon–Sat 10am–7pm.',
  },
  {
    id: 'ncr-leather-laundry',
    name: 'The Leather Laundry',
    kind: 'refurbish',
    city: 'Delhi',
    location: 'Studio in Defence Colony, New Delhi',
    serves: 'South Delhi, Gurgaon, Noida, Greater Noida and Faridabad',
    services: ['Bag & handbag repair', 'Shoe & sneaker cleaning and repair', 'Leather jacket restoration'],
    fits: ['footwear', 'bags'],
    phone: '+91 97112 55431',
    email: 'info@theleatherlaundry.com',
    website: 'https://theleatherlaundry.com/city/delhi/',
    source: 'https://theleatherlaundry.com/city/delhi/',
  },
  {
    id: 'ncr-de-leather-craft',
    name: 'De Leather Craft',
    kind: 'refurbish',
    city: 'Delhi',
    location: 'F Block, Road No. 3, Andrews Ganj, New Delhi 110049 (also Greater Noida and Gurugram)',
    serves: 'Delhi, Greater Noida and Gurugram locations',
    services: ['Leather repair & restoration', 'Bag dry cleaning', 'Sneaker laundry', 'Strap & belt alterations'],
    fits: ['footwear', 'bags'],
    phone: '+91 95607 35941',
    email: 'deleathercraft@gmail.com',
    website: 'https://www.deleathercraft.com/',
    source: 'https://www.deleathercraft.com/',
  },
  {
    id: 'ncr-sneaker-laundry',
    name: 'Sneaker Laundry',
    kind: 'refurbish',
    city: 'Delhi',
    location: 'Delhi and Gurgaon (no street address listed)',
    serves: 'Delhi NCR, pickup and drop by appointment',
    services: ['Shoe & bag cleaning', 'Shoe, bag & luggage repair', 'Zipper repair'],
    fits: ['footwear', 'bags'],
    phone: '+91 92896 33313',
    website: 'https://www.sneakerlaundry.in/',
    source: 'https://www.sneakerlaundry.in/',
  },
  {
    id: 'ncr-noida-dry-cleaner',
    name: 'Noida Dry Cleaner',
    kind: 'refurbish',
    city: 'Noida',
    location: 'Noida (no street address listed)',
    serves: 'Noida',
    services: ['Shoe & sneaker cleaning', 'Sole & heel repair', 'Dry cleaning'],
    fits: ['footwear', 'apparel'],
    phone: '+91 74288 43743',
    website: 'https://www.noidadrycleaner.com/service/shoe-cleaning-and-shoe-laundry-service/',
    source: 'https://www.noidadrycleaner.com/service/shoe-cleaning-and-shoe-laundry-service/',
  },
  {
    id: 'ncr-cloud-dhobi',
    name: 'Cloud Dhobi',
    kind: 'refurbish',
    city: 'Delhi',
    location: 'Regal Building, Connaught Place, New Delhi 110001',
    serves: 'Delhi NCR, doorstep pickup',
    services: ['Dry cleaning', 'Laundry & steam ironing', 'Shoe cleaning', 'Bag cleaning'],
    fits: ['apparel', 'footwear', 'bags'],
    phone: '+91 97737 66066',
    email: 'info@clouddhobi.com',
    website: 'https://clouddhobi.com/pricing/',
    source: 'https://clouddhobi.com/pricing/',
    note: 'Publishes per-piece prices for Delhi NCR. Open daily 9am–9pm.',
  },

  // ── Liquidation ──
  {
    id: 'ncr-indialot',
    name: 'IndiaLot',
    kind: 'liquidate',
    city: 'Online',
    location: 'Online B2B platform (no address listed); names Delhi among its deal locations',
    serves: 'Buyers and sellers across India',
    services: ['Garment stock lots', 'Footwear stock lots', 'Export surplus', 'Shop-closing stock'],
    fits: ['apparel', 'footwear'],
    phone: '+91 90226 33755',
    website: 'https://indialot.com/sell-stock-lot',
    source: 'https://indialot.com/sell-stock-lot',
    note: 'Bulk lots only, not single pieces. Submit category, quantity and photos for an offer; fees aren’t published.',
  },
  {
    id: 'ncr-excess2sell',
    name: 'Excess2Sell',
    kind: 'liquidate',
    city: 'Online',
    location: 'Online B2B platform (Checkers India Technology Pvt Ltd)',
    serves: 'Brands, manufacturers and wholesalers across India',
    services: ['Excess, open-box & returned inventory', 'Apparel & footwear', 'Brand store auctions'],
    fits: ['apparel', 'footwear', 'bags'],
    website: 'https://www.excess2sell.com',
    source: 'https://www.excess2sell.com',
    note: 'Register your business and complete KYC to list. Contact through the website.',
  },
  {
    id: 'ncr-gandhi-nagar',
    name: 'Gandhi Nagar export-surplus wholesalers',
    kind: 'liquidate',
    city: 'Delhi',
    location: 'Gandhi Nagar garment market, East Delhi',
    serves: 'Directory listing of local surplus wholesalers',
    services: ['Export surplus', 'Stock-lot buying'],
    fits: ['apparel'],
    website: 'https://www.justdial.com/Delhi/Export-Surplus-Wholesalers-in-Gandhi-Nagar/nct-11296099',
    source: 'https://www.justdial.com/Delhi/Export-Surplus-Wholesalers-in-Gandhi-Nagar/nct-11296099',
    note: 'A Justdial listing of many traders, not one business — compare a few before selling.',
  },

  // ── Donation & recycling ──
  {
    id: 'ncr-goonj',
    name: 'Goonj',
    kind: 'recycle',
    city: 'Delhi',
    location: 'Office: J-93 Sarita Vihar, New Delhi 110076 · Centre of Circularity: Madanpur Khadar, New Delhi',
    serves: 'Pan-India network, headquartered in Delhi',
    services: ['Clothing donation', 'Corporate surplus & deadstock', 'Reuse and rural distribution'],
    fits: ['apparel', 'footwear', 'bags'],
    phone: '011-41401216',
    website: 'https://goonj.org/faq/',
    source: 'https://goonj.org/faq/',
    note: 'Invites companies to give surplus inventory through its Corporate Engagement team. Check before sending footwear. Mon–Sat 10am–5pm.',
  },
  {
    id: 'ncr-respun',
    name: 'Respun',
    kind: 'recycle',
    city: 'Haryana',
    location: 'Recycling facility: Passina Kalan Road, NH44, Panipat 132103',
    serves: 'Pickups in Delhi, Gurugram and Noida; courier from elsewhere',
    services: ['Textile recycling into yarn', 'Doorstep pickup by weight'],
    fits: ['apparel'],
    phone: '+91 72060 10323',
    email: 'info@respunindia.com',
    website: 'https://respunindia.com/send-clothes/',
    source: 'https://respunindia.com/send-clothes/',
    note: 'Pickup can take 7–8 working days after booking.',
  },
  {
    id: 'ncr-clothes-box',
    name: 'Clothes Box Foundation',
    kind: 'recycle',
    city: 'Gurugram',
    location: '161/1A Baliyawas, Gurugram–Faridabad Road, Gurugram 122003',
    serves: 'Pickup on request',
    services: ['Clothes donation', 'Garment refurbishment', 'Corporate partnerships'],
    fits: ['apparel'],
    phone: '+91 78383 71356',
    email: 'info@clothesboxfoundation.org',
    website: 'https://clothesboxfoundation.org',
    source: 'https://clothesboxfoundation.org',
  },
]

export function directoryFor(kind: RouteKey, category?: Category): DirectoryEntry[] {
  const fit: Fits | null = !category ? null : category === 'Footwear' ? 'footwear' : category === 'Bags & accessories' ? 'bags' : 'apparel'
  return DIRECTORY.filter((d) => d.kind === kind && (!fit || d.fits.includes(fit)))
}
