-- Причина перевода в наработки — заполняется в окне подтверждения перед
-- переводом, чтобы потом было видно, почему компания считается готовой
-- работать с нами на 70-80%.
alter table clients add column warm_reason text;
alter table clients add column warm_at timestamptz;
alter table clients add column warm_by uuid references profiles(id) on delete set null;

-- «select c.*» фиксирует список колонок при создании — новые поля
-- clients не попадут в представление без пересоздания.
drop view if exists clients_with_segment;

create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
  pa.full_name as archived_by_name,
  pw.full_name as warm_by_name,
  greatest(
    (select max(cc.created_at) from client_comments cc where cc.client_id = c.id),
    (select max(t.completed_at) from tasks t where t.client_id = c.id and t.status = 'done')
  ) as last_activity_at,
  month_in_cycle(c.cycle_start_date) as month_in_cycle,
  case
    when c.status = 'active' and c.cycle_start_date is not null
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
left join profiles p on p.id = c.owner_id
left join profiles pa on pa.id = c.archived_by
left join profiles pw on pw.id = c.warm_by;
