-- Статусы «отправлено / доставлено / прочитано» для личных сообщений.
--
-- «Доставлено» — браузер получателя реально получил сообщение (через
-- реалтайм-канал или при открытии чата), а не выдумка ради галочки.
-- «Прочитано» — получатель открывал именно этот диалог после отправки.
-- В групповых чатах отдела статус не показываем: у сообщения много
-- получателей, и одной галочкой не отразить, кто прочитал, а кто нет.

alter table messages add column delivered_at timestamptz;

-- Получателю нужно отметить delivered_at на чужом сообщении, но только это
-- поле и только на сообщениях не от себя. Через security definer функцию,
-- а не открытую политику UPDATE — иначе получатель мог бы переписать
-- текст или отправителя чужого сообщения.
create function mark_conversation_delivered(p_conversation_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  update messages
     set delivered_at = coalesce(delivered_at, now())
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and delivered_at is null
     and can_access_conversation(p_conversation_id);
end;
$$;

-- Отправителю нужно видеть отметку прочтения собеседника, чтобы посчитать
-- «прочитано» у своих сообщений — раньше политика открывала только свою
-- собственную строку.
drop policy if exists conversation_reads_own on conversation_reads;

create policy conversation_reads_select on conversation_reads
  for select to authenticated using (can_access_conversation(conversation_id));

create policy conversation_reads_insert_own on conversation_reads
  for insert to authenticated with check (
    user_id = auth.uid() and can_access_conversation(conversation_id)
  );

create policy conversation_reads_update_own on conversation_reads
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Чтобы галочка «прочитано» переключалась у отправителя вживую, когда
-- собеседник открывает диалог.
alter publication supabase_realtime add table conversation_reads;
