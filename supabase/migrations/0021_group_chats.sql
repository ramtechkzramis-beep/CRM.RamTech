-- Групповые чаты с ручным составом участников. Создавать и управлять
-- составом может только руководитель — обычные сотрудники только состоят
-- в чате и пишут в него.

alter table conversations add column title text;

alter table conversations drop constraint conversations_shape;

alter table conversations add constraint conversations_shape check (
  (kind = 'direct' and user_a is not null and user_b is not null
     and user_a < user_b and department_id is null and title is null)
  or
  (kind = 'department' and department_id is not null
     and user_a is null and user_b is null and title is null)
  or
  (kind = 'group' and department_id is null and user_a is null and user_b is null
     and title is not null)
);

create table conversation_members (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  added_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table conversation_members enable row level security;

-- Видеть состав может любой участник чата — это не секрет для тех, кто уже
-- внутри переписки. Добавлять и убирать — только руководитель.
create policy conversation_members_read on conversation_members
  for select to authenticated using (can_access_conversation(conversation_id));

create policy conversation_members_admin_write on conversation_members
  for all to authenticated using (is_admin()) with check (is_admin());

-- Доступ к групповому чату теперь по членству в conversation_members,
-- а не по отделу или паре участников.
create or replace function can_access_conversation(p_conversation_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = p_conversation_id
      and (
        (c.kind = 'direct' and auth.uid() in (c.user_a, c.user_b))
        or (c.kind = 'department' and c.department_id is not null
            and c.department_id = current_department())
        or (c.kind = 'group' and exists (
              select 1 from conversation_members m
              where m.conversation_id = c.id and m.user_id = auth.uid()
            ))
      )
  );
$$;

drop policy if exists conversations_read on conversations;

create policy conversations_read on conversations
  for select to authenticated using (
    (kind = 'direct' and auth.uid() in (user_a, user_b))
    or (kind = 'department' and department_id is not null
        and department_id = current_department())
    or (kind = 'group' and exists (
          select 1 from conversation_members m
          where m.conversation_id = id and m.user_id = auth.uid()
        ))
  );

drop policy if exists conversations_insert on conversations;

create policy conversations_insert on conversations
  for insert to authenticated with check (
    (kind = 'direct' and auth.uid() in (user_a, user_b))
    or (kind = 'group' and is_admin())
  );

-- Создание чата и добавление создателя в участники — одной операцией,
-- иначе руководитель не увидел бы только что созданный им же чат
-- (conversations_read требует членства в conversation_members).
create function create_group_chat(p_title text, p_member_ids uuid[]) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_conversation_id uuid;
begin
  if not is_admin() then
    raise exception 'Создавать групповые чаты может только руководитель';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Укажите название чата';
  end if;

  insert into conversations (kind, title) values ('group', trim(p_title))
  returning id into v_conversation_id;

  insert into conversation_members (conversation_id, user_id, added_by)
  select v_conversation_id, member_id, auth.uid()
  from unnest(p_member_ids) as member_id
  on conflict do nothing;

  insert into conversation_members (conversation_id, user_id, added_by)
  values (v_conversation_id, auth.uid(), auth.uid())
  on conflict do nothing;

  return v_conversation_id;
end;
$$;

-- View пересоздаём: добавляем title и третий вариант видимости (по составу
-- участников), а «select c.*» фиксирует список колонок только на момент
-- создания view.
drop view if exists conversation_summaries;

create view conversation_summaries
  with (security_invoker = true) as
select
  c.id,
  c.kind,
  c.user_a,
  c.user_b,
  c.department_id,
  d.name as department_name,
  c.title,
  c.last_message_at,
  (
    select m.body from messages m
    where m.conversation_id = c.id
    order by m.created_at desc limit 1
  ) as last_message_body,
  (
    select m.sender_id from messages m
    where m.conversation_id = c.id
    order by m.created_at desc limit 1
  ) as last_message_sender_id,
  (
    select count(*) from messages m
    where m.conversation_id = c.id
      and m.sender_id <> auth.uid()
      and m.created_at > coalesce(
        (select cr.last_read_at from conversation_reads cr
          where cr.conversation_id = c.id and cr.user_id = auth.uid()),
        '-infinity'::timestamptz
      )
  ) as unread_count
from conversations c
left join departments d on d.id = c.department_id
where
  (c.kind = 'direct' and auth.uid() in (c.user_a, c.user_b))
  or (c.kind = 'department' and c.department_id is not null
      and c.department_id = current_department())
  or (c.kind = 'group' and exists (
        select 1 from conversation_members m
        where m.conversation_id = c.id and m.user_id = auth.uid()
      ));

alter publication supabase_realtime add table conversation_members;
