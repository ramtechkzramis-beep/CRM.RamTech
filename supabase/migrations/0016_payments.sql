-- Условия оплаты: скидка, схема расчёта и график платежей.
--
-- Скидка применяется ко всей сделке — и к разработке, и к абонементу.
-- Цены пакета храним «как есть», без скидки: иначе через полгода не понять,
-- дали клиенту скидку или просто продали дешевле.

create type payment_scheme as enum (
  'full',            -- Оплата целиком
  'split_50_50',     -- Транш 50/50
  'split_30_30_40',  -- Транш 30/30/40
  'kaspi'            -- Рассрочка Kaspi: банк платит нам сразу
);

alter table clients add column discount_percent int not null default 0
  check (discount_percent between 0 and 20);
alter table clients add column payment_scheme payment_scheme;

create table client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  -- Порядковый номер платежа: 1, 2, 3.
  seq int not null,
  -- Доля от общей суммы. Храним, чтобы при смене цен пересчитать график.
  percent int not null check (percent between 1 and 100),
  amount numeric(12, 2) not null,
  due_date date,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, seq)
);

create index client_payments_client_idx on client_payments (client_id);
create index client_payments_due_idx on client_payments (due_date) where is_paid = false;

-- Дату оплаты проставляет БД: две вкладки или повторный клик разъедут
-- отметку и время, как это уже было с задачами.
create function sync_payment_paid_at() returns trigger
  language plpgsql as $$
begin
  if new.is_paid and not coalesce(old.is_paid, false) then
    new.paid_at := now();
  elsif not new.is_paid then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

create trigger client_payments_sync_paid_at
  before insert or update on client_payments
  for each row execute function sync_payment_paid_at();

alter table client_payments enable row level security;

-- Платежи видны и правятся вместе с клиентом: доступ определяет политика
-- на clients, отдельных правил не нужно.
create policy client_payments_read on client_payments
  for select to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  );

create policy client_payments_write on client_payments
  for all to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  ) with check (
    exists (select 1 from clients c where c.id = client_id)
  );

-- View пересоздаём: «select c.*» фиксирует список колонок при создании.
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
