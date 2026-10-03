/**
 * Ссылки на звонок и WhatsApp из телефона, записанного как придётся:
 * «8 777 123 45 67», «+7 (777) 123-45-67» — всё приводим к цифрам.
 * Казахстанские номера с 8 переводим в 7: wa.me понимает только
 * международный формат.
 */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  return digits;
}

export function telHref(phone: string | null): string | undefined {
  return phone ? `tel:${phoneDigits(phone)}` : undefined;
}

export function whatsAppHref(phone: string | null): string | undefined {
  return phone ? `https://wa.me/${phoneDigits(phone)}` : undefined;
}
