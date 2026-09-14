-- Журнал решений по наработкам: оформлен, отказ, перенос даты ответа.
--
-- По самим клиентам итог наработки не восстановить: после отказа компания
-- просто снова лежит в холодной базе, а перенос статус вообще не меняет.
-- Сводке нужно знать, сколько и когда оформили, отказали и перенесли —
-- поэтому каждое решение пишется отдельной строкой.
create type warm_event_kind as enum ('signed', 'refused', 'postponed');

create table warm_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind warm_event_kind not null,
  -- Ответственный за компанию на момент решения: это результат менеджера,
  -- даже если кнопку нажал руководитель. Снимок, а не ссылка через clients —
  -- после передачи компании статистика не должна переезжать к новому.
  owner_id uuid references profiles(id) on delete set null,
  -- Кто принял решение в CRM.
  actor_id uuid references profiles(id) on delete set null,
  note text,
  -- Только у переноса: с какой даты на какую сдвинули ответ.
  previous_response_date date,
  new_response_date date,
  created_at timestamptz not null default now()
);

create index warm_events_created_idx on warm_events (created_at);
create index warm_events_client_idx on warm_events (client_id);

alter table warm_events enable row level security;

-- Читать — тем, кто видит саму компанию.
create policy warm_events_read on warm_events
  for select to authenticated using (
    exists (
      select 1 from clients c
      where c.id = client_id
        and (
          is_admin()
          or c.owner_id = auth.uid()
          or (c.department_id is not null and c.department_id = current_department())
        )
    )
  );

-- Записывать — тем, кто может менять компанию (как clients_update), и только
-- от своего имени. Правок и удаления нет: журнал не переписывают задним числом.
create policy warm_events_insert on warm_events
  for insert to authenticated with check (
    actor_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_id
        and (
          is_admin()
          or c.owner_id = auth.uid()
          or (
            current_app_role() = 'head'
            and c.department_id is not null
            and c.department_id = current_department()
          )
        )
    )
  );
