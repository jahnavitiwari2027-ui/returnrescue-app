// Links to the contact page, prefilled with a topic and an
// optional reference (e.g. the return the question is about).

export const SUPPORT_TOPICS = {
  general: 'General question',
  ai_result: 'An AI result looks wrong',
  billing: 'Billing or my plan',
  other: 'Something else',
} as const
export type SupportTopic = keyof typeof SUPPORT_TOPICS

export function supportHref(topic: SupportTopic, ref?: string) {
  const q = new URLSearchParams({ topic })
  if (ref) q.set('ref', ref.slice(0, 120))
  return `/contact?${q.toString()}`
}
