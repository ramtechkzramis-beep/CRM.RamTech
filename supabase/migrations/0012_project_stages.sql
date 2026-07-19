-- Этапы работы над проектом после заключения договора.
--
-- Это не то же самое, что ППС: ППС показывает, сколько клиент с нами работает
-- и когда продление, а этап — где сейчас проект. Клиент может быть на ППС2
-- и при этом всё ещё на тестировании.

create type project_stage as enum (
  'signing',      -- Оформление: подписываем договор, ждём оплату
  'spec',         -- Подтверждение ТЗ
  'development',  -- На разработке
  'testing',      -- На тестировании
  'approved'      -- Одобрен: сдан клиенту, на сопровождении
);

alter table clients add column stage project_stage;
alter table clients add column stage_updated_at timestamptz;

create index clients_stage_idx on clients (stage) where status = 'active';

-- Дату смены этапа проставляем в БД: по ней видно, сколько проект
-- висит на одном месте, а из приложения её легко забыть обновить.
create function sync_stage_updated_at() returns trigger
  language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_updated_at := now();
  end if;
  return new;
end;
$$;

create trigger clients_sync_stage
  before update on clients
  for each row execute function sync_stage_updated_at();

-- Клиент, переходящий в работу, начинает с оформления.
create or replace function activate_client(p_client_id uuid, p_start_date date)
  returns void language plpgsql set search_path = public as $$
declare
  v_status client_status;
begin
  select status into v_status from clients where id = p_client_id;

  if v_status is null then
    raise exception 'Клиент не найден';
  end if;

  if v_status = 'active' then
    raise exception 'Клиент уже в работе';
  end if;

  if p_start_date > current_date then
    raise exception 'Дата начала работы не может быть в будущем';
  end if;

  update clients
     set status = 'active',
         cycle_start_date = p_start_date,
         stage = coalesce(stage, 'signing'),
         stage_updated_at = now()
   where id = p_client_id;

  insert into client_cycles (client_id, cycle_number, started_at)
  values (p_client_id, 1, p_start_date);
end;
$$;

-- View пересоздаём: «select c.*» разворачивается в список колонок при создании,
-- новые колонки таблицы туда сами не попадают.
drop view if exists clients_with_segment;

create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
  month_in_cycle(c.cycle_start_date) as month_in_cycle,
  case
    when c.status = 'active'
      then segment_for_month(month_in_cycle(c.cycle_start_date), c.contract_months)
    else null
  end as segment,
  case
    when c.cycle_start_date is null then null
    else c.cycle_start_date + (c.contract_months || ' months')::interval
  end::date as renewal_date,
  case
    when c.cycle_start_date is null then null
    else (c.cycle_start_date + (c.contract_months || ' months')::interval)::date - current_date
  end as days_to_renewal
from clients c
left join profiles p on p.id = c.owner_id;
