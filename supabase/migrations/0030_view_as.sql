-- «Смотреть как сотрудник» — просмотр экрана «Задачи» глазами другого
-- сотрудника (только просмотр, без действий от его имени). Не привязано
-- к роли admin: включено персонально только владельцу компании,
-- остальные руководители/админы этой возможности не получают.
alter table profiles add column can_view_as boolean not null default false;

update profiles set can_view_as = true
where id = (select id from auth.users where email = 'ramtech.kz.ramis@gmail.com');
