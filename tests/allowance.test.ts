// Launch weekend, one-time packs and plan limits for AI inspections.
import { describe, expect, it } from 'vitest'
import { aiAllowance, LAUNCH, PACK, packsOf } from '../src/lib/plans'

const during = Date.parse(LAUNCH.end) - 3_600_000
const after = Date.parse(LAUNCH.end) + 3 * 86_400_000
const pack = (daysAgo: number, now: number) => ({ id: `pay_${daysAgo}`, at: new Date(now - daysAgo * 86_400_000).toISOString() })
const base = { plan: null, used30d: 0, usedSinceLaunch: 0, usedInWindow: 0, packs: [] }

describe('aiAllowance', () => {
  it('gives everyone the free launch inspections during the weekend', () => {
    expect(aiAllowance({ ...base, now: during })).toMatchObject({ remaining: LAUNCH.freeInspections, limit: LAUNCH.freeInspections })
    expect(aiAllowance({ ...base, usedSinceLaunch: 10, usedInWindow: 10, now: during }).remaining).toBe(0)
  })
  it('adds 15 per pack on top', () => {
    expect(aiAllowance({ ...base, usedSinceLaunch: 10, usedInWindow: 10, packs: [pack(0, during)], now: during }).remaining).toBe(PACK.inspections)
  })
  it('after the weekend, unused free inspections are gone but used ones are not charged again', () => {
    expect(aiAllowance({ ...base, now: after }).remaining).toBe(0)
    // Used 4 free during the weekend, then bought a pack and used 2 more: 4 + 15 - 6 = 13 left.
    expect(aiAllowance({ ...base, usedInWindow: 4, usedSinceLaunch: 6, packs: [pack(1, after)], now: after }).remaining).toBe(13)
  })
  it('caps packs at two per 30 days', () => {
    expect(aiAllowance({ ...base, packs: [pack(1, after), pack(2, after)], now: after }).packsLeft).toBe(0)
    expect(aiAllowance({ ...base, packs: [pack(40, after), pack(2, after)], now: after }).packsLeft).toBe(1)
  })
  it('plans use their monthly allowance', () => {
    expect(aiAllowance({ ...base, plan: 'starter', used30d: 30, now: after })).toMatchObject({ remaining: 70, limit: 100 })
  })
})

describe('packsOf', () => {
  it('reads only well-formed pack records', () => {
    expect(packsOf({ ai_packs: [{ id: 'a', at: '2026-11-14T00:00:00Z' }, { id: 1 }, null, 'x'] })).toHaveLength(1)
    expect(packsOf(undefined)).toEqual([])
    expect(packsOf({ ai_packs: 'nope' })).toEqual([])
  })
})
