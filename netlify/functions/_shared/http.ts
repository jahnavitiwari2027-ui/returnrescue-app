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

export const env = (name: string): string | undefined => process.env[name] || undefined

export function siteUrl(req: Request) {
  return env('SITE_URL') || env('URL') || new URL(req.url).origin
}
