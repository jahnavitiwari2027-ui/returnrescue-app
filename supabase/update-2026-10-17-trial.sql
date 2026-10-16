-- Update 1 (17 Oct 2026): no return limit during the 14-day free trial.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
create or replace function public.returns_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  free_limit int := 15;
begin
  if not public.is_pro(new.user_id)
     and not exists (select 1 from auth.users u where u.id = new.user_id and u.created_at > now() - interval '14 days') then
    if (select count(*) from public.returns where user_id = new.user_id) >= free_limit then
      raise exception 'FREE_PLAN_LIMIT: Your free trial has ended and the free plan stores up to % returns. Upgrade to Pro for unlimited records.', free_limit
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
