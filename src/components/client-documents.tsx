"use client";

import { useState, useTransition } from "react";
import { FileText, Upload, Trash2, Download } from "lucide-react";
import {
  uploadDocument,
  deleteDocument,
} from "@/app/(app)/clients/document-actions";
import {
  DOCUMENT_KIND_LABELS,
  type ClientDocument,
  type DocumentKind,
} from "@/lib/client-types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const KIND_STYLES: Record<DocumentKind, string> = {
  contract: "bg-emerald-100 text-emerald-800",
  invoice: "bg-sky-100 text-sky-800",
  act: "bg-violet-100 text-violet-800",
  other: "bg-slate-100 text-slate-600",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function UploadForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await uploadDocument({ error: null }, formData);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Загрузить документ</h3>

        <form action={handleAction} className="space-y-4">
          <input type="hidden" name="client_id" value={clientId} />

          <div className="space-y-1.5">
            <label htmlFor="kind" className="text-sm font-medium text-slate-700">
              Тип документа
            </label>
            <select id="kind" name="kind" defaultValue="contract" className={FIELD_CLASS}>
              {(Object.keys(DOCUMENT_KIND_LABELS) as DocumentKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {DOCUMENT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">
              Название
            </label>
            <input
              id="title"
              name="title"
              placeholder="Например: Договор №12 от 16.07.2026"
              className={FIELD_CLASS}
            />
            <p className="text-xs text-slate-500">
              Если не заполнить, возьмём имя файла.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="file" className="block text-sm font-medium text-slate-700">
              Файл
            </label>
            <input
              id="file"
              name="file"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
            />
            <p className="text-xs text-slate-500">
              Скан или фото: PDF, JPG, PNG или Word. До 20 МБ.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
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
      </div>
    </div>
  );
}

function DeleteButton({ doc }: { doc: ClientDocument }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Удалить ${doc.title}`}
        className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  // Документ удаляется вместе с файлом и не восстанавливается — спрашиваем.
  return (
    <form action={deleteDocument} className="flex items-center gap-1.5">
      <input type="hidden" name="document_id" value={doc.id} />
      <input type="hidden" name="client_id" value={doc.client_id} />
      <input type="hidden" name="storage_path" value={doc.storage_path} />
      <span className="text-xs text-slate-500">Удалить?</span>
      <button
        type="submit"
        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700"
      >
        Да
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
      >
        Нет
      </button>
    </form>
  );
}

export function ClientDocuments({
  clientId,
  documents,
  urls,
  canManage,
}: {
  clientId: string;
  documents: ClientDocument[];
  urls: Record<string, string | null>;
  canManage: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText className="size-4 text-slate-400" />
          Документы
          {documents.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {documents.length}
            </span>
          )}
        </h2>

        {canManage && (
          <button
            type="button"
            onClick={() => setUploading(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Upload className="size-3.5" />
            Загрузить
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-500">
          {canManage
            ? "Сканов подписанных документов пока нет."
            : "Документов пока нет. Загрузить их может руководитель."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLES[doc.kind]}`}
              >
                {DOCUMENT_KIND_LABELS[doc.kind]}
              </span>

              {urls[doc.id] ? (
                <a
                  href={urls[doc.id]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline"
                >
                  {doc.title}
                  <Download className="size-3 text-slate-400" />
                </a>
              ) : (
                <span className="font-medium text-slate-900">{doc.title}</span>
              )}

              <span className="text-xs text-slate-400">
                {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
              </span>

              {canManage && (
                <span className="ml-auto">
                  <DeleteButton doc={doc} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {uploading && (
        <UploadForm clientId={clientId} onClose={() => setUploading(false)} />
      )}
    </div>
  );
}
