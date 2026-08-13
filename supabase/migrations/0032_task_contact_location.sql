-- С кем звонок/встреча и где — привязка задачи к контактному лицу клиента
-- и (для встреч) адрес. Контакт можно не выбирать — задача не обязана
-- быть привязана к конкретному человеку.
alter table tasks add column contact_id uuid references client_contacts(id) on delete set null;
alter table tasks add column location text;
