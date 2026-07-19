-- Тип задачи: прозвон, встреча, оплата, сервис.
-- Отдельным полем, а не текстом в заголовке: по типу считается статистика
-- на дашборде («сколько прозвонов сделали за день»), а по свободному тексту не посчитать.

create type task_type as enum ('call', 'meeting', 'payment', 'service');

-- Существующие задачи по умолчанию считаем прозвонами — самый частый тип.
alter table tasks add column type task_type not null default 'call';

create index tasks_type_idx on tasks (type);
