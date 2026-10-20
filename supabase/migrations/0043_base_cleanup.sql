-- Уборка холодной базы: кто убирает компании в корзину и кто чистит её.
--
-- Право «убирать базу» вешаем на отдел, как и доступ к наработкам: этим
-- занимается лидогенерация, которая базу и наполняет. Право «чистить
-- корзину насовсем» — на роль: руководитель и руководители отделов.
alter table clients add column trashed_at timestamptz;
alter table clients add column trashed_by uuid references profiles (id) on delete set null;
alter table clients add column trash_reason text;

alter table departments add column can_clean_base boolean not null default false;

update departments set can_clean_base = true where name ilike '%лид%';

/**
 * Может ли текущий сотрудник убирать компании в корзину.
 *
 * security definer: политике нужно прочитать профиль и отдел самого
 * пользователя, а читать чужие профили ему незачем.
 */
create function can_clean_base() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(
    is_admin()
    or current_app_role() = 'head'
    or (
      select d.can_clean_base
      from profiles p
      join departments d on d.id = p.department_id
      where p.id = auth.uid()
    ),
    false
  );
$$;

/** Чистить корзину насовсем — только руководство. */
create function can_empty_trash() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(is_admin() or current_app_role() = 'head', false);
$$;

-- Чтение: корзина видна тем, кто базу убирает, целиком — иначе лидген
-- не найдёт там компанию, которую сам же туда положил из чужого списка.
drop policy if exists clients_read on clients;

create policy clients_read on clients
  for select to authenticated using (
    is_admin()
    or current_app_role() = 'developer'
    or owner_id = auth.uid()
    or (department_id is not null and department_id = current_department())
    or (status = 'warm' and can_view_all_warm())
    or (status = 'trash' and can_clean_base())
  );

-- Изменение: к прежним правам добавляется уборка базы. Ограничиваем
-- холодной базой и корзиной — трогать текущих клиентов и наработки
-- это право не даёт.
drop policy if exists clients_update on clients;

create policy clients_update on clients
  for update to authenticated using (
    is_admin()
    or owner_id = auth.uid()
    or (
      current_app_role() = 'head'
      and department_id is not null
      and department_id = current_department()
    )
    or (status in ('cold', 'trash') and can_clean_base())
  ) with check (
    is_admin()
    or owner_id = auth.uid()
    or (
      current_app_role() = 'head'
      and department_id is not null
      and department_id = current_department()
    )
    or (status in ('cold', 'trash') and can_clean_base())
  );

-- Удаление насовсем: дубликаты из холодной базы убирает тот, кто базу
-- ведёт, корзину чистит руководство.
drop policy if exists clients_admin_delete on clients;

create policy clients_delete on clients
  for delete to authenticated using (
    is_admin()
    or (status = 'cold' and can_clean_base())
    or (status = 'trash' and can_empty_trash())
  );

-- «select c.*» фиксирует список колонок при создании — новые поля
-- clients не попадут в представление без пересоздания.
drop view if exists clients_with_segment;

create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
  pa.full_name as archived_by_name,
  pw.full_name as warm_by_name,
  pt.full_name as trashed_by_name,
  greatest(
    (select max(cc.created_at) from client_comments cc where cc.client_id = c.id),
    (select max(greatest(t.created_at, t.completed_at)) from tasks t where t.client_id = c.id)
  ) as last_activity_at,
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
left join profiles pa on pa.id = c.archived_by
left join profiles pw on pw.id = c.warm_by
left join profiles pt on pt.id = c.trashed_by;
