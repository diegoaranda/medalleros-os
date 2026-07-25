create extension if not exists pgcrypto;

create type public.order_status as enum (
  'nuevo',
  'diseno',
  'produccion',
  'listo',
  'entregado',
  'cancelado'
);

create type public.delivery_type as enum (
  'envio',
  'recogida',
  'local'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medallero_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  suggested_price numeric(12, 2) not null default 0 check (suggested_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_settings (
  id text primary key default 'default' check (id = 'default'),
  production_expense_default numeric(12, 2) not null default 30 check (production_expense_default >= 0),
  reserve_percentage numeric(5, 2) not null default 10 check (reserve_percentage >= 0 and reserve_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  request_number text not null,
  customer_name text not null,
  customer_phone text not null,
  sport_id uuid references public.sports(id) on delete set null,
  sport_name text not null,
  catalog_item_id uuid references public.medallero_catalog(id) on delete set null,
  catalog_item_name text,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  status public.order_status not null default 'produccion',
  delivery_type public.delivery_type not null default 'local',
  destination text default 'Santa Cruz',
  notes text,
  production_cost numeric(12, 2) check (production_cost is null or production_cost >= 0),
  production_expense numeric(12, 2) not null default 30 check (production_expense >= 0),
  production_notes text,
  due_date date,
  delivered_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  payment_method_name text not null,
  notes text,
  paid_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.expense_categories(id) on delete set null,
  category_name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  expense_date date not null default current_date,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create index orders_status_idx on public.orders(status);
create index orders_request_number_idx on public.orders(request_number);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_due_date_idx on public.orders(due_date) where due_date is not null;
create index orders_created_by_idx on public.orders(created_by);
create index order_payments_order_id_idx on public.order_payments(order_id);
create index order_payments_paid_at_idx on public.order_payments(paid_at desc);
create index expenses_expense_date_idx on public.expenses(expense_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger sports_set_updated_at
before update on public.sports
for each row execute function public.set_updated_at();

create trigger medallero_catalog_set_updated_at
before update on public.medallero_catalog
for each row execute function public.set_updated_at();

alter table public.medallero_catalog add column if not exists description text;

create trigger payment_methods_set_updated_at
before update on public.payment_methods
for each row execute function public.set_updated_at();

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function public.set_updated_at();

create trigger financial_settings_set_updated_at
before update on public.financial_settings
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.order_financials
with (security_invoker = true)
as
select
  o.*,
  coalesce(sum(op.amount), 0)::numeric(12, 2) as paid_amount,
  greatest(o.total_amount - coalesce(sum(op.amount), 0), 0)::numeric(12, 2) as balance_amount
from public.orders o
left join public.order_payments op on op.order_id = o.id
group by o.id;

create or replace view public.business_metrics
with (security_invoker = true)
as
with financial_orders as (
  select
    o.total_amount,
    coalesce(o.production_cost, 0) as production_cost,
    o.production_expense,
    o.total_amount - coalesce(o.production_cost, 0) - o.production_expense as gross_profit,
    greatest(o.total_amount - coalesce(o.production_cost, 0) - o.production_expense, 0)
      * (fs.reserve_percentage / 100) as reserve_amount
  from public.orders o
  cross join public.financial_settings fs
  where o.status <> 'cancelado'
)
select
  coalesce((select sum(total_amount) from financial_orders), 0)::numeric(12, 2) as total_sold,
  coalesce((select sum(amount) from public.order_payments), 0)::numeric(12, 2) as total_collected,
  coalesce((
    select sum(balance_amount)
    from public.order_financials
    where status <> 'cancelado'
  ), 0)::numeric(12, 2) as pending_balance,
  coalesce((select sum(production_cost) from financial_orders), 0)::numeric(12, 2) as eugenio_cost,
  coalesce((select sum(production_expense) from financial_orders), 0)::numeric(12, 2) as production_expenses,
  coalesce((select sum(gross_profit) from financial_orders), 0)::numeric(12, 2) as gross_profit,
  coalesce((select sum(reserve_amount) from financial_orders), 0)::numeric(12, 2) as reserve_amount,
  coalesce((select sum(gross_profit - reserve_amount) from financial_orders), 0)::numeric(12, 2) as net_profit;

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.medallero_catalog enable row level security;
alter table public.payment_methods enable row level security;
alter table public.expense_categories enable row level security;
alter table public.financial_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_payments enable row level security;
alter table public.expenses enable row level security;

create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Authenticated users can manage sports"
on public.sports for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage medallero catalog"
on public.medallero_catalog for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage payment methods"
on public.payment_methods for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage expense categories"
on public.expense_categories for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage financial settings"
on public.financial_settings for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage orders"
on public.orders for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage order payments"
on public.order_payments for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage expenses"
on public.expenses for all
to authenticated
using (true)
with check (true);

insert into public.sports (name) values
  ('Fútbol'),
  ('Basquetbol'),
  ('Voleibol'),
  ('Natación'),
  ('Atletismo'),
  ('Tenis'),
  ('Ciclismo'),
  ('Gimnasia')
on conflict (name) do nothing;

insert into public.financial_settings (id, production_expense_default, reserve_percentage)
values ('default', 30, 10)
on conflict (id) do nothing;

insert into public.medallero_catalog (name, suggested_price) values
  ('Medallero clásico', 2500),
  ('Medallero moderno', 3500),
  ('Medallero personalizado', 4500),
  ('Medallero premium', 6000)
on conflict (name) do update
set suggested_price = excluded.suggested_price,
    is_active = true;

insert into public.payment_methods (name) values
  ('Efectivo'),
  ('Transferencia'),
  ('Tarjeta'),
  ('Otro')
on conflict (name) do nothing;

insert into public.expense_categories (name) values
  ('Materiales'),
  ('Transporte'),
  ('Empaque'),
  ('Servicios'),
  ('Otros')
on conflict (name) do nothing;
