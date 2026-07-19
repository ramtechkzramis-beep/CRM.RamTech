-- Внутренний чат (личные сообщения + групповые чаты по отделам)
-- и уведомления сотруднику о новой задаче и переданном клиенте.

-- Директория сотрудников открыта всем: иначе нельзя выбрать, кому писать,
-- если человек из другого отдела. Как и departments_read — это не секретные
-- данные внутри компании (имя, роль, отдел, рабочая почта).
drop policy if exists profiles_read on profiles;

create policy profiles_read on profiles
  for select to authenticated using (true);

create type conversation_kind as enum ('direct', 'department');

create table conversations (
  id uuid primary key default gen_random_uuid(),
  kind conversation_kind not null,
  -- Для direct: пара участников в каноническом порядке (user_a < user_b),
  -- чтобы у двух людей не появилось две разных переписки.
  user_a uuid references profiles (id) on delete cascade,
  user_b uuid references profiles (id) on delete cascade,
  -- Для department: чат общий на весь отдел, участников не перечисляем —
  -- членство считается от profiles.department_id, отдельной таблицы не нужно.
  department_id uuid references departments (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_shape check (
    (kind = 'direct' and user_a is not null and user_b is not null
       and user_a < user_b and department_id is null)
    or
    (kind = 'department' and department_id is not null
       and user_a is null and user_b is null)
  ),
  unique (user_a, user_b),
  unique (department_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

-- Прочитанность храним как «отметка досюда», а не флаг на каждом сообщении:
-- в групповом чате отдела у сообщения несколько читателей с разным прогрессом,
-- и на одном сообщении это не отметить.
create table conversation_reads (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- security definer: и messages, и conversation_reads проверяют доступ
-- через conversations, а у той своя RLS — без обхода получилась бы
-- рекурсивная проверка политик.
create function can_access_conversation(p_conversation_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = p_conversation_id
      and (
        (c.kind = 'direct' and auth.uid() in (c.user_a, c.user_b))
        or (c.kind = 'department' and c.department_id is not null
            and c.department_id = current_department())
      )
  );
$$;

alter table conversations enable row level security;
alter table messages enable row level security;
alter table conversation_reads enable row level security;

-- Личный чат доступен только двум участникам. Групповой — всем в отделе.
-- Осознанно без обхода для admin: переписка сотрудников — не то, что должно
-- просматриваться по умолчанию ролью руководителя в системе.
create policy conversations_read on conversations
  for select to authenticated using (
    (kind = 'direct' and auth.uid() in (user_a, user_b))
    or (kind = 'department' and department_id is not null
        and department_id = current_department())
  );

-- Групповые чаты создаются только триггером при заведении отдела —
-- обычный пользователь заводит лишь личную переписку.
create policy conversations_insert on conversations
  for insert to authenticated with check (
    kind = 'direct' and auth.uid() in (user_a, user_b)
  );

create policy messages_read on messages
  for select to authenticated using (can_access_conversation(conversation_id));

create policy messages_insert on messages
  for insert to authenticated with check (
    sender_id = auth.uid() and can_access_conversation(conversation_id)
  );

create policy conversation_reads_own on conversation_reads
  for all to authenticated using (
    user_id = auth.uid() and can_access_conversation(conversation_id)
  ) with check (
    user_id = auth.uid() and can_access_conversation(conversation_id)
  );

-- Дата последнего сообщения — для сортировки списка чатов.
-- security definer: у обычного пользователя нет права на update conversations,
-- и заводить его ради этой единственной служебной записи не хочется.
create function sync_conversation_last_message() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_sync_last_message
  after insert on messages
  for each row execute function sync_conversation_last_message();

-- Групповой чат отдела заводится сам при создании отдела — не нужно отдельно
-- «создавать групповой чат», он появляется вместе с отделом.
create function create_department_conversation() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into conversations (kind, department_id) values ('department', new.id);
  return new;
end;
$$;

create trigger departments_create_conversation
  after insert on departments
  for each row execute function create_department_conversation();

insert into conversations (kind, department_id)
select 'department', d.id from departments d
where not exists (select 1 from conversations c where c.department_id = d.id);

-- Сводка по чатам одним запросом: последнее сообщение и непрочитанные
-- сразу для всего списка, без отдельного запроса на каждый чат.
create view conversation_summaries
  with (security_invoker = true) as
select
  c.id,
  c.kind,
  c.user_a,
  c.user_b,
  c.department_id,
  d.name as department_name,
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
      and c.department_id = current_department());

-- Уведомления: только события, которые нельзя увидеть иначе — новая задача
-- и переданный клиент. Новые сообщения в чате не дублируем сюда: непрочитанные
-- и так видны в самом виджете чата.
create type notification_type as enum ('task_assigned', 'client_reassigned');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

create policy notifications_own on notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_own_update on notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Вставляют только триггеры ниже (security definer), обычным пользователям
-- вставлять чужие уведомления незачем — политики insert для них нет.

create function notify_task_assigned() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into notifications (user_id, type, title, body, link)
    values (new.assignee_id, 'task_assigned', 'Новая задача', new.title, '/today');
  end if;
  return new;
end;
$$;

create trigger tasks_notify_assigned
  after insert or update of assignee_id on tasks
  for each row execute function notify_task_assigned();

create function notify_client_reassigned() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is distinct from old.owner_id
     and new.owner_id is distinct from auth.uid() then
    insert into notifications (user_id, type, title, body, link)
    values (
      new.owner_id, 'client_reassigned', 'Вам передали клиента', new.name,
      '/clients/' || new.id
    );
  end if;
  return new;
end;
$$;

create trigger clients_notify_reassigned
  after update of owner_id on clients
  for each row execute function notify_client_reassigned();

-- Живые обновления: новое сообщение и новое уведомление должны появляться
-- в виджете без обновления страницы.
alter publication supabase_realtime add table conversations, messages, notifications;
