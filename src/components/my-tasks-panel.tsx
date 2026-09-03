"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getMyTasksForDate } from "@/app/(app)/today/actions";
import { TaskFilterTabs } from "@/components/task-filter-tabs";
import type { TaskWithRelations } from "@/lib/task-types";

/**
 * «Мои задачи» с выборкой по дате. По умолчанию — просрочка + сегодня
 * (то, что уже отрендерил сервер); при выборе другой даты подгружаем
 * все задачи ровно этого дня через серверный экшен, без ухода со страницы.
 */
export function MyTasksPanel({
  today,
  initialTasks,
  currentUserId,
}: {
  /** Сегодняшняя дата, ISO — чтобы понимать, когда вернуться к дефолтному виду. */
  today: string;
  initialTasks: TaskWithRelations[];
  /** Для кнопки редактирования — тут всегда свои задачи, но TaskItem всё равно сверяет владельца. */
  currentUserId: string;
}) {
  const [date, setDate] = useState(today);
  const [tasks, setTasks] = useState(initialTasks);
  const [pending, startTransition] = useTransition();

  function handleDateChange(value: string) {
    if (!value) return;
    setDate(value);

    if (value === today) {
      setTasks(initialTasks);
      return;
    }

    startTransition(async () => {
      const result = await getMyTasksForDate(value);
      setTasks(result);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarDays className="size-4 text-slate-400" />
          Мои задачи
        </h2>
        <Link
          href="/today"
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          все задачи
        </Link>
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => handleDateChange(e.target.value)}
        className="mb-3 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />

      <div className={pending ? "opacity-50 transition-opacity" : ""}>
        <TaskFilterTabs tasks={tasks} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
