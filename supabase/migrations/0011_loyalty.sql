-- Лояльность клиента: зелёный / жёлтый / красный.
--
-- Ставится вручную и только руками менеджера: это оценка отношения клиента
-- к нам, её нельзя вывести из данных. Клиент может исправно платить и при
-- этом быть недоволен продуктом — цифры об этом не скажут, а менеджер знает.

create type loyalty_level as enum ('green', 'yellow', 'red');

alter table clients add column loyalty loyalty_level;
alter table clients add column loyalty_note text;
alter table clients add column loyalty_updated_at timestamptz;

create index clients_loyalty_idx on clients (loyalty) where status = 'active';

-- Дату оценки проставляем в БД: важно видеть, не протухла ли она,
-- а из приложения её легко забыть обновить.
create function sync_loyalty_updated_at() returns trigger
  language plpgsql as $$
begin
  if new.loyalty is distinct from old.loyalty then
    new.loyalty_updated_at := now();
  end if;
  return new;
end;
$$;

create trigger clients_sync_loyalty
  before update on clients
  for each row execute function sync_loyalty_updated_at();

-- View обязательно пересоздать: «select c.*» разворачивается в список колонок
-- в момент создания view, и новые колонки таблицы туда сами не попадают.
-- Без этого loyalty сохраняется в clients, но список клиентов её не видит.
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
