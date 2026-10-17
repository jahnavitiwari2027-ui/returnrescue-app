// Runs the real Supabase SQL on an embedded Postgres (PGlite) and checks the
// security rules: brands can't see each other, staff can only do staff things.
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const dir = new URL('../supabase/', import.meta.url)
const read = (f: string) => fs.readFileSync(f.startsWith('fixture:') ? new URL('./fixtures/' + f.slice(8), import.meta.url) : new URL(f, dir), 'utf8')
const stub = `
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text, created_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
create table storage.objects (id serial primary key, bucket_id text, name text);
create function storage.foldername(n text) returns text[] language sql immutable as $$ select (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $$;
create role authenticated; create role anon; create role service_role;
`
const grants = `
grant usage on schema public, auth, storage to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant usage on all sequences in schema public, storage to authenticated;
grant execute on all functions in schema auth to authenticated;
alter table storage.objects enable row level security;
`
const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b', W = '00000000-0000-0000-0000-0000000000f1', X = '00000000-0000-0000-0000-0000000000f2'

async function setup(files: string[]) {
  const db = new PGlite()
  await db.exec(stub)
  for (const f of files) await db.exec(read(f))
  await db.exec(grants)
  await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values ('${A}','owner.a@x.in','{"full_name":"Asha Owner"}'),('${B}','owner.b@x.in','{}'),('${W}','ravi@x.in','{}'),('${X}','solo@x.in','{}')`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const as = async (uid: string | null, sql: string): Promise<{ rows?: any[]; error?: string }> => {
    await db.exec(`reset role; select set_config('app.uid','${uid ?? ''}', false); set role authenticated;`)
    try { return { rows: (await db.query(sql)).rows } } catch (e) { return { error: (e as Error).message } } finally { await db.exec('reset role') }
  }
  return { db, as }
}

const paths: [string, string[]][] = [
  ['an existing project after running the updates (twice)', ['fixture:schema-before-2026-10-18.sql', 'update-2026-10-17-trial.sql', 'update-2026-10-18-platforms.sql', 'update-2026-10-19-teams.sql', 'update-2026-10-19-teams.sql']],
  ['a new project from schema.sql (run twice)', ['schema.sql', 'schema.sql']],
]

describe.each(paths)('database rules — %s', (_label, files) => {
  it('keeps brands apart and limits staff to staff actions', async () => {
    const { as } = await setup(files)
    const failures: string[] = []
    const ok = (c: unknown, m: string) => { if (!c) failures.push(m) }
    const ins = (owner: string, name = 'x') => `insert into public.returns(user_id,name,sku,category) values ('${owner}','${name}','S-${Math.random().toString(36).slice(2, 7)}','Topwear') returning id, user_id, logged_by, logged_by_name`
    let r: { rows?: any[]; error?: string } // eslint-disable-line @typescript-eslint/no-explicit-any
    // Owners create their teams
    r = await as(A, `select public.ensure_team('Asha Apparel') as code`); ok(/^RR-[A-Z0-9]{8}$/.test(r.rows?.[0]?.code), 'A gets a code ' + JSON.stringify(r))
    const codeA = r.rows[0].code
    r = await as(B, `select public.ensure_team('B Brand') as code`); const codeB = r.rows[0].code
    ok(codeA !== codeB, 'codes differ')
    r = await as(A, `select public.ensure_team(null) as code`); ok(r.rows[0].code === codeA, 'ensure_team idempotent')
    
    // Owner data
    r = await as(A, ins(A, 'a-ret')); ok(r.rows?.[0]?.logged_by === A && r.rows[0].logged_by_name === 'Asha Owner', 'owner insert logs owner ' + JSON.stringify(r))
    const aRet = r.rows[0].id
    r = await as(B, ins(B, 'b-ret')); const bRet = r.rows[0].id
    r = await as(A, `insert into public.products(sku,name,category,selling_price) values ('TEE-1','Tee','Topwear',999) returning id, owner_id`); ok(r.rows?.[0]?.owner_id === A, 'owner adds product')
    const aProd = r.rows[0].id
    r = await as(B, `insert into public.products(sku,name,category) values ('B-1','B','Topwear') returning id`); const bProd = r.rows[0].id
    r = await as(A, `insert into public.products(sku,name,category) values ('TEE-1','Dup','Topwear')`); ok(r.error, 'duplicate SKU refused')
    
    // Worker joins
    r = await as(W, `select public.join_team('nope','Ravi')`); ok(/CODE/.test(r.error), 'bad code refused')
    r = await as(A, `select public.join_team('${codeA}','A')`); ok(/own team/.test(r.error), 'own code refused')
    r = await as(W, `select public.join_team(lower(' ${codeA} '),'Ravi K') as brand`); ok(r.rows?.[0]?.brand === 'Asha Apparel', 'join pending ' + JSON.stringify(r))
    r = await as(W, `select public.join_team('${codeB}','Ravi')`); ok(/already/.test(r.error), 'second join refused')
    r = await as(W, `select * from public.my_team()`); ok(r.rows[0].role === 'pending' && r.rows[0].rates === null && r.rows[0].join_code === null, 'pending my_team')
    r = await as(W, `select count(*)::int n from public.returns`); ok(r.rows[0].n === 0, 'pending sees no returns')
    r = await as(W, ins(A)); ok(r.error, 'pending cannot insert')
    r = await as(B, `select public.approve_member('${W}')`); ok(/isn/.test(r.error), 'other owner cannot approve')
    r = await as(W, `select public.approve_member('${W}')`); ok(r.error, 'worker cannot self-approve')
    r = await as(W, `update public.team_members set status='active'`); r = await as(W, `select status from public.team_members where member_id='${W}'`); ok(r.rows[0].status === 'pending', 'worker cannot self-activate via update')
    r = await as(A, `select display_name, email, status from public.team_members`); ok(r.rows.length === 1 && r.rows[0].display_name === 'Ravi K', 'owner sees request')
    r = await as(B, `select count(*)::int n from public.team_members`); ok(r.rows[0].n === 0, 'other owner sees no members')
    r = await as(A, `select public.approve_member('${W}')`); ok(!r.error, 'owner approves')
    
    // Approved staff
    r = await as(W, `select * from public.my_team()`); ok(r.rows[0].role === 'staff' && r.rows[0].owner_id === A && r.rows[0].join_code === null && r.rows[0].brand_name === 'Asha Apparel', 'staff my_team ' + JSON.stringify(r.rows[0]))
    r = await as(W, `select user_id from public.returns`); ok(r.rows.length === 1 && r.rows[0].user_id === A, 'staff sees only A returns')
    r = await as(W, `select sku from public.products`); ok(r.rows.length === 1 && r.rows[0].sku === 'TEE-1', 'staff sees only A products')
    r = await as(W, `select * from public.teams`); ok(r.rows.length === 0, 'staff cannot read teams table (join code hidden)')
    r = await as(W, ins(A, 'w-ret')); ok(r.rows?.[0]?.logged_by === W && r.rows[0].logged_by_name === 'Ravi K', 'staff insert logged ' + JSON.stringify(r))
    const wRet = r.rows[0].id
    r = await as(W, `insert into public.returns(user_id,name,sku,category,logged_by,logged_by_name) values ('${A}','spoof','S9','Topwear','${A}','Asha') returning logged_by, logged_by_name`); ok(r.rows?.[0]?.logged_by === W && r.rows[0].logged_by_name === 'Ravi K', 'logged_by cannot be spoofed')
    r = await as(W, ins(B)); ok(r.error, 'staff cannot insert into another brand')
    r = await as(W, ins(W)); ok(!r.error, 'staff own-row insert allowed (harmless, hidden by app)')
    r = await as(W, `update public.returns set name='hack' where id='${bRet}' returning id`); ok((r.rows ?? []).length === 0, 'staff cannot update other brand')
    r = await as(W, `update public.returns set logged_by_name='Boss' where id='${wRet}' returning logged_by_name`); ok(r.rows[0].logged_by_name === 'Ravi K', 'logged_by_name immutable')
    r = await as(W, `delete from public.returns where id='${aRet}' returning id`); ok((r.rows ?? []).length === 0, 'staff cannot delete')
    r = await as(W, `insert into public.products(owner_id,sku,name,category) values ('${A}','W-1','w','Topwear')`); ok(r.error, 'staff cannot add products')
    r = await as(W, `update public.products set name='x' returning id`); ok((r.rows ?? []).length === 0, 'staff cannot edit products')
    r = await as(W, `update public.teams set brand_name='x' returning owner_id`); ok((r.rows ?? []).length === 0, 'staff cannot edit team settings')
    // grading & decisions
    r = await as(W, `update public.returns set grade='B', grade_source='manual' where id='${wRet}'`); ok(/STAFF_ONLY/.test(r.error), 'staff manual grade refused')
    r = await as(W, `update public.returns set grade='B', grade_source='ai_accepted', recommended_route='refurbish', decision_route='liquidate' where id='${wRet}'`); ok(/different option/.test(r.error), 'staff override refused')
    r = await as(W, `update public.returns set grade='B', grade_source='ai_accepted', recommended_route='refurbish', decision_route='refurbish', decision_net=500, status='decided' where id='${wRet}' returning status`); ok(r.rows?.[0]?.status === 'decided', 'staff can confirm recommendation ' + JSON.stringify(r))
    r = await as(W, `update public.returns set decision_route='liquidate', recommended_route='liquidate' where id='${wRet}'`); ok(/saved decision/.test(r.error), 'staff cannot change saved decision')
    r = await as(W, `update public.returns set flag_note='Wrong size', flagged_at=now(), realized_amount=450 where id='${wRet}' returning flag_note`); ok(r.rows?.[0]?.flag_note === 'Wrong size', 'staff can flag and record amount')
    r = await as(A, `update public.returns set decision_route='liquidate', grade_source='manual' where id='${wRet}' returning decision_route`); ok(r.rows?.[0]?.decision_route === 'liquidate', 'owner can override')
    // products link
    r = await as(W, `update public.returns set product_id='${aProd}' where id='${wRet}' returning product_id`); ok(r.rows?.[0]?.product_id === aProd, 'staff links own brand product')
    r = await as(W, `update public.returns set product_id='${bProd}' where id='${wRet}'`); ok(/different brand/.test(r.error), 'cross-brand product refused')
    r = await as(A, `update public.returns set product_id='${bProd}' where id='${aRet}'`); ok(/different brand/.test(r.error), 'owner cross-brand product refused')
    // storage
    r = await as(W, `insert into storage.objects(bucket_id,name) values ('return-photos','${A}/p1.jpg') returning id`); ok(!r.error, 'staff uploads to owner folder ' + r.error)
    r = await as(W, `insert into storage.objects(bucket_id,name) values ('return-photos','${B}/p1.jpg')`); ok(r.error, 'staff cannot upload to other brand')
    r = await as(W, `insert into storage.objects(bucket_id,name) values ('return-photos','not-a-uuid/p1.jpg')`); ok(r.error, 'junk folder refused')
    r = await as(W, `select count(*)::int n from storage.objects where name like '${A}/%'`); ok(r.rows[0].n === 1, 'staff reads owner photos')
    r = await as(W, `delete from storage.objects where name like '${A}/%' returning id`); ok((r.rows ?? []).length === 0, 'staff cannot delete photos')
    r = await as(B, `select count(*)::int n from storage.objects`); ok(r.rows[0].n === 0, 'other owner cannot read photos')
    r = await as(A, `delete from storage.objects where name like '${A}/%' returning id`); ok(r.rows.length === 1, 'owner deletes photos')
    // codes
    r = await as(A, `select public.regenerate_join_code() as c`); ok(r.rows[0].c !== codeA, 'regenerate code')
    r = await as(X, `select public.join_team('${codeA}','x')`); ok(/match/.test(r.error), 'old code stops working')
    // accounts with data can't join; members can leave; removed staff lose access
    r = await as(B, `select public.join_team((select join_code from public.teams where owner_id='${A}'),'b')`); ok(/team/.test(r.error ?? '') || /code/i.test(r.error ?? ''), 'owner with data cannot join (or cannot see code) ' + r.error)
    r = await as(A, `delete from public.team_members where member_id='${W}' returning member_id`); ok(r.rows.length === 1, 'owner removes member')
    r = await as(W, `select count(*)::int n from public.returns where user_id='${A}'`); ok(r.rows[0].n === 0, 'removed staff loses access')
    r = await as(W, `select * from public.my_team()`); ok(r.rows[0].role === 'owner' && r.rows[0].owner_id === W, 'removed staff back to own workspace')
    r = await as(X, ins(X, 'x-own')); r = await as(A, `select public.regenerate_join_code() as c`); const codeA2 = r.rows[0].c
    r = await as(X, `select public.join_team('${codeA2}','x')`); ok(/own returns/.test(r.error ?? ''), 'account with its own returns cannot join ' + r.error)
    r = await as(X, `select count(*)::int n from public.returns`); ok(r.rows[0].n === 1, 'solo owner still sees own return')
    // unauthenticated
    r = await as(null, `select count(*)::int n from public.returns`); ok(r.error || r.rows[0].n === 0, 'no user sees nothing')
    // owner my_team
    r = await as(A, `select * from public.my_team()`); ok(r.rows[0].role === 'owner' && /^RR-/.test(r.rows[0].join_code), 'owner my_team has code')
    r = await as(X, `select * from public.my_team()`); ok(r.rows[0].role === 'owner' && r.rows[0].join_code === null, 'solo owner without team row')
    
    expect(failures).toEqual([])
  }, 60_000)
})

it('schema.sql includes the latest team update verbatim', () => {
  expect(read('schema.sql')).toContain(read('update-2026-10-19-teams.sql'))
})
