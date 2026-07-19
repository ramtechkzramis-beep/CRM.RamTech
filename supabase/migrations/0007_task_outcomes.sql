-- Результат задачи: что именно произошло, а не просто «сделано».
-- Встреча могла пройти, сорваться или перенестись — для руководителя это
-- разные вещи, и по галочке «выполнено» их не различить.

create type task_outcome as enum (
  -- Прозвон
  'call_reached',
  'call_no_answer',
  'call_callback',
  'call_refused',
  -- Встреча
  'meeting_held',
  'meeting_cancelled',
  'meeting_rescheduled',
  'meeting_no_show',
  -- Оплата
  'payment_paid',
  'payment_partial',
  'payment_deferred',
  'payment_refused',
  -- Сервис
  'service_done',
  'service_rework',
  'service_postponed'
);

alter table tasks add column outcome task_outcome;
alter table tasks add column outcome_note text;

create index tasks_outcome_idx on tasks (outcome) where outcome is not null;

-- Задачам, закрытым до появления результатов, проставляем успешный исход:
-- раз человек отметил задачу выполненной, ближе всего к правде именно он.
-- Без этого шага ограничение ниже не даст себя создать.
update tasks
   set outcome = case type
     when 'call' then 'call_reached'::task_outcome
     when 'meeting' then 'meeting_held'::task_outcome
     when 'payment' then 'payment_paid'::task_outcome
     when 'service' then 'service_done'::task_outcome
   end
 where status = 'done' and outcome is null;

-- Задача считается закрытой только вместе с результатом: иначе смысл затеи
-- теряется — снова будет непонятно, чем закончилось.
alter table tasks add constraint done_task_needs_outcome
  check (status <> 'done' or outcome is not null);

-- При возврате задачи в работу результат стираем, иначе останется
-- «встреча проведена» у задачи, которая снова открыта.
create or replace function sync_task_completed_at() returns trigger
  language plpgsql as $$
begin
  if new.status = 'done' and coalesce(old.status, 'open') <> 'done' then
    new.completed_at := now();
  elsif new.status = 'open' then
    new.completed_at := null;
    new.outcome := null;
    new.outcome_note := null;
  end if;
  return new;
end;
$$;
