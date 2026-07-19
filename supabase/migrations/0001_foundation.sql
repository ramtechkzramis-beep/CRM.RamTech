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
