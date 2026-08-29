"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { NotebookPen } from "lucide-react";
import { saveMyNotes } from "@/app/(app)/today/actions";

/**
 * Личный черновик — только для заметок «чтобы не забыть», не связан
 * с задачами и никому больше не виден (RLS отдаёт только свою строку).
 * Автосохранение через паузу в наборе — без кнопки «Сохранить».
 */
export function NotesPanel({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setContent(value);
    setStatus("idle");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus("saving");
      startTransition(async () => {
        const formData = new FormData();
        formData.set("content", value);
        await saveMyNotes(formData);
        setStatus("saved");
      });
    }, 800);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <aside className="flex min-w-[26rem] flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <NotebookPen className="size-4 text-slate-400" />
          Заметки
        </h2>
        <span className="text-xs text-slate-400">
          {status === "saving" ? "Сохраняем…" : status === "saved" ? "Сохранено" : ""}
        </span>
      </div>
      {/* Линейки — повторяющийся градиент под высоту строки, а не картинка:
          сдвигается вместе с текстом при скролле (background-attachment: local). */}
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Черновик для себя — что не забыть, идеи, наброски…"
        className="min-h-[85vh] w-full flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-[1.75rem] text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent calc(1.75rem - 1px), #c4b5fd calc(1.75rem - 1px), #c4b5fd 1.75rem)",
          backgroundAttachment: "local",
        }}
      />
    </aside>
  );
}
