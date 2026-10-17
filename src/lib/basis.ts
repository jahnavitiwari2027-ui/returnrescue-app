import type { ValueBasis } from './types'

/** How each value source is named in the UI. */
export const BASIS_LABEL: Record<ValueBasis, string> = {
  rates: 'Rate card',
  estimate: 'Your estimate',
  quote: 'Third-party quote',
  ai: 'AI estimate (older method)',
}
export const BASIS_SHORT: Record<ValueBasis, string> = {
  rates: 'from your rate card',
  estimate: 'your estimate',
  quote: 'from a quote',
  ai: 'older AI estimate',
}
