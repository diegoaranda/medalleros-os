-- Only executed by the disposable local database harness. All names/data are fictional.
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %', message; end if; end $$;
insert into auth.users(id, email) values
 ('00000000-0000-4000-8000-000000000001', 'operator@example.invalid'),
 ('00000000-0000-4000-8000-000000000002', 'other@example.invalid');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
insert into public.orders(id,request_number,customer_name,customer_phone,sport_name,total_amount,production_cost,production_expense,status,delivered_at)
values
 ('10000000-0000-4000-8000-000000000001','TEST-EMPTY','Cliente ficticio sin pagos','00000000','Prueba',200,null,0,'produccion',null),
 ('10000000-0000-4000-8000-000000000002','TEST-PAID','Cliente ficticio con pagos','00000000','Prueba',300,50,30,'produccion',null),
 ('10000000-0000-4000-8000-000000000003','TEST-CANCEL-P','Cliente ficticio producción','00000000','Prueba',400,70,30,'produccion',null),
 ('10000000-0000-4000-8000-000000000004','TEST-CANCEL-W','Cliente ficticio por envolver','00000000','Prueba',500,80,30,'envolver',null),
 ('10000000-0000-4000-8000-000000000005','TEST-UNDO','Cliente ficticio entregado','00000000','Prueba',600,90,30,'entregado',now()),
 ('10000000-0000-4000-8000-000000000006','TEST-OTHER','Otro pedido ficticio','00000000','Prueba',700,100,30,'listo',null);
insert into public.order_payments(id,order_id,amount,payment_method_name) values
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',100,'Prueba'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',150,'Prueba'),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005',600,'Prueba'),
 ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000006',50,'Prueba');
insert into public.expenses(category_name,amount,description) values ('Prueba',25,'Gasto independiente ficticio');
set role authenticated;

select public.apply_order_admin_action(id,'delete',public.get_order_admin_snapshot(id)->>'revision',false)
from public.orders where request_number='TEST-EMPTY';
select pg_temp.assert_true(not exists(select 1 from public.orders where request_number='TEST-EMPTY'),'delete without payments');

do $$ begin
 perform public.apply_order_admin_action(id,'delete',public.get_order_admin_snapshot(id)->>'revision',false)
 from public.orders where request_number='TEST-PAID';
 raise exception 'Should require financial confirmation';
 exception when invalid_parameter_value then null;
end $$;
select pg_temp.assert_true(exists(select 1 from public.orders where request_number='TEST-PAID') and exists(select 1 from public.order_payments where amount=100),'unconfirmed delete changes nothing');
select public.apply_order_admin_action(id,'delete',public.get_order_admin_snapshot(id)->>'revision',true)
from public.orders where request_number='TEST-PAID';
select pg_temp.assert_true(not exists(select 1 from public.order_payments where amount=100),'payments cascade atomically');
select pg_temp.assert_true(exists(select 1 from public.order_payments where amount=50) and (select count(*) from public.expenses)=1,'other orders and independent expenses preserved');

select public.apply_order_admin_action(id,'cancel',public.get_order_admin_snapshot(id)->>'revision',false)
from public.orders where request_number in ('TEST-CANCEL-P','TEST-CANCEL-W');
select pg_temp.assert_true((select count(*) from public.orders where status='cancelado')=2,'cancel production and wrapping');
select pg_temp.assert_true((select count(*) from public.order_admin_events where action='cancel')=2,'cancellation history');
-- No payments still requires explicit confirmation if a cost is recorded.
do $$ begin
 perform public.apply_order_admin_action(id,'delete',public.get_order_admin_snapshot(id)->>'revision',false)
 from public.orders where request_number='TEST-CANCEL-W';
 raise exception 'Should require cost confirmation without payments';
 exception when invalid_parameter_value then null;
end $$;
do $$ begin
 perform public.apply_order_admin_action(id,'cancel',public.get_order_admin_snapshot(id)->>'revision',false)
 from public.orders where request_number='TEST-CANCEL-P';
 raise exception 'Should reject duplicate cancellation';
 exception when invalid_parameter_value then null;
end $$;

select pg_temp.assert_true((select paid_amount=150 and balance_amount=250 and production_cost=70 from public.order_financials where request_number='TEST-CANCEL-P'),'cancel preserves payments costs and balance');
select pg_temp.assert_true((select total_sold=1300 and total_collected=800 and pending_balance=650 from public.business_metrics),'cancel excludes sales/balance but retains actual collections');

select public.apply_order_admin_action(id,'undo_delivery',public.get_order_admin_snapshot(id)->>'revision',false)
from public.orders where request_number='TEST-UNDO';
select pg_temp.assert_true((select status='listo' and delivered_at is null and paid_amount=600 and balance_amount=0 from public.order_financials where request_number='TEST-UNDO'),'undo delivery preserves payments and clears delivery date');
select pg_temp.assert_true((select count(*) from public.orders where status in ('envolver','listo'))=2,'delivery counter');
select pg_temp.assert_true((select count(*) from public.orders where status='entregado')=0,'delivered counter');

do $$ begin
 perform public.apply_order_admin_action(id,'undo_delivery',public.get_order_admin_snapshot(id)->>'revision',false)
 from public.orders where request_number='TEST-UNDO';
 raise exception 'Should reject repeated undo';
 exception when invalid_parameter_value then null;
end $$;
select pg_temp.assert_true((select count(*) from public.order_admin_events where action='undo_delivery')=1,'no duplicate history');

-- A payment edit after opening confirmation invalidates the revision.
do $$ declare v_id uuid; v_revision text; begin
 select id into v_id from public.orders where request_number='TEST-OTHER';
 v_revision := public.get_order_admin_snapshot(v_id)->>'revision';
 update public.order_payments set notes='Edited after confirmation' where order_id=v_id;
 begin
  perform public.apply_order_admin_action(v_id,'delete',v_revision,true);
  raise exception 'Should reject stale payment snapshot';
 exception when serialization_failure then null; end;
end $$;

-- A failed dependent write must roll back the status update as well.
reset role;
create function pg_temp.reject_admin_event() returns trigger language plpgsql as $$ begin raise exception 'Simulated audit failure'; end $$;
create trigger test_reject_admin_event before insert on public.order_admin_events for each row execute function pg_temp.reject_admin_event();
set role authenticated;
do $$ declare v_id uuid; begin
 select id into v_id from public.orders where request_number='TEST-OTHER';
 begin
  perform public.apply_order_admin_action(v_id,'cancel',public.get_order_admin_snapshot(v_id)->>'revision',false);
 exception when raise_exception then
  if sqlerrm <> 'Simulated audit failure' then raise; end if;
 end;
 perform pg_temp.assert_true((select status='listo' from public.orders where id=v_id),'atomic rollback of cancellation');
end $$;
reset role;
drop trigger test_reject_admin_event on public.order_admin_events;
-- A failed payment cascade must restore the parent and all its children.
create function pg_temp.reject_payment_delete() returns trigger language plpgsql as $$ begin raise exception 'Simulated cascade failure'; end $$;
create trigger test_reject_payment_delete before delete on public.order_payments for each row execute function pg_temp.reject_payment_delete();
set role authenticated;
do $$ declare v_id uuid; begin
 select id into v_id from public.orders where request_number='TEST-OTHER';
 begin
  perform public.apply_order_admin_action(v_id,'delete',public.get_order_admin_snapshot(v_id)->>'revision',true);
 exception when raise_exception then
  if sqlerrm <> 'Simulated cascade failure' then raise; end if;
 end;
 perform pg_temp.assert_true(exists(select 1 from public.orders where id=v_id) and exists(select 1 from public.order_payments where order_id=v_id),'atomic rollback of delete and payments');
end $$;
reset role;
drop trigger test_reject_payment_delete on public.order_payments;

-- No JWT, even with the authenticated DB role, must fail.
set request.jwt.claim.sub = '';
set role authenticated;
do $$ begin
 perform public.get_order_admin_snapshot('10000000-0000-4000-8000-000000000006');
 raise exception 'Should reject missing auth';
 exception when insufficient_privilege then null;
end $$;
reset role;
select pg_temp.assert_true(not has_function_privilege('anon','public.apply_order_admin_action(uuid,text,text,boolean)','EXECUTE'),'anon has no execute permission');
select pg_temp.assert_true(not has_function_privilege('anon','public.get_order_admin_snapshot(uuid)','EXECUTE'),'anon has no snapshot permission');

-- Prove INVOKER honours stricter orders RLS instead of bypassing it.
drop policy "Authenticated users can manage orders" on public.orders;
create policy test_own_orders on public.orders for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
set role authenticated;
do $$ begin
 perform public.apply_order_admin_action('10000000-0000-4000-8000-000000000006','delete','forged',true);
 raise exception 'Should reject unauthorized order';
 exception when no_data_found then null;
end $$;
reset role;
select pg_temp.assert_true((select count(*) from public.orders)=4,'unauthorized request changes nothing');
