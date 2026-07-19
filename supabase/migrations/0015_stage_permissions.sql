-- Права на воронку: этапы двигают только руководитель и разработчик.
--
-- Отдельной функцией, а не политикой RLS: политики разрешают или запрещают
-- строку целиком, а нам нужно пустить разработчика к одной колонке. Через RLS
-- он получил бы право править и цены, и лояльность.

create or replace function set_client_stage(p_client_id uuid, p_stage project_stage)
  returns void language plpgsql security definer set search_path = public as $$
declare
  v_role app_role;
begin
  select role into v_role from profiles where id = auth.uid();

  if v_role is null then
    raise exception 'Профиль не найден';
  end if;

  if v_role not in ('admin', 'developer') then
    raise exception 'Менять этап проекта может только руководитель или разработчик';
  end if;

  -- security definer обходит RLS, поэтому существование клиента проверяем сами.
  if not exists (select 1 from clients where id = p_client_id) then
    raise exception 'Клиент не найден';
  end if;

  update clients set stage = p_stage where id = p_client_id;
end;
$$;

-- Разработчик видит всех клиентов: без этого он не найдёт проект, который ведёт.
drop policy if exists clients_read on clients;

create policy clients_read on clients
  for select to authenticated using (
    is_admin()
    or current_app_role() = 'developer'
    or owner_id = auth.uid()
    or (department_id is not null and department_id = current_department())
  );
