alter table public.orders
  alter column status set default 'produccion',
  alter column delivery_type set default 'local',
  alter column destination set default 'Santa Cruz';

update public.orders
set status = 'produccion'
where status in ('nuevo', 'diseno');

update public.orders
set delivery_type = 'local',
    destination = 'Santa Cruz'
where delivery_type = 'recogida';

update public.orders
set destination = 'Santa Cruz'
where delivery_type = 'local'
  and (destination is null or btrim(destination) = '');
