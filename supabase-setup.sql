-- 24C CLOTHING: Run this entire script in Supabase > SQL Editor.
create extension if not exists "pgcrypto";

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  description text default '',
  image_url text default '',
  tag text default '',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'New',
  created_at timestamptz default now()
);

alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Admins can only read their own admin record.
drop policy if exists "Admins can read own record" on public.admins;
create policy "Admins can read own record" on public.admins
for select to authenticated using (id = auth.uid());

-- Anyone can see active products. Only admins can manage products.
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
for select to anon, authenticated using (is_active = true or exists (
  select 1 from public.admins where admins.id = auth.uid()
));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products
for insert to authenticated with check (exists (
  select 1 from public.admins where admins.id = auth.uid()
));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products
for update to authenticated using (exists (
  select 1 from public.admins where admins.id = auth.uid()
)) with check (exists (
  select 1 from public.admins where admins.id = auth.uid()
));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
for delete to authenticated using (exists (
  select 1 from public.admins where admins.id = auth.uid()
));

-- Customers can place orders. Only admins can read/update/delete orders.
drop policy if exists "Public can place orders" on public.orders;
create policy "Public can place orders" on public.orders
for insert to anon, authenticated with check (
  length(trim(customer_name)) > 0 and
  length(trim(phone)) > 0 and
  length(trim(address)) > 0 and
  quantity > 0
);

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders" on public.orders
for select to authenticated using (exists (
  select 1 from public.admins where admins.id = auth.uid()
));

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders" on public.orders
for update to authenticated using (exists (
  select 1 from public.admins where admins.id = auth.uid()
)) with check (exists (
  select 1 from public.admins where admins.id = auth.uid()
));

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders" on public.orders
for delete to authenticated using (exists (
  select 1 from public.admins where admins.id = auth.uid()
));
