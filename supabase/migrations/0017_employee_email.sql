-- Email в профиле сотрудника.
--
-- Раньше почта жила только в auth.users, куда обычный клиент с RLS
-- не заглядывает — её видно только через admin API. Чтобы список
-- сотрудников читался обычным запросом, а не дёргал service_role
-- на каждую загрузку страницы, дублируем почту в profiles.

alter table profiles add column if not exists email text;

update profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id and p.email is null;

-- Триггер заполняет email вместе с именем и ролью при создании пользователя.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::app_role, 'manager'),
    new.email
  );
  return new;
end;
$$;
