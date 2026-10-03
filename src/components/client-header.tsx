import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { ClientWithSegment } from "@/lib/client-types";
import { telHref, whatsAppHref } from "@/lib/phone";

/** Путь клиента: холодная база → наработка → текущий клиент. */
const STATUS_STEPS = [
  { key: "cold", label: "Холодная база" },
  { key: "warm", label: "Наработки" },
  { key: "active", label: "Текущие клиенты" },
] as const;

function initials(name: string): string {
  return name
    .replace(/[«»"]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function IconLink({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </a>
  );
}

/**
 * Шапка карточки клиента: кто это, где находится и что с ним можно
 * сделать прямо сейчас — позвонить, написать, открыть на карте.
 *
 * Полоса этапов показывает, где компания в пути от холодной базы до
 * текущего клиента. Сами этапы не кликабельны: перевод — это решение
 * с причиной и датой, поэтому он делается кнопкой справа.
 */
export function ClientHeader({
  client,
  stageAction,
  taskAction,
}: {
  client: ClientWithSegment;
  /** Кнопка перевода на следующий этап — своя для каждого статуса. */
  stageAction?: React.ReactNode;
  /** Кнопка «+ Задача». */
  taskAction?: React.ReactNode;
}) {
  const place = [client.city, client.address].filter(Boolean).join(" · ");
  const currentIndex = STATUS_STEPS.findIndex((step) => step.key === client.status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-sm font-bold text-brand-dark">
            {initials(client.name)}
          </span>

          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900">
              {client.name}
            </h1>
            {(place || client.owner_name) && (
              <p className="mt-1 text-sm text-slate-500">
                {place}
                {client.owner_name && (
                  <>
                    {place && " · "}
                    ответственный{" "}
                    <strong className="font-medium text-slate-700">{client.owner_name}</strong>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconLink href={telHref(client.phone)} label="Позвонить">
            <Phone className="size-4" />
          </IconLink>
          <IconLink href={whatsAppHref(client.phone)} label="Написать в WhatsApp">
            <MessageCircle className="size-4" />
          </IconLink>
          <IconLink href={client.dgis_url ?? undefined} label="Открыть в 2ГИС">
            <MapPin className="size-4" />
          </IconLink>
          {taskAction}
        </div>
      </div>

      {client.status !== "archived" && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Этап</span>

          <div className="flex min-w-[20rem] flex-1 flex-wrap gap-2">
            {STATUS_STEPS.map((step, index) => {
              const isCurrent = step.key === client.status;
              const isPassed = currentIndex > index;

              return (
                <span
                  key={step.key}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
                    isCurrent
                      ? "bg-brand font-medium text-white"
                      : isPassed
                        ? "bg-brand-soft text-brand-dark"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isCurrent && <span className="size-1.5 rounded-full bg-white" />}
                  {step.label}
                </span>
              );
            })}
          </div>

          {stageAction}
        </div>
      )}
    </div>
  );
}
