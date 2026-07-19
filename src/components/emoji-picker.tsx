"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { EMOJI_GROUPS } from "@/lib/emoji-data";

/** Кнопка со смайликом рядом с полем ввода — открывает всплывающую панель выбора. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Вставить смайлик"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <Smile className="size-4" />
      </button>

      {open && (
        <div className="absolute bottom-11 right-0 z-10 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onPick(emoji)}
                      className="flex size-7 items-center justify-center rounded text-lg transition hover:bg-slate-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
