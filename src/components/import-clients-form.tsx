"use client";

import { useState, useTransition } from "react";
import { Upload, Download, CheckCircle2 } from "lucide-react";
import {
  importClientsFromExcel,
  type ImportState,
} from "@/app/(app)/clients/import-actions";

export function ImportClientsForm() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ImportState>({ error: null });
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      setState(await importClientsFromExcel({ error: null }, formData));
    });
  }

  function close() {
    setOpen(false);
    setState({ error: null });
    setFileName(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Upload className="size-4" />
        Загрузить из Excel
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Загрузка клиентов из Excel
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Клиенты попадут в холодную базу и будут записаны на вас.
        </p>

        {/* Результат показываем вместо формы: после загрузки важно увидеть,
            что именно попало в базу, а что пропущено и почему. */}
        {state.done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Загружено фирм: {state.imported}
                </p>
                {(state.contactsImported ?? 0) > 0 && (
                  <p className="text-sm text-emerald-800">
                    Контактных лиц: {state.contactsImported}
                  </p>
                )}
                {(state.skipped?.length ?? 0) > 0 && (
                  <p className="text-sm text-emerald-800">
                    Пропущено строк: {state.skipped?.length}
                  </p>
                )}
              </div>
            </div>

            {(state.skipped?.length ?? 0) > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                <ul className="divide-y divide-slate-100 text-sm">
                  {state.skipped?.map((item, index) => (
                    <li key={index} className="px-3 py-2 text-slate-600">
                      {item.row > 0 && (
                        <span className="font-medium text-slate-900">
                          Строка {item.row}:{" "}
                        </span>
                      )}
                      {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark"
              >
                Готово
              </button>
            </div>
          </div>
        ) : (
          <form action={handleAction} className="space-y-4">
            {/* Именно <a>, а не Link: по этому адресу отдаётся файл, а не страница. */}
            <a
              href="/clients/template"
              download
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
            >
              <Download className="size-4" />
              Скачать шаблон
            </a>

            <div className="space-y-1.5">
              <label htmlFor="file" className="block text-sm font-medium text-slate-700">
                Файл Excel (.xlsx или .xls)
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".xlsx,.xls"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
              />
              {fileName && (
                <p className="text-xs text-slate-500">Выбран: {fileName}</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <p className="mb-1 font-medium text-slate-700">Как должен выглядеть файл:</p>
              <p>
                Первая строка — заголовки; свои названия колонок менять не нужно,
                система узнает их сама («Фирмы», «Город куратора», «Данные» и т.п.).
                Обязательна только колонка с названием компании. Несколько строк с
                одной фирмой — это несколько её контактных лиц. Фирмы, которые уже
                есть в CRM, будут пропущены.
              </p>
            </div>

            {state.error && (
              <div className="space-y-2">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
                {(state.skipped?.length ?? 0) > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                    <ul className="divide-y divide-slate-100 text-sm">
                      {state.skipped?.map((item, index) => (
                        <li key={index} className="px-3 py-2 text-slate-600">
                          {item.row > 0 && (
                            <span className="font-medium text-slate-900">
                              Строка {item.row}:{" "}
                            </span>
                          )}
                          {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
              >
                {pending ? "Загружаем…" : "Загрузить"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
