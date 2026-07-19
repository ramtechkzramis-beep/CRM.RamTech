-- ППС стартует не при переводе в работу, а когда проект одобрен и размещён.
--
-- Раньше цикл начинался с даты перевода в текущие. Но между подписанием
-- договора и сдачей бота проходит от нескольких дней до месяцев: разработка,
-- согласование ТЗ, тестирование. Всё это время клиент числился бы на ППС1,
-- не пользуясь услугой, а дата продления уезжала бы на срок разработки.
--
-- Теперь порядок такой: договор → воронка → «Одобрен» → с этого дня ППС1.

-- Дата подписания договора: раньше её роль играл cycle_start_date, но это
-- разные вещи — договор подписан, а услуга ещё не оказывается.
alter table clients add column contract_signed_date date;

-- Клиент может быть в работе и без начатого ППС — он на разработке.
alter table clients drop constraint if exists active_client_needs_cycle_start;

/**
 * Перевод в работу: клиент попадает в воронку с этапа оформления.
 * ППС не начинаем — он стартует на «Одобрен».
 *
 * Именно drop, а не create or replace: параметр переименован с p_start_date
 * на p_signed_date, а переименовывать параметры замена функции не умеет.
 */
drop function if exists activate_client(uuid, date);

create function activate_client(p_client_id uuid, p_signed_date date)
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

  if p_signed_date > current_date then
    raise exception 'Дата подписания договора не может быть в будущем';
  end if;

  update clients
     set status = 'active',
         contract_signed_date = p_signed_date,
         stage = coalesce(stage, 'signing'),
         stage_updated_at = now()
   where id = p_client_id;
end;
$$;

/**
 * Переход на «Одобрен» запускает ППС: с этого дня клиент пользуется услугой.
 * Делаем триггером, а не в приложении: этап можно поменять из любого места,
 * и старт ППС не должен зависеть от того, откуда именно.
 */
create function start_pps_on_approval() returns trigger
  language plpgsql as $$
begin
  if new.stage = 'approved'
     and old.stage is distinct from 'approved'
     and new.cycle_start_date is null then
    new.cycle_start_date := current_date;
  end if;
  return new;
end;
$$;

create trigger clients_start_pps_on_approval
  before update on clients
  for each row execute function start_pps_on_approval();

/** Первый цикл заводим сразу за стартом ППС — из него растёт история продлений. */
create function create_first_cycle() returns trigger
  language plpgsql as $$
begin
  if new.cycle_start_date is not null
     and old.cycle_start_date is null
     and not exists (select 1 from client_cycles where client_id = new.id) then
    insert into client_cycles (client_id, cycle_number, started_at)
    values (new.id, 1, new.cycle_start_date);
  end if;
  return new;
end;
$$;

create trigger clients_create_first_cycle
  after update on clients
  for each row execute function create_first_cycle();

-- Сегмент считаем только у тех, кто дошёл до размещения: пока проект
-- в разработке, ППС не идёт, и показывать ППС1 было бы враньём.
drop view if exists clients_with_segment;

create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
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
left join profiles p on p.id = c.owner_id;
