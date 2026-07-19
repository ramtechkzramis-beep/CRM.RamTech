import Link from "next/link";
import { SegmentBadge } from "@/components/segment-badge";
import { BUSINESS_SIZE_LABELS, type ClientWithSegment } from "@/lib/client-types";
import { PACKAGE_LABELS, PACKAGE_STYLES } from "@/lib/packages";
import { STAGE_LABELS, STAGE_STYLES } from "@/lib/stages";
import { LoyaltyDot } from "@/components/client-loyalty";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

function RenewalCell({ client }: { client: ClientWithSegment }) {
  if (client.days_to_renewal === null) return <span className="text-slate-400">—</span>;

  const days = client.days_to_renewal;

  if (days < 0) {
    return (
      <span className="font-medium text-red-700">
        просрочено на {Math.abs(days)} дн.
      </span>
    );
  }

  return (
    <span className={days <= 30 ? "font-medium text-amber-700" : "text-slate-600"}>
      через {days} дн.
    </span>
  );
}

export function ClientTable({
  clients,
  variant,
  emptyMessage,
}: {
  clients: ClientWithSegment[];
  variant: "cold" | "active";
  emptyMessage: string;
}) {
  if (clients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Компания</th>
            <th className="px-4 py-3 font-medium">Контакт</th>
            <th className="px-4 py-3 font-medium">Бизнес</th>
            {variant === "active" ? (
              <>
                <th className="px-4 py-3 font-medium">Пакет</th>
                <th className="px-4 py-3 font-medium">Этап</th>
                <th className="px-4 py-3 font-medium">Сегмент</th>
                <th className="px-4 py-3 font-medium">Месяц</th>
                <th className="px-4 py-3 font-medium">Продление</th>
                <th className="px-4 py-3 font-medium">Добавлен</th>
              </>
            ) : (
              <>
                <th className="px-4 py-3 font-medium">Источник</th>
                <th className="px-4 py-3 font-medium">Добавлен</th>
              </>
            )}
            <th className="px-4 py-3 font-medium">Ответственный</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clients.map((client) => (
            <tr key={client.id} className="transition hover:bg-slate-50">
              <td className="px-4 py-3">
                <span className="flex items-start gap-2">
                  {/* Светофор лояльности первым: список читается как карта
                      рисков — сразу видно, где клиент недоволен. */}
                  {variant === "active" && (
                    <span className="mt-1.5">
                      <LoyaltyDot loyalty={client.loyalty} />
                    </span>
                  )}
                  {/* Ссылка внутри строки, а не onClick на <tr>: строка остаётся
                      доступной с клавиатуры и открывается в новой вкладке. */}
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {client.name}
                  </Link>
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {client.contact_person ?? "—"}
                {client.phone && (
                  <span className="block text-xs text-slate-400">{client.phone}</span>
                )}
                {client.city && (
                  <span className="block text-xs text-slate-400">{client.city}</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {client.business_size
                  ? BUSINESS_SIZE_LABELS[client.business_size]
                  : "—"}
              </td>

              {variant === "active" ? (
                <>
                  <td className="px-4 py-3">
                    {client.package ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PACKAGE_STYLES[client.package]}`}
                      >
                        {PACKAGE_LABELS[client.package]}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {client.stage ? (
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLES[client.stage]}`}
                      >
                        {STAGE_LABELS[client.stage]}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SegmentBadge segment={client.segment} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {/* Месяц из скольких: у годового клиента 7-й месяц — норма. */}
                    {client.month_in_cycle
                      ? `${client.month_in_cycle} из ${client.contract_months}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RenewalCell client={client} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {formatDate(client.created_at)}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 text-slate-600">{client.source ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(client.created_at)}
                  </td>
                </>
              )}

              <td className="px-4 py-3 text-slate-600">
                {client.owner_name ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
