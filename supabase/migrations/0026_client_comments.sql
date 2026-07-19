-- Лента комментариев по клиенту: несколько записей со временем и автором,
-- вместо одного перезаписываемого поля «Заметки». Менеджер видит, кто и
-- когда что писал, работая с холодной базой.

create table client_comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  text text not null,
  created_at timestamptz not null default now()
);

create index client_comments_client_idx on client_comments (client_id, created_at desc);

alter table client_comments enable row level security;

-- Видит комментарии каждый, кто видит самого клиента — та же логика,
-- что и для документов и циклов клиента.
create policy client_comments_read on client_comments
  for select to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  );

-- Добавить комментарий может любой, кто видит клиента (RLS на clients уже
-- ограничивает это владельцем/отделом/админом) — это ежедневная работа
-- менеджера с лидом, а не что-то, что нужно прятать от него самого.
create policy client_comments_insert on client_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (select 1 from clients c where c.id = client_id)
  );

-- Удалить может автор (поправить опечатку) или руководитель.
create policy client_comments_delete on client_comments
  for delete to authenticated using (
    author_id = auth.uid() or is_admin()
  );

-- Время последнего комментария — для списка холодной базы, чтобы не
-- открывать каждую карточку ради проверки «кто-то уже звонил или нет».
drop view if exists clients_with_segment;

create view clients_with_segment
  with (security_invoker = true) as
select
  c.*,
  p.full_name as owner_name,
  pa.full_name as archived_by_name,
  (
    select max(cc.created_at) from client_comments cc where cc.client_id = c.id
  ) as last_comment_at,
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
left join profiles pa on pa.id = c.archived_by;
