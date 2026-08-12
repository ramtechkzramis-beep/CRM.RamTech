-- Новая структура прайса: услуги (бот/CRM/сайт) x город (Алматы/Шымкент) x
-- пакет (Start/Business/Pro) x срок, плюс возможность продать клиенту
-- несколько услуг сразу со скидкой за комбинацию.
--
-- price_positions/price_renewals — справочник цен из прайс-листа RamTech.
-- Читает любой сотрудник (нужно для калькулятора), правит — только админ:
-- это отдельная сущность от client_services, поэтому не под RLS клиента.
--
-- client_services — какие услуги фактически выбраны у конкретного клиента.
-- Агрегаты (clients.package/development_price/subscription_price) не трогаем:
-- они остаются суммой по всем услугам клиента после скидки за комбинацию,
-- поэтому весь код, который их читает (calcTotals, таблица клиентов, КП),
-- продолжает работать без изменений.

create type service_category as enum ('bot', 'crm', 'website');
create type price_city as enum ('almaty', 'shymkent');

create table price_positions (
  id uuid primary key default gen_random_uuid(),
  city price_city not null,
  category service_category not null,
  package service_package not null,
  contract_months int not null check (contract_months in (3, 6, 12)),
  development_price numeric not null check (development_price >= 0),
  monthly_service_price numeric not null check (monthly_service_price >= 0),
  package_price numeric not null check (package_price >= 0),
  composition text,
  dialog_limit text,
  unique (city, category, package, contract_months),
  check (package <> 'enterprise')
);

create table price_renewals (
  id uuid primary key default gen_random_uuid(),
  city price_city not null,
  category service_category not null,
  package service_package not null,
  contract_months int not null check (contract_months in (3, 6, 12)),
  renewal_price numeric not null check (renewal_price >= 0),
  unique (city, category, package, contract_months),
  check (package <> 'enterprise')
);

alter table price_positions enable row level security;
alter table price_renewals enable row level security;

create policy price_positions_read on price_positions
  for select to authenticated using (true);
create policy price_positions_write on price_positions
  for all to authenticated using (is_admin()) with check (is_admin());

create policy price_renewals_read on price_renewals
  for select to authenticated using (true);
create policy price_renewals_write on price_renewals
  for all to authenticated using (is_admin()) with check (is_admin());

insert into price_positions
  (city, category, package, contract_months, development_price, monthly_service_price, package_price, composition, dialog_limit)
values
  ('shymkent', 'bot', 'start', 3, 159000, 63663, 349990, '1 чат-бот, 1 соцсеть, 1 интеграция', '1 000 диалогов/мес'),
  ('shymkent', 'bot', 'start', 6, 159000, 56832, 499990, '1 чат-бот, 1 соцсеть, 1 интеграция', '1 000 диалогов/мес'),
  ('shymkent', 'bot', 'start', 12, 159000, 50833, 769000, '1 чат-бот, 1 соцсеть, 1 интеграция', '1 000 диалогов/мес'),
  ('shymkent', 'bot', 'business', 3, 265000, 104997, 579990, '2 чат-бота (WhatsApp + Instagram), 2 интеграции', '3 000 диалогов/мес'),
  ('shymkent', 'bot', 'business', 6, 265000, 94998, 834990, '2 чат-бота (WhatsApp + Instagram), 2 интеграции', '3 000 диалогов/мес'),
  ('shymkent', 'bot', 'business', 12, 265000, 84500, 1279000, '2 чат-бота (WhatsApp + Instagram), 2 интеграции', '3 000 диалогов/мес'),
  ('shymkent', 'bot', 'pro', 3, 340000, 161663, 824990, '3 чат-бота, сегментация заявок, 3 интеграции', '10 000 диалогов/мес'),
  ('shymkent', 'bot', 'pro', 6, 340000, 144998, 1209990, '3 чат-бота, сегментация заявок, 3 интеграции', '10 000 диалогов/мес'),
  ('shymkent', 'bot', 'pro', 12, 340000, 129249, 1890990, '3 чат-бота, сегментация заявок, 3 интеграции', '10 000 диалогов/мес'),
  ('shymkent', 'crm', 'start', 3, 159000, 24997, 233990, '1 воронка, до 3 пользователей, задачи, обучение 1 ч', null),
  ('shymkent', 'crm', 'start', 6, 159000, 22498, 293990, '1 воронка, до 3 пользователей, задачи, обучение 1 ч', null),
  ('shymkent', 'crm', 'start', 12, 159000, 21249, 413990, '1 воронка, до 3 пользователей, задачи, обучение 1 ч', null),
  ('shymkent', 'crm', 'business', 3, 299000, 39997, 418990, 'до 10 пользователей, 2-3 воронки, роли, отчёты, обучение 3 ч', null),
  ('shymkent', 'crm', 'business', 6, 299000, 35998, 514990, 'до 10 пользователей, 2-3 воронки, роли, отчёты, обучение 3 ч', null),
  ('shymkent', 'crm', 'business', 12, 299000, 33999, 706990, 'до 10 пользователей, 2-3 воронки, роли, отчёты, обучение 3 ч', null),
  ('shymkent', 'crm', 'pro', 3, 490000, 59997, 669990, 'до 25 пользователей, свои поля и этапы, дашборд руководителя', null),
  ('shymkent', 'crm', 'pro', 6, 490000, 53998, 813990, 'до 25 пользователей, свои поля и этапы, дашборд руководителя', null),
  ('shymkent', 'crm', 'pro', 12, 490000, 50999, 1101990, 'до 25 пользователей, свои поля и этапы, дашборд руководителя', null),
  ('shymkent', 'website', 'start', 3, 149000, 19997, 208990, 'лендинг 1 стр., адаптив, форма заявки', null),
  ('shymkent', 'website', 'start', 6, 149000, 17998, 256990, 'лендинг 1 стр., адаптив, форма заявки', null),
  ('shymkent', 'website', 'start', 12, 149000, 16999, 352990, 'лендинг 1 стр., адаптив, форма заявки', null),
  ('shymkent', 'website', 'business', 3, 279000, 29997, 368990, 'до 5 стр., свой дизайн, каталог до 30 позиций, SEO-база', null),
  ('shymkent', 'website', 'business', 6, 279000, 26998, 440990, 'до 5 стр., свой дизайн, каталог до 30 позиций, SEO-база', null),
  ('shymkent', 'website', 'business', 12, 279000, 25499, 584990, 'до 5 стр., свой дизайн, каталог до 30 позиций, SEO-база', null),
  ('shymkent', 'website', 'pro', 3, 490000, 44997, 624990, 'до 10 стр., корзина, онлайн-оплата, личный кабинет', null),
  ('shymkent', 'website', 'pro', 6, 490000, 40498, 732990, 'до 10 стр., корзина, онлайн-оплата, личный кабинет', null),
  ('shymkent', 'website', 'pro', 12, 490000, 38249, 948990, 'до 10 стр., корзина, онлайн-оплата, личный кабинет', null),
  ('almaty', 'bot', 'start', 3, 207000, 82663, 454990, '1 чат-бот, 1 соцсеть, 1 интеграция', '1 000 диалогов/мес'),
  ('almaty', 'bot', 'start', 6, 207000, 73832, 649990, '1 чат-бот, 1 соцсеть, 1 интеграция', '1 000 диалогов/мес'),
  ('almaty', 'bot', 'start', 12, 207000, 66000, 999000, '1 чат-бот, 1 соцсеть, 1 интеграция', '1 000 диалогов/мес'),
  ('almaty', 'bot', 'business', 3, 345000, 136330, 753990, '2 чат-бота (WhatsApp + Instagram), 2 интеграции', '3 000 диалогов/мес'),
  ('almaty', 'bot', 'business', 6, 345000, 123498, 1085990, '2 чат-бота (WhatsApp + Instagram), 2 интеграции', '3 000 диалогов/мес'),
  ('almaty', 'bot', 'business', 12, 345000, 109500, 1659000, '2 чат-бота (WhatsApp + Instagram), 2 интеграции', '3 000 диалогов/мес'),
  ('almaty', 'bot', 'pro', 3, 442000, 210330, 1072990, '3 чат-бота, сегментация заявок, 3 интеграции', '10 000 диалогов/мес'),
  ('almaty', 'bot', 'pro', 6, 442000, 188498, 1572990, '3 чат-бота, сегментация заявок, 3 интеграции', '10 000 диалогов/мес'),
  ('almaty', 'bot', 'pro', 12, 442000, 168083, 2459000, '3 чат-бота, сегментация заявок, 3 интеграции', '10 000 диалогов/мес'),
  ('almaty', 'crm', 'start', 3, 219000, 34997, 323990, '1 воронка, до 3 пользователей, задачи, обучение 1 ч', null),
  ('almaty', 'crm', 'start', 6, 219000, 31498, 407990, '1 воронка, до 3 пользователей, задачи, обучение 1 ч', null),
  ('almaty', 'crm', 'start', 12, 219000, 29749, 575990, '1 воронка, до 3 пользователей, задачи, обучение 1 ч', null),
  ('almaty', 'crm', 'business', 3, 399000, 54997, 563990, 'до 10 пользователей, 2-3 воронки, роли, отчёты, обучение 3 ч', null),
  ('almaty', 'crm', 'business', 6, 399000, 49498, 695990, 'до 10 пользователей, 2-3 воронки, роли, отчёты, обучение 3 ч', null),
  ('almaty', 'crm', 'business', 12, 399000, 46749, 959990, 'до 10 пользователей, 2-3 воронки, роли, отчёты, обучение 3 ч', null),
  ('almaty', 'crm', 'pro', 3, 690000, 84997, 944990, 'до 25 пользователей, свои поля и этапы, дашборд руководителя', null),
  ('almaty', 'crm', 'pro', 6, 690000, 76498, 1148990, 'до 25 пользователей, свои поля и этапы, дашборд руководителя', null),
  ('almaty', 'crm', 'pro', 12, 690000, 72249, 1556990, 'до 25 пользователей, свои поля и этапы, дашборд руководителя', null),
  ('almaty', 'website', 'start', 3, 199000, 26997, 279990, 'лендинг 1 стр., адаптив, форма заявки', null),
  ('almaty', 'website', 'start', 6, 199000, 24332, 344990, 'лендинг 1 стр., адаптив, форма заявки', null),
  ('almaty', 'website', 'start', 12, 199000, 22999, 474990, 'лендинг 1 стр., адаптив, форма заявки', null),
  ('almaty', 'website', 'business', 3, 379000, 39997, 498990, 'до 5 стр., свой дизайн, каталог до 30 позиций, SEO-база', null),
  ('almaty', 'website', 'business', 6, 379000, 35998, 594990, 'до 5 стр., свой дизайн, каталог до 30 позиций, SEO-база', null),
  ('almaty', 'website', 'business', 12, 379000, 33999, 786990, 'до 5 стр., свой дизайн, каталог до 30 позиций, SEO-база', null),
  ('almaty', 'website', 'pro', 3, 690000, 59997, 869990, 'до 10 стр., корзина, онлайн-оплата, личный кабинет', null),
  ('almaty', 'website', 'pro', 6, 690000, 53998, 1013990, 'до 10 стр., корзина, онлайн-оплата, личный кабинет', null),
  ('almaty', 'website', 'pro', 12, 690000, 50999, 1301990, 'до 10 стр., корзина, онлайн-оплата, личный кабинет', null);

insert into price_renewals (city, category, package, contract_months, renewal_price)
values
  ('shymkent', 'bot', 'start', 12, 549000),
  ('shymkent', 'bot', 'business', 12, 912000),
  ('shymkent', 'bot', 'pro', 12, 1395000),
  ('shymkent', 'crm', 'start', 12, 229990),
  ('shymkent', 'crm', 'business', 12, 366990),
  ('shymkent', 'crm', 'pro', 12, 549990),
  ('shymkent', 'website', 'start', 12, 182990),
  ('shymkent', 'website', 'business', 12, 274990),
  ('shymkent', 'website', 'pro', 12, 412990),
  ('almaty', 'bot', 'start', 12, 712990),
  ('almaty', 'bot', 'business', 12, 1182990),
  ('almaty', 'bot', 'pro', 12, 1814990),
  ('almaty', 'crm', 'start', 12, 320990),
  ('almaty', 'crm', 'business', 12, 504990),
  ('almaty', 'crm', 'pro', 12, 779990),
  ('almaty', 'website', 'start', 12, 247990),
  ('almaty', 'website', 'business', 12, 366990),
  ('almaty', 'website', 'pro', 12, 549990);

-- Выбранные услуги клиента. Одна строка = одна услуга (категория) в одном
-- пакете. Цены хранятся тут же на момент выбора — прайс могут поднять
-- в будущем, а старая сделка должна остаться на тех цифрах, что обещали.
create table client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  city price_city not null,
  category service_category not null,
  package service_package not null,
  development_price numeric not null default 0,
  subscription_price numeric not null default 0,
  created_at timestamptz not null default now()
);

create index client_services_client_idx on client_services (client_id);

alter table client_services enable row level security;

-- Читать может любой, кто видит самого клиента (в т.ч. разработчик — карточка
-- клиента ему доступна, и пустая секция «Пакет» выглядела бы как баг).
create policy client_services_read on client_services
  for select to authenticated using (
    exists (
      select 1 from clients c
      where c.id = client_id
        and (
          is_admin()
          or current_app_role() = 'developer'
          or c.owner_id = auth.uid()
          or (c.department_id is not null and c.department_id = current_department())
        )
    )
  );

-- Писать — как clients_update: владелец, руководитель отдела или админ.
create policy client_services_write on client_services
  for all to authenticated using (
    exists (
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
  ) with check (
    exists (
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
