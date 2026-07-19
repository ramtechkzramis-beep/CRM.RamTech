-- Сканы подписанных документов по клиенту.
-- Сами файлы лежат в Supabase Storage, здесь — только записи о них:
-- кто загрузил, когда и что это за документ.

create type document_kind as enum ('contract', 'invoice', 'act', 'other');

create table client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  kind document_kind not null default 'contract',
  title text not null,
  -- Путь к файлу в бакете client-documents.
  storage_path text not null unique,
  file_size int,
  mime_type text,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index client_documents_client_idx on client_documents (client_id);

alter table client_documents enable row level security;

-- Видит документы каждый, кто видит самого клиента.
create policy client_documents_read on client_documents
  for select to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  );

-- А загружает и удаляет только руководство: договоры — не то, что должен
-- трогать любой менеджер.
create policy client_documents_write on client_documents
  for insert to authenticated with check (
    is_admin() or current_app_role() = 'head'
  );

create policy client_documents_delete on client_documents
  for delete to authenticated using (
    is_admin() or current_app_role() = 'head'
  );

-- Бакет приватный: ссылки на сканы договоров не должны открываться
-- у кого угодно, кто их получил.
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

create policy "client_documents_storage_read" on storage.objects
  for select to authenticated using (bucket_id = 'client-documents');

create policy "client_documents_storage_write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'client-documents' and (is_admin() or current_app_role() = 'head')
  );

create policy "client_documents_storage_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'client-documents' and (is_admin() or current_app_role() = 'head')
  );
