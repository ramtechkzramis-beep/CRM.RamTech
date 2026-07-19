-- Время задачи. Отдельным полем, а не заменой due_date на timestamp:
-- время нужно не всегда («позвонить сегодня» — нормальная задача без часа),
-- а фильтры и группировка по дню должны остаться простыми.

alter table tasks add column due_time time;

-- Сортировка внутри дня: сначала по времени, задачи без времени — в конце.
create index tasks_due_idx_v2 on tasks (due_date, due_time nulls last) where status = 'open';
