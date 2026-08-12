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

/**
 * Скидка за комбинацию услуг: чем больше услуг клиент берёт разом,
 * тем ниже коэффициент к сумме их полных цен.
 */
export const COMBO_COEFFICIENTS: Record<number, number> = {
  1: 1,
  2: 0.9,
  3: 0.85,
};

export function comboCoefficient(serviceCount: number): number {
  if (serviceCount <= 1) return COMBO_COEFFICIENTS[1];
  if (serviceCount >= 3) return COMBO_COEFFICIENTS[3];
  return COMBO_COEFFICIENTS[serviceCount] ?? 1;
}

/**
 * Маркетинговое округление цены комбо: до тысяч, минус 10 тенге
 * (все цены в прайсе RamTech заканчиваются на «990»).
 */
export function roundComboPrice(value: number): number {
  return Math.round(value / 1000) * 1000 - 10;
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
  /** Полная цена пакета услуги за срок (position.packagePrice). */
  packagePrice: number;
  /** Разработка (position.developmentPrice) — часть packagePrice. */
  developmentPrice: number;
};

export type ComboTotals = {
  /** Сумма полных цен пакетов до скидки за комбинацию. */
  baseTotal: number;
  /** Коэффициент скидки за количество услуг. */
  coefficient: number;
  /** Итоговая цена комбинации после скидки и округления. */
  comboTotal: number;
  /** Разработка — доля от comboTotal, пропорциональная составу. */
  developmentPrice: number;
  /** Абонемент за срок — остаток от comboTotal после разработки. */
  subscriptionPrice: number;
};

/**
 * Считает итог по нескольким выбранным услугам одного клиента.
 *
 * Формула по прайсу RamTech: сумма полных цен пакетов x коэффициент
 * за количество услуг, округлённая до «...990». Для одной услуги
 * коэффициент 1 и округление не меняют цену — считалось на реальных
 * цифрах прайса и совпадает с ценой позиции день-в-день.
 *
 * Разработка/абонемент внутри comboTotal делятся пропорционально тому,
 * что было в позициях до скидки — так соотношение «разово / за срок»
 * не искажается комбо-скидкой.
 */
export function calcComboTotals(services: ComboServiceInput[]): ComboTotals {
  if (services.length === 0) {
    return { baseTotal: 0, coefficient: 1, comboTotal: 0, developmentPrice: 0, subscriptionPrice: 0 };
  }

  const baseTotal = services.reduce((sum, s) => sum + s.packagePrice, 0);
  const baseDevelopment = services.reduce((sum, s) => sum + s.developmentPrice, 0);

  // Одна услуга — цену не трогаем: округление до «...990» рассчитано на
  // реальные цифры прайса и исказило бы ручную Enterprise-цену, введённую
  // менеджером (например, 500 000 стало бы 499 990 без всякой скидки).
  if (services.length === 1) {
    return {
      baseTotal,
      coefficient: 1,
      comboTotal: baseTotal,
      developmentPrice: baseDevelopment,
      subscriptionPrice: baseTotal - baseDevelopment,
    };
  }

  const coefficient = comboCoefficient(services.length);
  const comboTotal = roundComboPrice(baseTotal * coefficient);

  const developmentPrice = baseTotal > 0
    ? Math.round(baseDevelopment * (comboTotal / baseTotal))
    : 0;
  const subscriptionPrice = comboTotal - developmentPrice;

  return { baseTotal, coefficient, comboTotal, developmentPrice, subscriptionPrice };
}
