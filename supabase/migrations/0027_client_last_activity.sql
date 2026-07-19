-- Время последнего касания компании — комментарий или закрытая задача,
-- смотря что было позже. В 0026 учитывался только комментарий; задачи
-- (звонки, встречи) — не менее важный сигнал «работали с этим лидом».
drop view if exists clients_with_segment;

create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
  pa.full_name as archived_by_name,
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
left join profiles pa on pa.id = c.archived_by;
