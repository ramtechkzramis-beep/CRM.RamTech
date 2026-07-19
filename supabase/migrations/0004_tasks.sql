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
