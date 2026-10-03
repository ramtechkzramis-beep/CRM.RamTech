-- Лидгены видят все наработки, но не трогают их.
--
-- Лидген — это не роль, а отдел: в «Лид Генерации» работают обычные
-- менеджеры, которые наполняют холодную базу и передают компании дальше.
-- Поэтому право вешаем на отдел, а не на роль: новый сотрудник отдела
-- получит его сам, без правки политик.
alter table departments add column can_view_warm boolean not null default false;

update departments set can_view_warm = true where name ilike '%лид%';

/**
 * Может ли текущий сотрудник видеть все наработки.
 *
 * security definer: политике на clients нужно прочитать профиль и отдел
 * самого пользователя, а читать чужие профили ему незачем.
 */
create function can_view_all_warm() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(
    (
      select d.can_view_warm
      from profiles p
      join departments d on d.id = p.department_id
      where p.id = auth.uid()
    ),
    false
  );
$$;

-- Чтение: к своим клиентам и клиентам своего отдела добавляются наработки
-- всей компании — но только на просмотр. Политики clients_update и
-- warm_events_insert не меняются, поэтому принимать решения по чужой
-- наработке лидген по-прежнему не может.
drop policy if exists clients_read on clients;

create policy clients_read on clients
  for select to authenticated using (
    is_admin()
    or current_app_role() = 'developer'
    or owner_id = auth.uid()
    or (department_id is not null and department_id = current_department())
    or (status = 'warm' and can_view_all_warm())
  );
