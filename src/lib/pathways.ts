// Practical next steps for each recovery route. The external organisations
// listed here were checked by hand (Oct 2026); each entry says what it is best
// for. "Find nearby" opens a Google Maps search — free, no API key, no scraping.

import type { Category, RouteKey } from './types'

export interface Channel {
  name: string
  url: string
  bestFor: string
}

export interface Pathway {
  title: string
  steps: string[]
  nearby: { label: string; query: string }[]
  channels: Channel[]
  ideas?: string[]
}

const FOOTWEAR: Category[] = ['Footwear']
const BAGS: Category[] = ['Bags & accessories']

export const mapsUrl = (query: string) => `https://www.google.com/maps/search/${encodeURIComponent(query)}`

function repairSearches(category: Category) {
  if (FOOTWEAR.includes(category))
    return [
      { label: 'Shoe repair', query: 'shoe repair near me' },
      { label: 'Shoe cleaning', query: 'shoe cleaning service near me' },
    ]
  if (BAGS.includes(category))
    return [
      { label: 'Bag & leather repair', query: 'bag repair near me' },
      { label: 'Zip repair', query: 'zip repair near me' },
    ]
  return [
    { label: 'Tailor / alterations', query: 'tailor alterations near me' },
    { label: 'Dry cleaner', query: 'dry cleaner near me' },
  ]
}

export function pathwayFor(route: RouteKey, category: Category): Pathway {
  switch (route) {
    case 'restock':
      return {
        title: 'Restock and sell again',
        steps: [
          'Check tags, labels and packaging are intact; refold or re-box.',
          'Do the hand checks the AI listed (smell, stitching, inside the item).',
          'Return it to sellable stock in your inventory system.',
          'Relist it on your site and marketplaces.',
        ],
        nearby: [],
        channels: [
          { name: 'Amazon Seller Central (India)', url: 'https://sellercentral.amazon.in', bestFor: 'Restocking returned units on Amazon.in' },
          { name: 'Flipkart Seller Hub', url: 'https://seller.flipkart.com', bestFor: 'Restocking returned units on Flipkart' },
        ],
      }
    case 'refurbish':
      return {
        title: 'Refurbish, then resell',
        steps: [
          'Fix the issues the AI found: clean, press, repair or re-tag.',
          'Repackage in fresh packaging.',
          'Re-photograph and relist — as new if fully restored, otherwise as “open box”.',
          'Record the repair cost so future estimates get sharper.',
        ],
        nearby: repairSearches(category),
        channels: [
          { name: 'Packman Packaging', url: 'https://www.packman.co.in', bestFor: 'E-commerce shipping boxes for repackaging' },
        ],
      }
    case 'liquidate':
      return {
        title: 'Liquidate',
        steps: [
          'Group similar items into a lot (same category or grade).',
          'Photograph the lot and list sizes, quantities and condition honestly.',
          'Get two or three quotes, then pick the best net price.',
          'Record the price you actually receive.',
        ],
        nearby: [{ label: 'Surplus stock buyers', query: 'surplus garment stock buyer near me' }],
        channels: [
          { name: 'Excess2Sell', url: 'https://www.excess2sell.com', bestFor: 'B2B marketplace for surplus, open-box and returned stock' },
          { name: 'IndiaMART', url: 'https://help.indiamart.com/knowledge-base/how-to-sell-on-indiamart', bestFor: 'Listing bulk lots for wholesale buyers' },
        ],
        ideas: ['Run an “open box” or clearance section on your own site', 'Hold a staff and friends sale'],
      }
    case 'recycle':
      return {
        title: 'Donate or recycle responsibly',
        steps: [
          'Remove or cover brand labels if your brand policy requires it.',
          'Donate items still wearable; recycle the rest.',
          'Ask for a donation receipt or diversion certificate for your records.',
        ],
        nearby: [{ label: 'Textile recycling', query: 'textile recycling near me' }],
        channels: [
          { name: 'Goonj', url: 'https://goonj.org/joy-of-sharing/corporates/', bestFor: 'Donating surplus clothing, footwear and bags (company partnerships)' },
          { name: 'Saahas Zero Waste', url: 'https://saahaszerowaste.com/solutions/circular-textiles', bestFor: 'Textile recycling with diversion certificates for brands' },
        ],
      }
  }
}
