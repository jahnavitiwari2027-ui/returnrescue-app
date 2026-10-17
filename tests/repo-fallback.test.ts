import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/supabase', () => ({ supabase: null, PHOTO_BUCKET: 'return-photos' }))
const { writeRow, missingOptionalColumn } = await import('../src/data/supabaseRepo')

const missing = (c: string) => ({ code: 'PGRST204', message: `Could not find the '${c}' column of 'returns' in the schema cache` })

describe('saving before a database update has been run', () => {
  it('recognises PostgREST’s missing-column error for the newer columns only', () => {
    expect(missingOptionalColumn(missing('sale_setup'))).toBe('sale_setup')
    expect(missingOptionalColumn({ code: '42703', message: 'column "order_id" of relation "returns" does not exist' })).toBe('order_id')
    expect(missingOptionalColumn({ code: 'P0001', message: 'FREE_PLAN_LIMIT: …' })).toBeNull()
    expect(missingOptionalColumn(missing('name'))).toBeNull()
  })

  it('retries without each missing column, keeping everything else', async () => {
    const run = vi.fn(async (b: Record<string, unknown>) =>
      'sale_setup' in b ? { data: null, error: missing('sale_setup') } : 'order_id' in b ? { data: null, error: missing('order_id') } : { data: b, error: null },
    )
    const res = await writeRow({ name: 'x', sale_setup: { platform: 'meesho' }, order_id: 'A1' }, run)
    expect(run).toHaveBeenCalledTimes(3)
    expect(res).toEqual({ data: { name: 'x' }, error: null })
  })

  it('does not retry other errors', async () => {
    const run = vi.fn(async () => ({ data: null, error: { code: 'P0001', message: 'FREE_PLAN_LIMIT: limit' } }))
    const res = await writeRow({ name: 'x', sale_setup: { platform: 'meesho' } }, run)
    expect(run).toHaveBeenCalledTimes(1)
    expect(res.error?.code).toBe('P0001')
  })
})
