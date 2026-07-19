-- Явный порядок статей внутри категории. До этого список сортировался
-- по created_at по убыванию — для справочника это нормально («новое сверху»),
-- но для последовательного курса (скрипты продаж по шагам сделки) порядок
-- получался перевёрнутым: последний добавленный этап показывался первым.

alter table knowledge_articles add column sort_order int not null default 0;

create index knowledge_articles_category_sort_idx
  on knowledge_articles (category, sort_order, created_at);
