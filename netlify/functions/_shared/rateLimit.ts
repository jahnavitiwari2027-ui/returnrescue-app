import { getStore } from '@netlify/blobs'

/**
 * Small per-day counters for the anonymous demo, stored in Netlify Blobs.
 * Not strictly atomic, which is acceptable for a cost guard-rail.
 */
export async function takeDemoQuota(kind: string, ip: string, perIp: number, globalCap: number) {
  const day = new Date().toISOString().slice(0, 10)
  const store = getStore({ name: 'demo-rate-limits', consistency: 'strong' })
  const ipKey = `${day}/${kind}/ip/${ip.replace(/[^a-zA-Z0-9:.]/g, '_')}`
  const globalKey = `${day}/${kind}/global`
  const [ipCount, globalCount] = await Promise.all([
    store.get(ipKey).then((v) => Number(v ?? 0)),
    store.get(globalKey).then((v) => Number(v ?? 0)),
  ])
  if (ipCount >= perIp) return { ok: false as const, reason: 'ip' as const }
  if (globalCount >= globalCap) return { ok: false as const, reason: 'global' as const }
  await Promise.all([store.set(ipKey, String(ipCount + 1)), store.set(globalKey, String(globalCount + 1))])
  return { ok: true as const, remaining: perIp - ipCount - 1 }
}
