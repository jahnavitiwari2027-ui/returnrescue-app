-- Update 2 (18 Oct 2026): remember which platform each return will sell on.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- Adds one optional column; existing rows, policies and triggers are unchanged.
alter table public.returns
  add column if not exists sale_setup jsonb
  check (sale_setup is null or jsonb_typeof(sale_setup) = 'object');

-- Make the API see the new column straight away.
notify pgrst, 'reload schema';
