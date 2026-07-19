-- База знаний: скрипты продаж, инструкции по чат-ботам, ценности компании.
-- Открытый для всех сотрудников раздел «на всякий случай напомнить себе» —
-- в отличие от client_documents, здесь читать может любой авторизованный
-- профиль, а не только те, кто видит конкретного клиента.

create type knowledge_category as enum (
  'sales_scripts',
  'chatbot_guides',
  'company_values',
  'other'
);

create table knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  category knowledge_category not null default 'other',
  title text not null,
  content text,
  -- Файл необязателен: материал может быть только текстом на странице.
  storage_path text,
  file_name text,
  file_size int,
  mime_type text,
  author_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_articles_category_idx on knowledge_articles (category);

alter table knowledge_articles enable row level security;

-- Читает любой сотрудник — это открытая база знаний, а не документы клиента.
create policy knowledge_articles_read on knowledge_articles
  for select to authenticated using (true);

-- Пишут только руководитель и руководители отделов: остальные — на чтение.
create policy knowledge_articles_write on knowledge_articles
  for insert to authenticated with check (
    is_admin() or current_app_role() = 'head'
  );

create policy knowledge_articles_update on knowledge_articles
  for update to authenticated using (
    is_admin() or current_app_role() = 'head'
  ) with check (
    is_admin() or current_app_role() = 'head'
  );

create policy knowledge_articles_delete on knowledge_articles
  for delete to authenticated using (
    is_admin() or current_app_role() = 'head'
  );

-- Бакет приватный: ссылки на файлы выдаются как временные подписанные URL,
-- чтобы скачанный кем-то материал не разлетался по случайно открытому линку.
insert into storage.buckets (id, name, public)
values ('knowledge-files', 'knowledge-files', false)
on conflict (id) do nothing;

create policy "knowledge_files_storage_read" on storage.objects
  for select to authenticated using (bucket_id = 'knowledge-files');

create policy "knowledge_files_storage_write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'knowledge-files' and (is_admin() or current_app_role() = 'head')
  );

create policy "knowledge_files_storage_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'knowledge-files' and (is_admin() or current_app_role() = 'head')
  );
