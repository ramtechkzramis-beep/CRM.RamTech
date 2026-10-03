-- Для кого материал: обучение у операторов call-центра и менеджеров по
-- продажам разное, но часть блоков («О компании», «Клиенты») общая.
--
-- Поле нужно, чтобы одно и то же не дублировать двумя копиями: общий
-- материал лежит один раз с аудиторией «all» и виден обеим ролям.
create type knowledge_audience as enum ('all', 'leadgen', 'sales');

alter table knowledge_articles
  add column audience knowledge_audience not null default 'all';

create index knowledge_articles_audience_idx on knowledge_articles (audience);
