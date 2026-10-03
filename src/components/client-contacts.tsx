"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Phone, Plus, Pencil, Trash2 } from "lucide-react";
import { saveContact, deleteContact } from "@/app/(app)/clients/actions";
import { telHref, whatsAppHref } from "@/lib/phone";
import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_STYLES,
  type ClientContact,
  type ContactRole,
} from "@/lib/client-types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function ContactForm({
  clientId,
  contact,
  onClose,
}: {
  clientId: string;
  contact?: ClientContact;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await saveContact({ error: null }, formData);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          {contact ? "Редактирование контакта" : "Новое контактное лицо"}
        </h3>

        <form action={handleAction} className="space-y-4">
          <input type="hidden" name="client_id" value={clientId} />
          {contact && <input type="hidden" name="contact_id" value={contact.id} />}

          <div className="space-y-1.5">
            <label htmlFor="full_name" className="text-sm font-medium text-slate-700">
              Имя *
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              defaultValue={contact?.full_name ?? ""}
              className={FIELD_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="role" className="text-sm font-medium text-slate-700">
                Роль
              </label>
              <select
                id="role"
                name="role"
                defaultValue={contact?.role ?? ""}
                className={FIELD_CLASS}
              >
                <option value="">Не указана</option>
                {(Object.keys(CONTACT_ROLE_LABELS) as ContactRole[]).map((role) => (
                  <option key={role} value={role}>
                    {CONTACT_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="position" className="text-sm font-medium text-slate-700">
                Должность
              </label>
              <input
                id="position"
                name="position"
                defaultValue={contact?.position ?? ""}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Телефон
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={contact?.phone ?? ""}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Почта
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={contact?.email ?? ""}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteContactButton({
  contact,
  clientId,
}: {
  contact: ClientContact;
  clientId: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Удалить контакт ${contact.full_name}`}
        className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  // Удаление контакта не отменить, поэтому спрашиваем подтверждение.
  return (
    <form action={deleteContact} className="flex items-center gap-1.5">
      <input type="hidden" name="contact_id" value={contact.id} />
      <input type="hidden" name="client_id" value={clientId} />
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

export function ClientContacts({
  clientId,
  contacts,
  fallback,
}: {
  clientId: string;
  contacts: ClientContact[];
  fallback: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ClientContact | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-slate-900">
          Контактные лица
          <span className="ml-2 text-sm font-normal text-slate-400">{contacts.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Plus className="size-3.5" />
          Добавить
        </button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-slate-500">
          {fallback ?? "Контактных лиц пока нет."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand-dark">
                {contact.full_name.slice(0, 1).toUpperCase()}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{contact.full_name}</span>
                  {contact.role && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${CONTACT_ROLE_STYLES[contact.role]}`}
                    >
                      {CONTACT_ROLE_LABELS[contact.role]}
                    </span>
                  )}
                  {contact.position && (
                    <span className="text-sm text-slate-500">{contact.position}</span>
                  )}
                </span>

                {(contact.phone || contact.email) && (
                  <span className="mt-0.5 block text-sm">
                    {contact.phone && (
                      <span className="font-medium text-brand">{contact.phone}</span>
                    )}
                    {contact.phone && contact.email && (
                      <span className="mx-1.5 text-slate-300">·</span>
                    )}
                    {contact.email && <span className="text-slate-500">{contact.email}</span>}
                  </span>
                )}
              </span>

              {/* Звонок и WhatsApp прямо из строки: ради этих двух действий
                  карточку контакта и открывают. */}
              <span className="flex items-center gap-1">
                {contact.phone && (
                  <>
                    <a
                      href={telHref(contact.phone)}
                      title={`Позвонить ${contact.full_name}`}
                      aria-label={`Позвонить ${contact.full_name}`}
                      className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-600 transition hover:text-slate-900"
                    >
                      <Phone className="size-4" />
                    </a>
                    <a
                      href={whatsAppHref(contact.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Написать ${contact.full_name} в WhatsApp`}
                      aria-label={`Написать ${contact.full_name} в WhatsApp`}
                      className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-600 transition hover:text-slate-900"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(contact)}
                  aria-label={`Редактировать контакт ${contact.full_name}`}
                  className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700"
                >
                  <Pencil className="size-4" />
                </button>
                <DeleteContactButton contact={contact} clientId={clientId} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {adding && <ContactForm clientId={clientId} onClose={() => setAdding(false)} />}
      {editing && (
        <ContactForm
          clientId={clientId}
          contact={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
