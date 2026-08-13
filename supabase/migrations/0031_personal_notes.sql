-- Личный черновик на экране «Задачи» — просто чтобы не забыть что-то
-- на бегу. Строго приватно: видит и правит только сам автор.
create table personal_notes (
  user_id uuid primary key references profiles(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table personal_notes enable row level security;

create policy personal_notes_owner on personal_notes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
