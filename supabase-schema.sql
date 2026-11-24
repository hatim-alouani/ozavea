-- OZAVEA starter schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null check (jsonb_typeof(name)='object'),
  description jsonb not null default '{}'::jsonb check (jsonb_typeof(description)='object'),
  price numeric(10,2) not null check (price >= 0),
  discount_price numeric(10,2) check (discount_price is null or (discount_price >= 0 and discount_price < price)),
  quantity integer not null default 0 check (quantity >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
-- Public users can read active catalog items. Inventory qty=0 remains visible as out-of-stock.
create policy "Public can read active products" on public.products for select using (active=true);
-- No anonymous insert/update/delete policies. Add authenticated admin policies only after setting up a role/claim.
-- NOTE: Admin UI writes will be rejected by RLS until secure auth and admin policies are added.
