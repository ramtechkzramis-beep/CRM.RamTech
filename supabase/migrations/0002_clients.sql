-- Клиенты: холодная база, текущие клиенты, циклы работы и сегменты ППС1–ППС4.

create type client_status as enum ('cold', 'active', 'archived');
create type business_size as enum ('small', 'medium', 'large');

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  business_size business_size,
  source text,
  notes text,
  status client_status not null default 'cold',
  -- Начало текущего 6-месячного цикла. Пусто, пока клиент в холодной базе;
  -- заполняется при переводе в работу и сдвигается при каждом продлении.
  cycle_start_date date,
  owner_id uuid not null references profiles (id) on delete restrict,
  department_id uuid references departments (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id) on delete set null,

  -- Клиент в работе обязан иметь дату старта, иначе сегмент посчитать не из чего.
  constraint active_client_needs_cycle_start
    check (status <> 'active' or cycle_start_date is not null)
);

create index clients_status_idx on clients (status);
create index clients_owner_idx on clients (owner_id);
create index clients_department_idx on clients (department_id);

create table client_cycles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  cycle_number int not null,
  started_at date not null,
  ended_at date,
  renewed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_id, cycle_number)
);

create index client_cycles_client_idx on client_cycles (client_id);

-- Длительность цикла договора. Вынесено в функцию, чтобы поменять срок в одном месте.
create function cycle_length_months() returns int
  language sql immutable as $$ select 6 $$;

/**
 * Номер месяца работы клиента в текущем цикле: в первый месяц — 1.
 * Считаем полные прошедшие месяцы и прибавляем 1.
 */
create function month_in_cycle(start_date date) returns int
  language sql stable as $$
  select case
    when start_date is null or start_date > current_date then null
    else (
      extract(year from age(current_date, start_date))::int * 12
      + extract(month from age(current_date, start_date))::int
      + 1
    )
  end;
$$;

/**
 * Сегмент клиента по месяцу работы: 1 → ППС1, 2–4 → ППС2, 5 → ППС3, 6 → ППС4,
 * дальше цикл истёк без продления. Сегмент нигде не хранится — он зависит от
 * сегодняшней даты и устарел бы к следующему утру.
 */
create function segment_for_month(m int) returns text
  language sql immutable as $$
  select case
    when m is null then null
    when m <= 1 then 'ППС1'
    when m between 2 and 4 then 'ППС2'
    when m = 5 then 'ППС3'
    when m = 6 then 'ППС4'
    else 'overdue'
  end;
$$;

-- security_invoker обязателен: без него view выполняется с правами владельца
-- и обходит RLS — любой менеджер увидел бы всех клиентов компании.
-- Имя ответственного отдаём прямо отсюда, а не через связь PostgREST:
-- для view связи выводятся не всегда, а join здесь дешёвый и предсказуемый.
create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
  month_in_cycle(c.cycle_start_date) as month_in_cycle,
  case
    when c.status = 'active' then segment_for_month(month_in_cycle(c.cycle_start_date))
    else null
  end as segment,
  case
    when c.cycle_start_date is null then null
    else c.cycle_start_date + (cycle_length_months() || ' months')::interval
  end::date as renewal_date,
  case
    when c.cycle_start_date is null then null
    else (c.cycle_start_date + (cycle_length_months() || ' months')::interval)::date - current_date
  end as days_to_renewal
from clients c
left join profiles p on p.id = c.owner_id;

alter table clients enable row level security;
alter table client_cycles enable row level security;

-- Менеджер видит своих клиентов и клиентов своего отдела, админ — всех.
create policy clients_read on clients
  for select to authenticated using (
    is_admin()
    or owner_id = auth.uid()
    or (department_id is not null and department_id = current_department())
  );

create policy clients_insert on clients
  for insert to authenticated with check (
    is_admin() or owner_id = auth.uid()
  );

create policy clients_update on clients
  for update to authenticated using (
    is_admin()
    or owner_id = auth.uid()
    or (
      current_app_role() = 'head'
      and department_id is not null
      and department_id = current_department()
    )
  ) with check (
    is_admin()
    or owner_id = auth.uid()
    or (
      current_app_role() = 'head'
      and department_id is not null
      and department_id = current_department()
    )
  );

create policy clients_admin_delete on clients
  for delete to authenticated using (is_admin());

-- Циклы видны и правятся вместе с клиентом, к которому относятся.
create policy client_cycles_read on client_cycles
  for select to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  );

create policy client_cycles_write on client_cycles
  for all to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  ) with check (
    exists (select 1 from clients c where c.id = client_id)
  );
