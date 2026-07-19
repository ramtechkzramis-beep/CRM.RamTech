-- Пакеты услуг, срок договора и суммы.
--
-- Главное здесь: срок договора перестаёт быть константой в 6 месяцев.
-- Пакеты продаются на 3, 6 и 12 месяцев, и сегменты ППС должны тянуться
-- под срок, иначе годовой клиент уезжал бы в «просрочку» на седьмом месяце.

create type service_package as enum ('start', 'business', 'pro', 'enterprise');

alter table clients add column package service_package;
alter table clients add column contract_months int not null default 6
  check (contract_months in (3, 6, 12));
alter table clients add column development_price numeric(12, 2);
alter table clients add column subscription_price numeric(12, 2);

/**
 * Сегмент по месяцу работы и сроку договора.
 * ППС1 — первый месяц, ППС4 — последний, ППС3 — предпоследний,
 * ППС2 — всё между. После окончания срока — просрочка продления.
 *
 * Для 6 месяцев даёт прежнюю разбивку: 1 / 2-4 / 5 / 6.
 * Для 12 месяцев: 1 / 2-10 / 11 / 12. Для 3 месяцев: 1 / — / 2 / 3.
 */
create or replace function segment_for_month(m int, length_months int default 6)
  returns text language sql immutable as $$
  select case
    when m is null then null
    when m > length_months then 'overdue'
    when m <= 1 then 'ППС1'
    when m = length_months then 'ППС4'
    when m = length_months - 1 then 'ППС3'
    else 'ППС2'
  end;
$$;

-- Дата продления теперь считается от срока конкретного договора.
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

-- Продление сдвигает цикл на срок договора этого клиента, а не на жёсткие 6 месяцев.
create or replace function renew_client(p_client_id uuid)
  returns void language plpgsql set search_path = public as $$
declare
  v_start date;
  v_status client_status;
  v_months int;
  v_cycle_number int;
  v_new_start date;
begin
  select status, cycle_start_date, contract_months
    into v_status, v_start, v_months
    from clients where id = p_client_id;

  if v_status is null then
    raise exception 'Клиент не найден';
  end if;

  if v_status <> 'active' then
    raise exception 'Продлить можно только клиента в работе';
  end if;

  v_new_start := (v_start + (v_months || ' months')::interval)::date;

  select coalesce(max(cycle_number), 0) into v_cycle_number
    from client_cycles where client_id = p_client_id;

  update client_cycles
     set ended_at = v_new_start,
         renewed = true
   where client_id = p_client_id
     and cycle_number = v_cycle_number;

  insert into client_cycles (client_id, cycle_number, started_at)
  values (p_client_id, v_cycle_number + 1, v_new_start);

  update clients set cycle_start_date = v_new_start where id = p_client_id;
end;
$$;
