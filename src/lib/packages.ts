/** Пакеты услуг RamTech и прайс. Без обращений к базе — нужны и формам. */

export type ServicePackage = "start" | "business" | "pro" | "enterprise";
export type ContractMonths = 3 | 6 | 12;

export const PACKAGES: ServicePackage[] = ["start", "business", "pro", "enterprise"];
export const CONTRACT_MONTHS: ContractMonths[] = [3, 6, 12];

export const PACKAGE_LABELS: Record<ServicePackage, string> = {
  start: "Start",
  business: "Business",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const PACKAGE_TAGLINES: Record<ServicePackage, string> = {
  start: "Для малого бизнеса — автоматизация базовых обращений",
  business: "Автоматизация продаж и заявок",
  pro: "Для активных отделов продаж — конверсия и контроль",
  enterprise: "Индивидуальная автоматизация бизнеса",
};

export const PACKAGE_STYLES: Record<ServicePackage, string> = {
  start: "bg-slate-100 text-slate-700",
  business: "bg-violet-100 text-violet-800",
  pro: "bg-sky-100 text-sky-800",
  enterprise: "bg-amber-100 text-amber-900",
};

/**
 * Прайс на 2026 год, тенге.
 * Подставляется при выборе пакета, но суммы можно править руками:
 * скидки и индивидуальные условия — обычное дело, особенно в Enterprise,
 * где разработка идёт «от» указанной цены.
 */
export const PRICE_LIST: Record<
  ServicePackage,
  { development: number; subscription: Record<ContractMonths, number> }
> = {
  start: {
    development: 159_000,
    subscription: { 3: 255_990, 6: 448_990, 12: 769_000 },
  },
  business: {
    development: 265_000,
    subscription: { 3: 480_990, 6: 737_500, 12: 1_279_000 },
  },
  pro: {
    development: 340_000,
    subscription: { 3: 639_000, 6: 1_119_990, 12: 1_890_990 },
  },
  enterprise: {
    development: 500_000,
    subscription: { 3: 1_119_990, 6: 1_918_000, 12: 3_190_990 },
  },
};

export function formatTenge(value: number | null): string {
  if (value === null) return "—";
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

export function isPackage(value: string | null): value is ServicePackage {
  return !!value && (PACKAGES as string[]).includes(value);
}

export function isContractMonths(value: number): value is ContractMonths {
  return (CONTRACT_MONTHS as number[]).includes(value);
}
