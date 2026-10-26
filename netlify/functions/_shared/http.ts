export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })

export const fail = (status: number, code: string, message: string) => json(status, { code, message })

export async function readJson<T>(req: Request, maxBytes = 5_500_000): Promise<T | null> {
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > maxBytes) return null
  try {
    const text = await req.text()
    if (text.length > maxBytes) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

// Live-payment settings can be added under these names instead of editing the older test ones;
// when set, they win.
const PREFERRED: Record<string, string> = {
  DODO_PAYMENTS_ENVIRONMENT: 'DODO_LIVE_ENVIRONMENT',
  DODO_PAYMENTS_API_KEY: 'DODO_LIVE_API_KEY',
  DODO_PAYMENTS_WEBHOOK_KEY: 'DODO_LIVE_WEBHOOK_KEY',
  DODO_PRO_PRODUCT_ID: 'DODO_LIVE_PRO_PRODUCT_ID',
}
export const env = (name: string): string | undefined => (PREFERRED[name] && process.env[PREFERRED[name]]) || process.env[name] || undefined

export function siteUrl(req: Request) {
  return env('SITE_URL') || env('URL') || new URL(req.url).origin
}
