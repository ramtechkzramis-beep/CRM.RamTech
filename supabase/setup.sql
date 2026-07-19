-- CRM RamTech: полная схема базы.
-- Сгенерировано из supabase/migrations/. Выполнить целиком в Supabase SQL Editor на чистой базе.

-- ===== 0001_foundation.sql =====

-- Фундамент CRM RamTech: отделы, сотрудники, роли, права доступа.

create type app_role as enum ('admin', 'head', 'manager');

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role app_role not null default 'manager',
  department_id uuid references departments (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_department_idx on profiles (department_id);

-- Роль и отдел текущего пользователя читаются из profiles внутри политик на самой
-- таблице profiles, поэтому обе функции обязаны быть security definer: иначе политика
-- вызовет сама себя и Postgres упадёт с бесконечной рекурсией.
create function current_app_role() returns app_role
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create function current_department() returns uuid
  language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = auth.uid();
$$;

create function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(current_app_role() = 'admin', false);
$$;

alter table departments enable row level security;
alter table profiles enable row level security;

create policy departments_read on departments
  for select to authenticated using (true);

create policy departments_admin_write on departments
  for all to authenticated using (is_admin()) with check (is_admin());

-- Менеджер видит коллег по отделу, руководитель отдела — тоже свой отдел,
-- админ — всех. Свой профиль виден всегда.
create policy profiles_read on profiles
  for select to authenticated using (
    id = auth.uid()
    or is_admin()
    or (department_id is not null and department_id = current_department())
  );

create policy profiles_self_update on profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_write on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- Профиль создаётся автоматически при заведении пользователя в Supabase Auth.
-- Имя и роль передаются админом через user_metadata; по умолчанию — менеджер.
create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::app_role, 'manager')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===== 0002_clients.sql =====

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

-- ===== 0003_client_operations.sql =====

-- Перевод клиента в работу и продление договора.
-- Обе функции меняют clients и client_cycles вместе, поэтому вынесены в базу:
-- два отдельных запроса из приложения могут разойтись, если между ними что-то упадёт.
-- security invoker (по умолчанию): права проверяет RLS, как и для обычных запросов.

/**
 * Переводит клиента из холодной базы в текущие и открывает первый цикл.
 */
create function activate_client(p_client_id uuid, p_start_date date)
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
         cycle_start_date = p_start_date
   where id = p_client_id;

  insert into client_cycles (client_id, cycle_number, started_at)
  values (p_client_id, 1, p_start_date);
end;
$$;

/**
 * Продлевает договор: закрывает текущий цикл и открывает следующий.
 * Новый цикл начинается там, где закончился предыдущий, а не сегодня, —
 * иначе при продлении задним числом сроки поедут.
 */
create function renew_client(p_client_id uuid)
  returns void language plpgsql set search_path = public as $$
declare
  v_start date;
  v_status client_status;
  v_cycle_number int;
  v_new_start date;
begin
  select status, cycle_start_date into v_status, v_start
    from clients where id = p_client_id;

  if v_status is null then
    raise exception 'Клиент не найден';
  end if;

  if v_status <> 'active' then
    raise exception 'Продлить можно только клиента в работе';
  end if;

  v_new_start := (v_start + (cycle_length_months() || ' months')::interval)::date;

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

-- ===== 0004_tasks.sql =====

-- Задачи по клиентам с разбивкой по дням.

create type task_status as enum ('open', 'done');
create type task_priority as enum ('low', 'normal', 'high');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  -- Задача обычно про клиента, но бывает и общая («подготовить отчёт»),
  -- поэтому связь необязательная.
  client_id uuid references clients (id) on delete cascade,
  assignee_id uuid not null references profiles (id) on delete restrict,
  due_date date not null,
  status task_status not null default 'open',
  priority task_priority not null default 'normal',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id) on delete set null
);

create index tasks_assignee_due_idx on tasks (assignee_id, due_date) where status = 'open';
create index tasks_client_idx on tasks (client_id);
create index tasks_due_idx on tasks (due_date) where status = 'open';

-- Отдел произвольного сотрудника. security definer, иначе политика на tasks
-- упрётся в RLS таблицы profiles и вернёт пусто для чужих задач.
create function profile_department(p_profile_id uuid) returns uuid
  language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = p_profile_id;
$$;

alter table tasks enable row level security;

-- Исполнитель видит свои задачи, руководитель отдела — задачи отдела, админ — все.
create policy tasks_read on tasks
  for select to authenticated using (
    is_admin()
    or assignee_id = auth.uid()
    or (
      current_app_role() = 'head'
      and current_department() is not null
      and profile_department(assignee_id) = current_department()
    )
  );

create policy tasks_insert on tasks
  for insert to authenticated with check (
    is_admin()
    or assignee_id = auth.uid()
    or (
      current_app_role() = 'head'
      and current_department() is not null
      and profile_department(assignee_id) = current_department()
    )
  );

create policy tasks_update on tasks
  for update to authenticated using (
    is_admin()
    or assignee_id = auth.uid()
    or (
      current_app_role() = 'head'
      and current_department() is not null
      and profile_department(assignee_id) = current_department()
    )
  ) with check (
    is_admin()
    or assignee_id = auth.uid()
    or (
      current_app_role() = 'head'
      and current_department() is not null
      and profile_department(assignee_id) = current_department()
    )
  );

create policy tasks_delete on tasks
  for delete to authenticated using (
    is_admin() or assignee_id = auth.uid()
  );

-- completed_at держим в БД, а не в приложении: иначе две вкладки или повторный
-- клик разъедут отметку о выполнении и время закрытия.
create function sync_task_completed_at() returns trigger
  language plpgsql as $$
begin
  if new.status = 'done' and coalesce(old.status, 'open') <> 'done' then
    new.completed_at := now();
  elsif new.status = 'open' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_completed_at
  before insert or update on tasks
  for each row execute function sync_task_completed_at();

-- ===== 0005_task_types.sql =====

-- Тип задачи: прозвон, встреча, оплата, сервис.
-- Отдельным полем, а не текстом в заголовке: по типу считается статистика
-- на дашборде («сколько прозвонов сделали за день»), а по свободному тексту не посчитать.

create type task_type as enum ('call', 'meeting', 'payment', 'service');

-- Существующие задачи по умолчанию считаем прозвонами — самый частый тип.
alter table tasks add column type task_type not null default 'call';

create index tasks_type_idx on tasks (type);
