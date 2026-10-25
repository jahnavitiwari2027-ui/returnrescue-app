// Runs the plans database update on an embedded Postgres and checks who keeps the 15-return limit.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const update = readFileSync('supabase/update-2026-10-26-plans.sql', 'utf8')

async function db() {
  const pg = new PGlite()
  await pg.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, created_at timestamptz not null default now());
    create table public.entitlements (user_id uuid primary key, plan text not null default 'free', status text not null default 'none',
      dodo_subscription_id text unique, dodo_customer_id text, current_period_end timestamptz, cancel_at_period_end boolean not null default false,
      last_event_at timestamptz, updated_at timestamptz not null default now());
    create table public.returns (id serial primary key, user_id uuid not null);
    create or replace function public.is_pro(uid uuid) returns boolean language sql stable as $$
      select exists (select 1 from public.entitlements e where e.user_id = uid and e.plan = 'pro' and e.status = 'active'); $$;
  `)
  await pg.exec(update)
  await pg.exec(update) // safe to run twice
  await pg.exec(`create trigger returns_limit before insert on public.returns for each row execute function public.returns_before_insert();`)
  return pg
}

const add = async (pg: PGlite, user: string, n: number) => {
  for (let i = 0; i < n; i++) await pg.query('insert into public.returns (user_id) values ($1)', [user])
}

describe('plans database update', () => {
  it('Starter and Pro both lift the free-plan limit; trial-ended free accounts keep it', async () => {
    const pg = await db()
    const users = { starter: '00000000-0000-0000-0000-000000000001', pro: '00000000-0000-0000-0000-000000000002', free: '00000000-0000-0000-0000-000000000003', lapsed: '00000000-0000-0000-0000-000000000004' }
    for (const id of Object.values(users)) await pg.query(`insert into auth.users (id, created_at) values ($1, now() - interval '30 days')`, [id])
    await pg.query(`insert into public.entitlements (user_id, plan, status, dodo_product_id) values ($1, 'starter', 'active', 'pdt_s'), ($2, 'pro', 'active', 'pdt_p'), ($3, 'starter', 'cancelled', null)`, [users.starter, users.pro, users.lapsed])
    await add(pg, users.starter, 16)
    await add(pg, users.pro, 16)
    await add(pg, users.free, 15)
    await expect(add(pg, users.free, 1)).rejects.toThrow(/FREE_PLAN_LIMIT: .*Choose Starter or Pro/)
    await add(pg, users.lapsed, 15)
    await expect(add(pg, users.lapsed, 1)).rejects.toThrow(/FREE_PLAN_LIMIT/)
    const col = await pg.query(`select dodo_product_id from public.entitlements where user_id = $1`, [users.starter])
    expect(col.rows[0]).toEqual({ dodo_product_id: 'pdt_s' })
    await pg.query(`update public.entitlements set billing_interval = 'year' where user_id = $1`, [users.starter])
    await expect(pg.query(`update public.entitlements set billing_interval = 'weekly' where user_id = $1`, [users.starter])).rejects.toThrow()
  })

  it('schema.sql has the same rules for new setups', () => {
    expect(readFileSync('supabase/schema.sql', 'utf8')).toContain('add column if not exists billing_interval')
    const schema = readFileSync('supabase/schema.sql', 'utf8')
    expect(schema).toContain("e.plan in ('starter', 'pro')")
    expect(schema).toContain('add column if not exists dodo_product_id text')
  })
})
