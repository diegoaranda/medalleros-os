alter table public.orders
  add column if not exists request_number text;

update public.orders
set request_number = 'LEGACY-' || upper(left(replace(id::text, '-', ''), 8))
where request_number is null or btrim(request_number) = '';

alter table public.orders
  alter column request_number set not null,
  alter column catalog_item_name drop not null;

alter table public.orders
  add column if not exists production_expense numeric(12, 2) not null default 30;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_production_cost_nonnegative'
  ) then
    alter table public.orders
      add constraint orders_production_cost_nonnegative
      check (production_cost is null or production_cost >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_production_expense_nonnegative'
  ) then
    alter table public.orders
      add constraint orders_production_expense_nonnegative
      check (production_expense >= 0);
  end if;
end
$$;

create index if not exists orders_request_number_idx
  on public.orders (request_number);

create table if not exists public.financial_settings (
  id text primary key default 'default' check (id = 'default'),
  production_expense_default numeric(12, 2) not null default 30
    check (production_expense_default >= 0),
  reserve_percentage numeric(5, 2) not null default 10
    check (reserve_percentage >= 0 and reserve_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.financial_settings (
  id,
  production_expense_default,
  reserve_percentage
)
values ('default', 30, 10)
on conflict (id) do nothing;

alter table public.financial_settings enable row level security;

drop policy if exists "Authenticated users can manage financial settings"
  on public.financial_settings;

create policy "Authenticated users can manage financial settings"
on public.financial_settings for all
to authenticated
using (true)
with check (true);

drop trigger if exists financial_settings_set_updated_at
  on public.financial_settings;

create trigger financial_settings_set_updated_at
before update on public.financial_settings
for each row execute function public.set_updated_at();

drop view if exists public.business_metrics;
drop view if exists public.order_financials;

create view public.order_financials
with (security_invoker = true)
as
select
  o.*,
  coalesce(sum(op.amount), 0)::numeric(12, 2) as paid_amount,
  greatest(o.total_amount - coalesce(sum(op.amount), 0), 0)::numeric(12, 2) as balance_amount
from public.orders o
left join public.order_payments op on op.order_id = o.id
group by o.id;

create view public.business_metrics
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
