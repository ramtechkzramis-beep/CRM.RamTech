"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import type { DirectoryEmployee } from "@/lib/chat-types";

export function ChatNewGroup({
  employees,
  onBack,
  onCreate,
}: {
  employees: DirectoryEmployee[];
  onBack: () => void;
  onCreate: (title: string, memberIds: string[]) => Promise<string | null>;
}) {
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!title.trim()) {
      setError("Укажите название чата");
      return;
    }
    if (selected.size === 0) {
      setError("Добавьте хотя бы одного участника");
      return;
    }

    setPending(true);
    const errorMessage = await onCreate(title.trim(), [...selected]);
    setPending(false);

    if (errorMessage) setError(errorMessage);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-slate-900">Новый групповой чат</span>
      </div>

      <div className="border-b border-slate-100 p-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          placeholder="Название чата"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <p className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Участники {selected.size > 0 && `(${selected.size})`}
      </p>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-slate-100">
          {employees.map((employee) => {
            const isChecked = selected.has(employee.id);

            return (
              <li key={employee.id}>
                <button
                  type="button"
                  onClick={() => toggle(employee.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded border transition ${
                      isChecked
                        ? "border-brand bg-brand text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="size-3.5" />
                  </span>
                  <span className="truncate text-sm text-slate-900">
                    {employee.full_name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p className="mx-3 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="border-t border-slate-100 p-2.5">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
        >
          {pending ? "Создаём…" : "Создать чат"}
        </button>
      </div>
    </div>
  );
}
