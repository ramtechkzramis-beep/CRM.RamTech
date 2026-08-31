"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Возврат через историю браузера, а не на «чистый» адрес списка: так
 * сохраняются фильтры, страница и сортировка, с которыми пришли — иначе
 * каждый заход в карточку клиента сбрасывал бы их.
 *
 * href остаётся как обычная ссылка — на случай открытия в новой вкладке
 * или если истории браузера в этой сессии ещё нет (прямой заход по адресу).
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}
