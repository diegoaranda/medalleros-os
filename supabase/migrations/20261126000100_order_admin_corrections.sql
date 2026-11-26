-- Prepared only. Apply separately after authorization. No existing data is changed.
-- Existing permissions: authenticated workshop users share orders (no admin role).
-- INVOKER preserves orders/payments RLS; no service key or RLS bypass is used.
begin;

-- Fail closed if the deployed relationship differs from the reviewed schema.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where contype = 'f' and conrelid = 'public.order_payments'::regclass
      and confrelid = 'public.orders'::regclass and confdeltype = 'c'
      and conkey = array[(select attnum from pg_attribute
        where attrelid = 'public.order_payments'::regclass and attname = 'order_id')]::smallint[]
      and confkey = array[(select attnum from pg_attribute
        where attrelid = 'public.orders'::regclass and attname = 'id')]::smallint[]
  ) then
    raise exception 'order_payments.order_id must reference orders ON DELETE CASCADE';
  end if;
  if not exists (select 1 from pg_enum where enumtypid = 'public.order_status'::regtype and enumlabel = 'cancelado') then
    raise exception 'Missing existing cancelado status';
  end if;
  -- Unexpected dependents must be reviewed before enabling permanent deletion.
  if exists (
    select 1 from pg_constraint where contype = 'f' and confrelid = 'public.orders'::regclass
      and conrelid <> 'public.order_payments'::regclass
  ) then
    raise exception 'Unreviewed order dependencies. Review before applying this migration.';
  end if;
end $$;

create table public.order_admin_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  action text not null check (action in ('cancel', 'undo_delivery')),
  previous_status public.order_status not null,
  new_status public.order_status not null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index order_admin_events_order_id_idx on public.order_admin_events(order_id);
alter table public.order_admin_events enable row level security;
create policy "Workshop users can read order admin history"
  on public.order_admin_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "Workshop users can record own order admin actions"
  on public.order_admin_events for insert to authenticated
  with check (created_by = auth.uid() and exists (select 1 from public.orders o where o.id = order_id));
grant select, insert on public.order_admin_events to authenticated;

create function public.get_order_admin_snapshot(p_order_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_snapshot jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Unauthorized';
  end if;
  -- One statement/snapshot: reuse the existing balance/paid formulas from the view.
  select jsonb_build_object('order', to_jsonb(o), 'payments', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.id) from public.order_payments p where p.order_id = o.id
  ), '[]'::jsonb)) into v_snapshot
  from public.order_financials o where o.id = p_order_id;
  if v_snapshot is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;
  return v_snapshot || jsonb_build_object('revision', md5(v_snapshot::text));
end $$;

create function public.apply_order_admin_action(
  p_order_id uuid, p_action text, p_expected_revision text, p_financial_confirmation boolean default false
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_snapshot jsonb;
  v_new_status public.order_status;
  v_affected uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Unauthorized';
  end if;
  if p_action is null or p_action not in ('cancel', 'delete', 'undo_delivery') then
    raise exception using errcode = '22023', message = 'Invalid action';
  end if;
  -- Parent FOR UPDATE also blocks concurrent FK inserts of new payments.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Order not found'; end if;
  -- Existing payments cannot be edited/deleted while the snapshot is checked.
  perform id from public.order_payments where order_id = p_order_id order by id for update;
  v_snapshot := public.get_order_admin_snapshot(p_order_id);
  if p_expected_revision is null or p_expected_revision is distinct from v_snapshot->>'revision' then
    raise exception using errcode = '40001', message = 'Order changed. Reload confirmation.';
  end if;

  if p_action = 'delete' then
    if (jsonb_array_length(v_snapshot->'payments') > 0 or v_order.production_cost is not null or v_order.production_expense > 0)
       and p_financial_confirmation is distinct from true then
      raise exception using errcode = '22023', message = 'Explicit financial confirmation required';
    end if;
    -- Only this parent is deleted. FK cascades payments + admin events atomically.
    -- Independent expenses and all other orders are untouched.
    delete from public.orders where id = p_order_id returning id into v_affected;
  else
    if p_action = 'cancel' then
      if v_order.status = 'cancelado' then
        raise exception using errcode = '22023', message = 'Order already cancelled';
      end if;
      v_new_status := 'cancelado';
      -- Keep delivered_at as historical data when cancelling a delivered order.
      update public.orders set status = v_new_status where id = p_order_id returning id into v_affected;
    else
      if v_order.status <> 'entregado' then
        raise exception using errcode = '22023', message = 'Only delivered orders can be undone';
      end if;
      v_new_status := 'listo';
      update public.orders set status = v_new_status, delivered_at = null
        where id = p_order_id returning id into v_affected;
    end if;
    if v_affected is null then raise exception using errcode = '42501', message = 'Operation not permitted'; end if;
    insert into public.order_admin_events(order_id, action, previous_status, new_status, created_by)
      values (p_order_id, p_action, v_order.status, v_new_status, auth.uid());
  end if;
  if v_affected is null then raise exception using errcode = '42501', message = 'Operation not permitted'; end if;
  return v_affected;
end $$;

revoke all on function public.get_order_admin_snapshot(uuid) from public, anon;
revoke all on function public.apply_order_admin_action(uuid, text, text, boolean) from public, anon;
grant execute on function public.get_order_admin_snapshot(uuid) to authenticated;
grant execute on function public.apply_order_admin_action(uuid, text, text, boolean) to authenticated;
commit;
