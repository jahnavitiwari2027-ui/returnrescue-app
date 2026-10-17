-- Update 3 (19 Oct 2026): brand teams, products (SKUs) and return logging.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- What it adds:
--   teams          one row per brand owner: brand name, join code, shared rate card and partners
--   team_members   warehouse staff who joined with the code (pending until the owner approves)
--   products       the brand's SKUs with their price and selling settings
--   returns        order ID, linked product, who logged it, and "flag for ops"
-- Existing returns stay with their owner. Staff of a brand can see and log that
-- brand's returns; only the owner can delete, export, bill, change settings or
-- products, grade by hand or override a decision.

-- ───────────────────────── tables ─────────────────────────
create table if not exists public.teams (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  brand_name text not null default '' check (char_length(brand_name) <= 120),
  join_code text unique check (join_code is null or join_code ~ '^RR-[A-Z0-9]{8}$'),
  rates jsonb check (rates is null or jsonb_typeof(rates) = 'object'),
  partners jsonb check (partners is null or jsonb_typeof(partners) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  member_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references public.teams(owner_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  display_name text not null default '' check (char_length(display_name) <= 120),
  email text not null default '',
  joined_at timestamptz not null default now(),
  approved_at timestamptz,
  check (member_id <> owner_id)
);
create index if not exists team_members_owner_idx on public.team_members (owner_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sku text not null check (char_length(sku) between 1 and 80),
  name text not null check (char_length(name) between 1 and 200),
  category text not null,
  mrp numeric(12,2) check (mrp is null or mrp >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  sale_setup jsonb check (sale_setup is null or jsonb_typeof(sale_setup) = 'object'),
  notes text not null default '' check (char_length(notes) <= 1000),
  unique (owner_id, sku)
);
create index if not exists products_owner_idx on public.products (owner_id, sku);

alter table public.returns add column if not exists sale_setup jsonb check (sale_setup is null or jsonb_typeof(sale_setup) = 'object');
alter table public.returns add column if not exists order_id text check (order_id is null or char_length(order_id) <= 80);
alter table public.returns add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.returns add column if not exists logged_by uuid references auth.users(id) on delete set null;
alter table public.returns add column if not exists logged_by_name text not null default '';
alter table public.returns add column if not exists flag_note text not null default '' check (char_length(flag_note) <= 1000);
alter table public.returns add column if not exists flagged_at timestamptz;

-- ───────────────────────── access helpers ─────────────────────────
-- True for the brand owner, and for staff the owner has approved.
create or replace function public.can_access(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid()
      or exists (select 1 from public.team_members m
                 where m.member_id = auth.uid() and m.owner_id = p_owner and m.status = 'active');
$$;

-- Same, for a storage folder name (the owner's user id).
create or replace function public.can_access_folder(p_folder text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when p_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.can_access(p_folder::uuid) else false end;
$$;

create or replace function public.new_join_code()
returns text language sql volatile as $$
  select 'RR-' || upper(substr(translate(md5(gen_random_uuid()::text), 'abcdef', 'ABCDEF'), 1, 8));
$$;

-- ───────────────────────── triggers ─────────────────────────
create or replace function public.teams_before_write()
returns trigger language plpgsql as $$
begin
  if new.join_code is null then new.join_code := public.new_join_code(); end if;
  if tg_op = 'UPDATE' then
    new.owner_id := old.owner_id;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists teams_write on public.teams;
create trigger teams_write before insert or update on public.teams
  for each row execute function public.teams_before_write();

create or replace function public.products_before_write()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.owner_id := old.owner_id;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists products_write on public.products;
create trigger products_write before insert or update on public.products
  for each row execute function public.products_before_write();

-- Who logged a return is recorded by the database, not the browser. Staff can log
-- and confirm the app's recommendation; owner-only actions are refused.
create or replace function public.returns_team_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if uid is not null then
      new.logged_by := uid;
      new.logged_by_name := coalesce(
        (select nullif(m.display_name, '') from public.team_members m where m.member_id = uid),
        (select coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)) from auth.users u where u.id = uid),
        '');
    end if;
  else
    new.logged_by := old.logged_by;
    new.logged_by_name := old.logged_by_name;
  end if;

  -- A return can only be linked to one of its own brand's products.
  if new.product_id is not null and not exists (select 1 from public.products p where p.id = new.product_id and p.owner_id = new.user_id) then
    raise exception 'PRODUCT: That product belongs to a different brand.' using errcode = 'P0001';
  end if;

  -- The owner and server-side code (no signed-in user) may do anything.
  if uid is null or uid = new.user_id then return new; end if;

  if new.grade_source in ('manual', 'ai_corrected')
     and (tg_op = 'INSERT' or new.grade is distinct from old.grade or new.grade_source is distinct from old.grade_source) then
    raise exception 'STAFF_ONLY: Only the brand owner or ops can set a grade by hand.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.decision_route is not null
     and (new.decision_route is distinct from old.decision_route or new.decision_net is distinct from old.decision_net) then
    raise exception 'STAFF_ONLY: Only the brand owner or ops can change a saved decision.' using errcode = 'P0001';
  end if;
  if new.decision_route is not null and new.decision_route is distinct from new.recommended_route
     and (tg_op = 'INSERT' or new.decision_route is distinct from old.decision_route) then
    raise exception 'STAFF_ONLY: Only the brand owner or ops can choose a different option from the recommendation.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists returns_team on public.returns;
create trigger returns_team before insert or update on public.returns
  for each row execute function public.returns_team_guard();

-- ───────────────────────── functions the app calls ─────────────────────────
-- Everything the app needs to know about the caller's workspace, in one call.
create or replace function public.my_team()
returns table (
  role text, owner_id uuid, brand_name text, join_code text, rates jsonb, partners jsonb,
  owner_pro boolean, owner_created_at timestamptz, owner_ai_used bigint
)
language plpgsql stable security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  m public.team_members%rowtype;
  o uuid;
  r text;
begin
  if uid is null then return; end if;
  select * into m from public.team_members where member_id = uid;
  if found then
    o := m.owner_id;
    r := case when m.status = 'active' then 'staff' else 'pending' end;
  else
    o := uid;
    r := 'owner';
  end if;
  return query
    select r, o,
           coalesce(t.brand_name, ''),
           case when r = 'owner' then t.join_code end,
           case when r = 'pending' then null else t.rates end,
           case when r = 'pending' then null else t.partners end,
           public.is_pro(o),
           (select u.created_at from auth.users u where u.id = o),
           case when r = 'pending' then 0::bigint
                else (select count(*) from public.ai_usage a where a.user_id = o and a.kind = 'inspection') end
    from (select 1) one
    left join public.teams t on t.owner_id = o;
end $$;

-- Create the owner's team row (and join code) if it doesn't exist yet.
create or replace function public.ensure_team(p_brand text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  code text;
begin
  if uid is null then raise exception 'AUTH: Please sign in again.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.team_members where member_id = uid) then
    raise exception 'TEAM: This account is part of another brand''s team.' using errcode = 'P0001';
  end if;
  insert into public.teams (owner_id, brand_name)
  values (uid, coalesce(left(trim(p_brand), 120), ''))
  on conflict (owner_id) do nothing;
  if p_brand is not null and trim(p_brand) <> '' then
    update public.teams set brand_name = left(trim(p_brand), 120) where owner_id = uid;
  end if;
  select join_code into code from public.teams where owner_id = uid;
  return code;
end $$;

create or replace function public.regenerate_join_code()
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  update public.teams set join_code = public.new_join_code() where owner_id = auth.uid() returning join_code into code;
  if code is null then raise exception 'TEAM: Create your team first.' using errcode = 'P0001'; end if;
  return code;
end $$;

-- A signed-in person asks to join a brand with its code. The owner then approves.
create or replace function public.join_team(p_code text, p_name text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  t public.teams%rowtype;
  em text;
begin
  if uid is null then raise exception 'AUTH: Please sign in again.' using errcode = 'P0001'; end if;
  select * into t from public.teams where join_code = upper(trim(p_code));
  if not found then raise exception 'CODE: That code doesn''t match any team. Check it with your manager.' using errcode = 'P0001'; end if;
  if t.owner_id = uid then raise exception 'CODE: That''s your own team''s code — share it with your staff.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.team_members where member_id = uid) then
    raise exception 'TEAM: This account has already asked to join a team.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.returns where user_id = uid) or exists (select 1 from public.products where owner_id = uid)
     or exists (select 1 from public.team_members where owner_id = uid) then
    raise exception 'TEAM: This account already has its own returns or team. Sign in with a different account to join.' using errcode = 'P0001';
  end if;
  select email into em from auth.users where id = uid;
  insert into public.team_members (member_id, owner_id, status, display_name, email)
  values (uid, t.owner_id, 'pending', left(coalesce(nullif(trim(p_name), ''), split_part(em, '@', 1)), 120), coalesce(em, ''));
  return t.brand_name;
end $$;

create or replace function public.approve_member(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.team_members set status = 'active', approved_at = now()
  where member_id = p_member and owner_id = auth.uid();
  if not found then raise exception 'TEAM: That person isn''t waiting to join your team.' using errcode = 'P0001'; end if;
end $$;

revoke all on function public.my_team() from public, anon;
revoke all on function public.ensure_team(text) from public, anon;
revoke all on function public.regenerate_join_code() from public, anon;
revoke all on function public.join_team(text, text) from public, anon;
revoke all on function public.approve_member(uuid) from public, anon;
grant execute on function public.my_team() to authenticated;
grant execute on function public.ensure_team(text) to authenticated;
grant execute on function public.regenerate_join_code() to authenticated;
grant execute on function public.join_team(text, text) to authenticated;
grant execute on function public.approve_member(uuid) to authenticated;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.products enable row level security;

drop policy if exists "own team select" on public.teams;
drop policy if exists "own team insert" on public.teams;
drop policy if exists "own team update" on public.teams;
create policy "own team select" on public.teams for select to authenticated using (owner_id = auth.uid());
create policy "own team insert" on public.teams for insert to authenticated with check (owner_id = auth.uid());
create policy "own team update" on public.teams for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Members are added only through join_team() and approved through approve_member().
drop policy if exists "team members select" on public.team_members;
drop policy if exists "team members delete" on public.team_members;
create policy "team members select" on public.team_members for select to authenticated using (member_id = auth.uid() or owner_id = auth.uid());
create policy "team members delete" on public.team_members for delete to authenticated using (member_id = auth.uid() or owner_id = auth.uid());

drop policy if exists "team products select" on public.products;
drop policy if exists "own products insert" on public.products;
drop policy if exists "own products update" on public.products;
drop policy if exists "own products delete" on public.products;
create policy "team products select" on public.products for select to authenticated using (public.can_access(owner_id));
create policy "own products insert" on public.products for insert to authenticated with check (owner_id = auth.uid());
create policy "own products update" on public.products for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own products delete" on public.products for delete to authenticated using (owner_id = auth.uid());

-- Returns: the owner and approved staff; only the owner deletes.
drop policy if exists "own returns select" on public.returns;
drop policy if exists "own returns insert" on public.returns;
drop policy if exists "own returns update" on public.returns;
drop policy if exists "own returns delete" on public.returns;
create policy "own returns select" on public.returns for select to authenticated using (public.can_access(user_id));
create policy "own returns insert" on public.returns for insert to authenticated with check (public.can_access(user_id));
create policy "own returns update" on public.returns for update to authenticated using (public.can_access(user_id)) with check (public.can_access(user_id));
create policy "own returns delete" on public.returns for delete to authenticated using (user_id = auth.uid());

-- Photos live in the owner's folder; approved staff can read and add, only the owner deletes.
drop policy if exists "own photos read" on storage.objects;
drop policy if exists "own photos write" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;
create policy "own photos read" on storage.objects for select to authenticated
  using (bucket_id = 'return-photos' and public.can_access_folder((storage.foldername(name))[1]));
create policy "own photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'return-photos' and public.can_access_folder((storage.foldername(name))[1]));
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'return-photos' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
