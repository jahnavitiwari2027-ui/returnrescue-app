import { getStore } from '@netlify/blobs'

/**
 * Per-day counters for the anonymous demo, stored in Netlify Blobs.
 * Check before calling the AI, and only count a use after it succeeds, so
 * failed attempts never eat into the allowance. Not strictly atomic, which is
 * fine for a cost guard-rail. Note: many evaluators may share one campus IP,
 * so the per-IP allowance is deliberately generous.
 */
function keys(kind: string, ip: string) {
  const day = new Date().toISOString().slice(0, 10)
  return {
    ipKey: `${day}/${kind}/ip/${ip.replace(/[^a-zA-Z0-9:.]/g, '_')}`,
    globalKey: `${day}/${kind}/global`,
  }
}

const store = () => getStore({ name: 'demo-rate-limits', consistency: 'strong' })

export async function checkDemoQuota(kind: string, ip: string, perIp: number, globalCap: number) {
  const { ipKey, globalKey } = keys(kind, ip)
  const s = store()
  const [ipCount, globalCount] = await Promise.all([
    s.get(ipKey).then((v) => Number(v ?? 0)),
    s.get(globalKey).then((v) => Number(v ?? 0)),
  ])
  if (ipCount >= perIp) return { ok: false as const, reason: 'ip' as const }
  if (globalCount >= globalCap) return { ok: false as const, reason: 'global' as const }
  return { ok: true as const }
}

export async function recordDemoUse(kind: string, ip: string) {
  const { ipKey, globalKey } = keys(kind, ip)
  const s = store()
  const [ipCount, globalCount] = await Promise.all([
    s.get(ipKey).then((v) => Number(v ?? 0)),
    s.get(globalKey).then((v) => Number(v ?? 0)),
  ])
  await Promise.all([s.set(ipKey, String(ipCount + 1)), s.set(globalKey, String(globalCount + 1))])
}

export const demoLimits = () => ({
  perIp: Number(process.env.DEMO_AI_PER_DAY) || 20,
  global: Number(process.env.DEMO_AI_GLOBAL_PER_DAY) || 400,
})
