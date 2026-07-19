-- Убрать текущего клиента из списка (в архив) с указанием причины.
-- Права проверяет функция в БД, а не только RLS: clients_update разрешает
-- владельцу и руководителю отдела править любую колонку своего клиента,
-- а убирать клиента из текущих должен иметь право только руководитель
-- компании (admin) — тот же приём, что и в set_client_stage.

create type client_archive_reason as enum (
  'client_request',
  'non_payment',
  'dissatisfied',
  'business_closed',
  'competitor',
  'other'
);

alter table clients add column archived_reason client_archive_reason;
alter table clients add column archived_comment text;
alter table clients add column archived_at timestamptz;
alter table clients add column archived_by uuid references profiles (id) on delete set null;

create function archive_client(
  p_client_id uuid,
  p_reason client_archive_reason,
  p_comment text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_role app_role;
  v_status client_status;
begin
  select role into v_role from profiles where id = auth.uid();

  if v_role is null then
    raise exception 'Профиль не найден';
  end if;

  if v_role <> 'admin' then
    raise exception 'Убрать клиента из текущих может только руководитель';
  end if;

  select status into v_status from clients where id = p_client_id;

  if v_status is null then
    raise exception 'Клиент не найден';
  end if;

  if v_status <> 'active' then
    raise exception 'Убрать из текущих можно только клиента в работе';
  end if;

  update clients
     set status = 'archived',
         archived_reason = p_reason,
         archived_comment = p_comment,
         archived_at = now(),
         archived_by = auth.uid()
   where id = p_client_id;
end;
$$;

/**
 * Возврат из архива — на случай, если убрали по ошибке. Дата цикла (ППС)
 * не трогается: клиент возвращается ровно туда, где был.
 */
create function restore_client(p_client_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare
  v_role app_role;
  v_status client_status;
begin
  select role into v_role from profiles where id = auth.uid();

  if v_role is null then
    raise exception 'Профиль не найден';
  end if;

  if v_role <> 'admin' then
    raise exception 'Восстановить клиента может только руководитель';
  end if;

  select status into v_status from clients where id = p_client_id;

  if v_status is null then
    raise exception 'Клиент не найден';
  end if;

  if v_status <> 'archived' then
    raise exception 'Восстановить можно только архивного клиента';
  end if;

  update clients
     set status = 'active',
         archived_reason = null,
         archived_comment = null,
         archived_at = null,
         archived_by = null
   where id = p_client_id;
end;
$$;

-- Имя того, кто архивировал, — для отображения в списке архива.
-- View пересоздаём целиком (drop + create, не replace): «select c.*»
-- фиксирует список колонок при создании, а мы только что добавили
-- новые колонки в clients — как и в 0016_payments.sql.
drop view if exists clients_with_segment;

create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
  pa.full_name as archived_by_name,
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
