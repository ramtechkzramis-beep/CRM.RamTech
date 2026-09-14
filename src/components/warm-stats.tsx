"use client";

import Link from "next/link";
import { useState } from "react";
import {
  WARM_EVENT_KINDS,
  WARM_EVENT_LABELS,
  WARM_EVENT_STYLES,
  type WarmEvent,
  type WarmEventKind,
} from "@/lib/summary-types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU");
}

/**
 * Итоги по наработкам за период: сколько компаний оформили, сколько
 * отказались, сколько раз переносили ответ. Плитки кликабельные, как
 * «Итого», — по цифре сразу видно, какие именно это компании и почему.
 *
 * Переносы считаем событиями, а не компаниями: одну наработку могут
 * двигать несколько раз, и каждый перенос — отдельный сигнал.
 */
export function WarmStats({ events }: { events: WarmEvent[] }) {
  const [selected, setSelected] = useState<WarmEventKind | null>(null);

  const counts: Record<WarmEventKind, number> = { signed: 0, refused: 0, postponed: 0 };
  for (const event of events) counts[event.kind] += 1;

  const selectedEvents = selected ? events.filter((event) => event.kind === selected) : [];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4">
        {WARM_EVENT_KINDS.map((kind) => {
          const isActive = selected === kind;

          return (
            <button
              key={kind}
              type="button"
              onClick={() => setSelected(isActive ? null : kind)}
              aria-pressed={isActive}
              className={`rounded-xl border bg-white p-4 text-left transition ${
                isActive
                  ? "border-brand ring-1 ring-brand"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${WARM_EVENT_STYLES[kind]}`}
              >
                {WARM_EVENT_LABELS[kind]}
              </span>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{counts[kind]}</p>
            </button>
          );
        })}
        <div className="rounded-xl border border-brand bg-gradient-to-r from-brand to-brand-dark p-4">
          <span className="text-xs font-medium text-slate-300">Всего решений</span>
          <p className="mt-2 text-2xl font-semibold text-white">{events.length}</p>
        </div>
      </div>

      {selected && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
            {WARM_EVENT_LABELS[selected]}: {selectedEvents.length}
          </p>

          {selectedEvents.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              За этот период таких решений нет.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedEvents.map((event) => (
                <li key={event.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Link
                      href={`/clients/${event.client_id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {event.client_name ?? "—"}
                    </Link>
                    {event.kind === "postponed" && event.new_response_date && (
                      <span className="text-xs font-medium text-amber-700">
                        {event.previous_response_date
                          ? `${formatDate(event.previous_response_date)} → ${formatDate(event.new_response_date)}`
                          : `ответ перенесён на ${formatDate(event.new_response_date)}`}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(event.created_at)}
                    {event.owner_name && ` · ${event.owner_name}`}
                  </p>
                  {event.note && (
                    <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      {event.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
