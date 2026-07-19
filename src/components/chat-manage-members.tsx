"use client";

import { useState } from "react";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import type { DirectoryEmployee } from "@/lib/chat-types";

export function ChatManageMembers({
  title,
  members,
  employees,
  onBack,
  onAdd,
  onRemove,
}: {
  title: string;
  /** Кто уже состоит в чате. */
  members: DirectoryEmployee[];
  /** Все сотрудники — список для добавления строится как employees минус members. */
  employees: DirectoryEmployee[];
  onBack: () => void;
  onAdd: (employeeId: string) => void;
  onRemove: (employeeId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const memberIds = new Set(members.map((m) => m.id));
  const candidates = employees.filter((e) => !memberIds.has(e.id));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад к чату"
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="truncate text-sm font-semibold text-slate-900">
          Участники «{title}»
        </span>
      </div>

      {adding ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Добавить участника
            </span>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              отмена
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-400">
                Все сотрудники уже в чате.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {candidates.map((employee) => (
                  <li key={employee.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onAdd(employee.id);
                        setAdding(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-xs font-semibold text-white">
                        {employee.full_name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate text-sm text-slate-900">
                        {employee.full_name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-slate-100">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-xs font-semibold text-white">
                    {member.full_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-900">
                    {member.full_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(member.id)}
                    aria-label={`Убрать ${member.full_name} из чата`}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-100 p-2.5">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <UserPlus className="size-4" />
              Добавить участника
            </button>
          </div>
        </>
      )}
    </div>
  );
}
