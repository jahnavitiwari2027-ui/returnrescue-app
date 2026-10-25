-- Update (26 Oct 2026): Starter and Pro plans, monthly or yearly.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

-- Which Dodo product (plan and interval) each subscription is on.
alter table public.entitlements add column if not exists dodo_product_id text;
alter table public.entitlements add column if not exists billing_interval text check (billing_interval is null or billing_interval in ('month', 'year'));

-- Any active paid plan (Starter or Pro) removes the free plan's 15-return limit.
create or replace function public.is_pro(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = uid and e.plan in ('starter', 'pro') and e.status = 'active'
  );
$$;

-- Same free-plan rule as before; only the message mentions both plans now.
create or replace function public.returns_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  free_limit int := 15;
begin
  if not public.is_pro(new.user_id)
     and not exists (select 1 from auth.users u where u.id = new.user_id and u.created_at > now() - interval '14 days') then
    if (select count(*) from public.returns where user_id = new.user_id) >= free_limit then
      raise exception 'FREE_PLAN_LIMIT: Your free trial has ended and the free plan stores up to % returns. Choose Starter or Pro for unlimited records.', free_limit
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
