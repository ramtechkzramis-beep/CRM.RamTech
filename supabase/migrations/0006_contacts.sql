-- Несколько контактных лиц на одну фирму + город.
-- В реальной базе RamTech на одну компанию приходится несколько человек
-- (кто принимает решение, кто влияет, кто просто сотрудник) — одного поля
-- contact_person для этого мало.

alter table clients add column city text;

create type contact_role as enum ('decision_maker', 'influencer', 'employee');

create table client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  full_name text not null,
  role contact_role,
  position text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index client_contacts_client_idx on client_contacts (client_id);

alter table client_contacts enable row level security;

-- Контакты видны и правятся вместе с клиентом: доступ к ним определяет
-- политика на clients, отдельных правил не нужно.
create policy client_contacts_read on client_contacts
  for select to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  );

create policy client_contacts_write on client_contacts
  for all to authenticated using (
    exists (select 1 from clients c where c.id = client_id)
  ) with check (
    exists (select 1 from clients c where c.id = client_id)
  );

-- Старое поле contact_person оставляем: оно заполняется в ручной форме
-- добавления клиента и в карточке показывается как основной контакт.
