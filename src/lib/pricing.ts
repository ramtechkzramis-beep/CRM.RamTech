/**
 * Комбо-цены: город x категория услуги x пакет x срок.
 * Без обращений к базе — нужны и формам, и серверным экшенам.
 */

import type { ContractMonths, ServicePackage } from "@/lib/packages";

export type ServiceCategory = "bot" | "crm" | "website";
export type PriceCity = "almaty" | "shymkent";

export const SERVICE_CATEGORIES: ServiceCategory[] = ["bot", "crm", "website"];
export const PRICE_CITIES: PriceCity[] = ["shymkent", "almaty"];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  bot: "Чат-бот",
  crm: "CRM",
  website: "Сайт",
};

export const CITY_LABELS: Record<PriceCity, string> = {
  shymkent: "Шымкент",
  almaty: "Алматы",
};

export function isServiceCategory(value: string | null): value is ServiceCategory {
  return !!value && (SERVICE_CATEGORIES as string[]).includes(value);
}

export function isPriceCity(value: string | null): value is PriceCity {
  return !!value && (PRICE_CITIES as string[]).includes(value);
}

/** Пакет для позиций прайса — Enterprise там нет, цена индивидуальная. */
export type PricedPackage = Exclude<ServicePackage, "enterprise">;

export function isPricedPackage(value: string): value is PricedPackage {
  return value === "start" || value === "business" || value === "pro";
}

export type PricePosition = {
  city: PriceCity;
  category: ServiceCategory;
  package: PricedPackage;
  contractMonths: ContractMonths;
  developmentPrice: number;
  monthlyServicePrice: number;
  packagePrice: number;
  composition: string | null;
  dialogLimit: string | null;
};

export type ComboServiceInput = {
  /** Цена абонемента услуги за срок (position.packagePrice). */
  packagePrice: number;
};

export type ComboTotals = {
  /** Сумма полных цен выбранных пакетов. */
  baseTotal: number;
  /** Итоговый абонемент за срок. */
  comboTotal: number;
};

/**
 * Считает итог по нескольким выбранным услугам одного клиента.
 *
 * Каждая услуга идёт по своей цене из прайса, итог — их сумма. Скидки за
 * набор услуг нет: берёт клиент одну услугу или три, цена каждой одна и та
 * же. Если нужно уступить — для этого есть ручная скидка по сделке, её
 * менеджер ставит осознанно и она видна в карточке.
 */
export function calcComboTotals(services: ComboServiceInput[]): ComboTotals {
  const baseTotal = services.reduce((sum, s) => sum + s.packagePrice, 0);

  return { baseTotal, comboTotal: baseTotal };
}
