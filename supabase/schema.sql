-- ReturnRescue database schema.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.


-- ───────────────────────── returns ─────────────────────────
create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null check (char_length(name) between 1 and 200),
  sku text not null check (char_length(sku) between 1 and 80),
  category text not null,
  original_price numeric(12,2) not null default 0 check (original_price >= 0),
  return_reason text not null default '',
  condition_notes text not null default '' check (char_length(condition_notes) <= 2000),
  photos text[] not null default '{}',
  seal_intact boolean not null default false,

  resale_price numeric(12,2) not null default 0 check (resale_price >= 0),
  refurb_resale_price numeric(12,2) not null default 0 check (refurb_resale_price >= 0),
  selling_fee_pct numeric(5,2) not null default 0 check (selling_fee_pct between 0 and 100),
  refurb_cost numeric(12,2) not null default 0 check (refurb_cost >= 0),
  handling_cost numeric(12,2) not null default 0 check (handling_cost >= 0),
  liquidation_price numeric(12,2) not null default 0 check (liquidation_price >= 0),
  liquidation_fee numeric(12,2) not null default 0 check (liquidation_fee >= 0),
  recycling_value numeric(12,2) not null default 0 check (recycling_value >= 0),
  recycling_cost numeric(12,2) not null default 0 check (recycling_cost >= 0),
  return_shipping_cost numeric(12,2) not null default 0 check (return_shipping_cost >= 0),
  value_basis jsonb not null default '{}'::jsonb,

  status text not null default 'awaiting_inspection'
    check (status in ('awaiting_inspection','inspected','decided','completed')),
  ai_inspection jsonb,
  grade text check (grade in ('A','B','C','MANUAL_REVIEW')),
  grade_source text check (grade_source in ('ai_accepted','ai_corrected','manual')),
  grade_note text not null default '',
  defects jsonb not null default '[]'::jsonb,

  decision_route text check (decision_route in ('restock','refurbish','liquidate','recycle')),
  decision_net numeric(12,2),
  recommended_route text check (recommended_route in ('restock','refurbish','liquidate','recycle')),
  decision_reason text not null default '',
  decided_at timestamptz,
  realized_amount numeric(12,2),
  completed_at timestamptz
);

create index if not exists returns_user_created_idx on public.returns (user_id, created_at desc);

-- ───────────────────────── entitlements ─────────────────────────
-- Written ONLY by the verified Dodo webhook (service role). Users can read their own row.
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'none',
  dodo_subscription_id text unique,
  dodo_customer_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── webhook log (idempotency) ─────────────────────────
create table if not exists public.webhook_events (
  id text primary key,            -- the `webhook-id` header from Dodo
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null
);

-- ───────────────────────── AI usage metering ─────────────────────────
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('inspection','insights')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

-- ───────────────────────── helper: is_pro ─────────────────────────
create or replace function public.is_pro(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = uid and e.plan = 'pro' and e.status = 'active'
  );
$$;

-- ───────────────────────── free-plan item limit + updated_at ─────────────────────────
create or replace function public.returns_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  free_limit int := 15;
begin
  if not public.is_pro(new.user_id) then
    if (select count(*) from public.returns where user_id = new.user_id) >= free_limit then
      raise exception 'FREE_PLAN_LIMIT: The free plan stores up to % returns. Upgrade to Pro for unlimited records.', free_limit
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists returns_limit on public.returns;
create trigger returns_limit before insert on public.returns
  for each row execute function public.returns_before_insert();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id; -- ownership can never change
  return new;
end $$;

drop trigger if exists returns_touch on public.returns;
create trigger returns_touch before update on public.returns
  for each row execute function public.touch_updated_at();

-- ───────────────────────── service lookup: user id by email ─────────────────────────
create or replace function public.user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = auth, public as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.returns enable row level security;
alter table public.entitlements enable row level security;
alter table public.webhook_events enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "own returns select" on public.returns;
drop policy if exists "own returns insert" on public.returns;
drop policy if exists "own returns update" on public.returns;
drop policy if exists "own returns delete" on public.returns;
create policy "own returns select" on public.returns for select to authenticated using (user_id = auth.uid());
create policy "own returns insert" on public.returns for insert to authenticated with check (user_id = auth.uid());
create policy "own returns update" on public.returns for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own returns delete" on public.returns for delete to authenticated using (user_id = auth.uid());

drop policy if exists "own entitlement read" on public.entitlements;
create policy "own entitlement read" on public.entitlements for select to authenticated using (user_id = auth.uid());

drop policy if exists "own usage read" on public.ai_usage;
create policy "own usage read" on public.ai_usage for select to authenticated using (user_id = auth.uid());
-- webhook_events: no policies → only the service role can touch it.

-- ───────────────────────── Storage: private photo bucket ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('return-photos', 'return-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
drop policy if exists "own photos write" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;
create policy "own photos read" on storage.objects for select to authenticated
  using (bucket_id = 'return-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'return-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'return-photos' and (storage.foldername(name))[1] = auth.uid()::text);
