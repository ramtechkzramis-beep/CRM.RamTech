"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatDateRu, formatTimeRu } from "@/lib/dates";

export type MeetingBriefProps = {
  company: string | null;
  dgisUrl: string | null;
  address: string | null;
  contactName: string | null;
  phone: string | null;
  /** Дата встречи, YYYY-MM-DD. */
  date: string;
  /** Время, HH:MM:SS или null — встреча на день без конкретного часа. */
  time: string | null;
  comment: string | null;
};

/**
 * Встреча по шаблону, которым менеджеры делятся в переписке.
 *
 * Порядок строк и подписи фиксированы: текст уходит коллеге целиком,
 * кнопкой «Копировать», без ручной пересборки из карточки клиента.
 *
 * Пустые строки пропускаем — «Ссылка 2гис: —» в скопированном тексте
 * читается как ошибка, а не как отсутствие данных.
 */
function buildLines({
  company,
  dgisUrl,
  address,
  contactName,
  phone,
  date,
  time,
  comment,
}: MeetingBriefProps): { label: string; value: string; href?: string }[] {
  const when = time ? `${formatDateRu(date)} в ${formatTimeRu(time)}` : formatDateRu(date);

  const lines: { label: string; value: string | null; href?: string }[] = [
    { label: "Компания", value: company },
    { label: "Ссылка 2гис", value: dgisUrl, href: dgisUrl ?? undefined },
    { label: "Адрес офиса", value: address },
    { label: "Лпр", value: contactName },
    { label: "Телефон", value: phone },
    { label: "Дата", value: when },
    { label: "Комментарий", value: comment },
  ];

  return lines
    .filter((line): line is { label: string; value: string; href?: string } => !!line.value)
    .map((line) => ({ ...line, value: line.value.trim() }));
}

export function MeetingBrief(props: MeetingBriefProps) {
  const [copied, setCopied] = useState(false);
  const lines = buildLines(props);

  async function copy() {
    const text = lines.map((line) => `${line.label}: ${line.value}`).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена закрыт настройками браузера — текст всё равно виден
      // на экране, выделить и скопировать руками можно.
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <dl className="min-w-0 space-y-0.5 text-xs">
          {lines.map((line) => (
            <div key={line.label} className="flex flex-wrap gap-x-1.5">
              <dt className="text-slate-500">{line.label}:</dt>
              <dd className="min-w-0 break-words text-slate-800">
                {line.href ? (
                  <a
                    href={line.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline-offset-2 hover:underline"
                  >
                    {line.value}
                  </a>
                ) : (
                  line.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={copy}
          title="Скопировать встречу по шаблону"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-600" />
              Скопировано
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Копировать
            </>
          )}
        </button>
      </div>
    </div>
  );
}
