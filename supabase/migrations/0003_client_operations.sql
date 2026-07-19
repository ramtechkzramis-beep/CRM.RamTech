-- Перевод клиента в работу и продление договора.
-- Обе функции меняют clients и client_cycles вместе, поэтому вынесены в базу:
-- два отдельных запроса из приложения могут разойтись, если между ними что-то упадёт.
-- security invoker (по умолчанию): права проверяет RLS, как и для обычных запросов.

/**
 * Переводит клиента из холодной базы в текущие и открывает первый цикл.
 */
create function activate_client(p_client_id uuid, p_start_date date)
  returns void language plpgsql set search_path = public as $$
declare
  v_status client_status;
begin
  select status into v_status from clients where id = p_client_id;

  if v_status is null then
    raise exception 'Клиент не найден';
  end if;

  if v_status = 'active' then
    raise exception 'Клиент уже в работе';
  end if;

  if p_start_date > current_date then
    raise exception 'Дата начала работы не может быть в будущем';
  end if;

  update clients
     set status = 'active',
         cycle_start_date = p_start_date
   where id = p_client_id;

  insert into client_cycles (client_id, cycle_number, started_at)
  values (p_client_id, 1, p_start_date);
end;
$$;

/**
 * Продлевает договор: закрывает текущий цикл и открывает следующий.
 * Новый цикл начинается там, где закончился предыдущий, а не сегодня, —
 * иначе при продлении задним числом сроки поедут.
 */
create function renew_client(p_client_id uuid)
  returns void language plpgsql set search_path = public as $$
declare
  v_start date;
  v_status client_status;
  v_cycle_number int;
  v_new_start date;
begin
  select status, cycle_start_date into v_status, v_start
    from clients where id = p_client_id;

  if v_status is null then
    raise exception 'Клиент не найден';
  end if;

  if v_status <> 'active' then
    raise exception 'Продлить можно только клиента в работе';
  end if;

  v_new_start := (v_start + (cycle_length_months() || ' months')::interval)::date;

  select coalesce(max(cycle_number), 0) into v_cycle_number
    from client_cycles where client_id = p_client_id;

  update client_cycles
     set ended_at = v_new_start,
         renewed = true
   where client_id = p_client_id
     and cycle_number = v_cycle_number;

  insert into client_cycles (client_id, cycle_number, started_at)
  values (p_client_id, v_cycle_number + 1, v_new_start);

  update clients set cycle_start_date = v_new_start where id = p_client_id;
end;
$$;
