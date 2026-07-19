/**
 * Содержимое коммерческого предложения — тексты и реквизиты, без обращений
 * к базе. Ровно та же формулировка пакетов, что и в первоначальном прайсе
 * RamTech, разложенная по пунктам для документа.
 */

import {
  PACKAGE_LABELS,
  PACKAGE_TAGLINES,
  type ContractMonths,
  type ServicePackage,
} from "@/lib/packages";
import {
  calcTotals,
  monthlyLoad,
  buildPaymentPlan,
  SCHEME_LABELS,
  type PaymentScheme,
  type PaymentPlanItem,
  type Totals,
} from "@/lib/payments";
import { addDaysISO, formatDateRu } from "@/lib/dates";

/** Сколько дней предложение считается действительным с даты выгрузки. */
export const PROPOSAL_VALIDITY_DAYS = 14;

/** Кому подходит пакет — используется прямо под названием в документе. */
export const PACKAGE_AUDIENCE: Record<ServicePackage, string> = {
  start: "Малому бизнесу, который только начинает автоматизировать обращения",
  business: "Бизнесу с потоком заявок, которому нужны продажи через мессенджеры",
  pro: "Активным отделам продаж, которым важен контроль и конверсия",
  enterprise: "Крупному и среднему бизнесу с индивидуальными процессами",
};

/** Развёрнутое описание пакета — абзац для отдельной страницы КП. */
export const PACKAGE_DESCRIPTIONS: Record<ServicePackage, string> = {
  start:
    "Пакет Start — входная точка в автоматизацию: один чат-бот для WhatsApp или Instagram, который принимает заявки и отвечает на частые вопросы, снимая рутину с администратора. Подходит малому бизнесу, который только начинает автоматизировать общение с клиентами.",
  business:
    "Пакет Business расширяет автоматизацию до двух каналов и добавляет персонализацию: бот не просто отвечает, а фильтрует заявки и передаёт менеджеру только тёплых клиентов. Подходит бизнесу с потоком заявок, которому важны продажи через мессенджеры.",
  pro: "Пакет Pro — для отделов продаж, где важны контроль и конверсия: до трёх ботов, автоматическая сегментация заявок, интеграция с оплатами и доставкой, и личный менеджер проекта. Подходит активным отделам продаж.",
  enterprise:
    "Пакет Enterprise — индивидуальная автоматизация под процессы крупного бизнеса: неограниченное количество ботов, интеграции под любые системы компании и поддержка 24/7. Подходит крупному и среднему бизнесу со сложными процессами.",
};

/**
 * Те же пункты из PACKAGE_FEATURES, но разложенные по категориям —
 * для карточной вёрстки на странице пакета. Фактов не добавляем,
 * только группируем то, что уже объявлено выше.
 */
export type FeatureGroup = { category: string; items: string[] };

export const PACKAGE_FEATURE_GROUPS: Record<ServicePackage, FeatureGroup[]> = {
  start: [
    { category: "Чат-бот", items: ["Чат-бот для WhatsApp или Instagram", "Приём заявок и ответы на частые вопросы"] },
    { category: "Интеграция", items: ["1 интеграция (CRM или Google Таблицы)"] },
    { category: "Поддержка", items: ["Уменьшение нагрузки на администратора", "Корректировки сценария — 1 раз в месяц"] },
  ],
  business: [
    { category: "Чат-бот", items: ["До 2 чат-ботов (WhatsApp + Instagram)", "Персонализированные ответы клиентам"] },
    { category: "Интеграция", items: ["2 интеграции (CRM, таблицы, календари)"] },
    { category: "Поддержка", items: ["Фильтрация и передача горячих заявок менеджеру", "Регулярные улучшения и аналитика"] },
  ],
  pro: [
    { category: "Чат-бот", items: ["До 3 чат-ботов", "Глубокая персонализация под клиента", "Автоматическая сегментация заявок"] },
    { category: "Интеграция", items: ["Интеграция с CRM, оплатами, доставкой"] },
    { category: "Поддержка", items: ["Личный менеджер проекта", "Постоянная оптимизация сценариев"] },
  ],
  enterprise: [
    { category: "Чат-бот", items: ["Неограниченное количество ботов", "Индивидуальные сценарии под отделы"] },
    { category: "Интеграция", items: ["Любые интеграции под процессы компании"] },
    { category: "Поддержка", items: ["Безлимитные обновления", "Поддержка 24/7"] },
  ],
};

/** Статические разделы «о компании» — одинаковые для любого пакета. */
export const COMPANY_INTRO =
  "RamTech разрабатывает умные чат-боты, которые помогают бизнесам оптимизировать взаимодействие с клиентами. Мы создаём автоматические сценарии общения в WhatsApp и Instagram, которые обеспечивают мгновенные ответы на запросы и позволяют избежать потери потенциальных клиентов. Наша система способна обрабатывать заявки, отвечать на частые вопросы и передавать только квалифицированных клиентов менеджерам. Это не только снижает нагрузку на сотрудников, но и повышает уровень обслуживания. В итоге ваш бизнес становится более эффективным и доступным для клиентов в любое время суток, что значительно увеличивает шансы на успешные продажи и лояльность клиентов.";

export const WHY_CHATBOT_INTRO =
  "В современном бизнесе клиенты предпочитают общаться через мессенджеры, а не звонить. Если им не удаётся быстро получить ответ, они могут обратиться к конкурентам. Чат-боты решают эту проблему, обеспечивая мгновенное реагирование. Они способны принять заявку, ответить на часто задаваемые вопросы и передавать только «горячих» клиентов менеджерам. Это не только освобождает время сотрудников, но и минимизирует риск потери потенциальных клиентов. Благодаря автоматизации общения бизнес получает возможность повысить свою эффективность и улучшить клиентский опыт, что в свою очередь ведёт к увеличению продаж и укреплению позиции на рынке.";

export const CHATBOT_ADVANTAGES =
  "Чат-боты не только увеличивают скорость обработки запросов, но и обеспечивают круглосуточную доступность. Это значит, что клиенты могут получить помощь в любое время, даже ночью. Уменьшение нагрузки на администрацию позволяет сотрудникам сосредоточиться на более сложных задачах и стратегическом планировании, что способствует общему росту бизнеса. Интеграция с CRM-системами или Google Таблицами упрощает управление заявками и делает процесс ещё более эффективным. Внедрение чат-бота — это шаг в будущее, который помогает бизнесу оставаться конкурентоспособным и адаптироваться к меняющимся условиям рынка.";

/** Что входит в пакет — те же пункты, что и в прайсе RamTech. */
export const PACKAGE_FEATURES: Record<ServicePackage, string[]> = {
  start: [
    "Чат-бот для WhatsApp или Instagram",
    "Приём заявок и ответы на частые вопросы",
    "Уменьшение нагрузки на администратора",
    "1 интеграция (CRM / Google Sheets)",
    "Поддержка и корректировки — 1 раз в месяц",
  ],
  business: [
    "До 2 чат-ботов (WhatsApp + Instagram)",
    "Персонализированные ответы клиентам",
    "Фильтрация и передача горячих заявок менеджеру",
    "2 интеграции (CRM, таблицы, календари)",
    "Регулярные улучшения и аналитика",
  ],
  pro: [
    "До 3 чат-ботов",
    "Глубокая персонализация под клиента",
    "Автоматическая сегментация заявок",
    "Интеграция с CRM, оплатами, доставкой",
    "Личный менеджер проекта",
    "Постоянная оптимизация сценариев",
  ],
  enterprise: [
    "Неограниченное количество ботов",
    "Любые интеграции под процессы компании",
    "Индивидуальные сценарии под отделы",
    "Безлимитные обновления",
    "Поддержка 24/7",
  ],
};

/**
 * Реквизиты компании для документа.
 *
 * Заполнены плейсхолдерами намеренно: настоящие контакты для клиентов
 * должен вписать сам RamTech, придумывать телефон или почту нельзя.
 * Замените значения на реальные — документ подхватит их сразу.
 */
/**
 * Валюта для PDF — «тг.», а не значок ₸: не гарантировано, что этот
 * относительно редкий символ есть в глифах встроенного шрифта, а рисковать
 * пустым квадратом вместо суммы в документе для клиента нельзя.
 */
export function formatTengePdf(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} тг.`;
}

export const COMPANY_INFO = {
  name: "RamTech",
  tagline: "Чат-боты для бизнеса",
  phone: "[Телефон RamTech]",
  email: "[Почта для клиентов]",
  contact: "[Instagram или сайт]",
};

export type ProposalInput = {
  clientName: string;
  /** Имя ответственного менеджера — «Представлено» на обложке. Может быть неизвестно. */
  managerName?: string | null;
  package: ServicePackage;
  contractMonths: ContractMonths;
  developmentPrice: number | null;
  subscriptionPrice: number | null;
  discountPercent: number;
  paymentScheme: PaymentScheme | null;
  /** Дата выгрузки, YYYY-MM-DD. От неё считается срок действия предложения. */
  issueDateISO: string;
};

export type ProposalViewModel = {
  clientName: string;
  managerName: string | null;
  packageLabel: string;
  audience: string;
  tagline: string;
  description: string;
  features: string[];
  featureGroups: FeatureGroup[];
  contractMonths: number;
  totals: Totals;
  load: number;
  paymentSchemeLabel: string | null;
  paymentPlan: PaymentPlanItem[];
  issueDate: string;
  validUntil: string;
};

/**
 * Собирает все данные для документа через уже проверенные расчёты
 * (calcTotals/monthlyLoad/buildPaymentPlan) — чтобы сумма в КП никогда
 * не разошлась с тем, что менеджер видит в карточке клиента.
 */
export function buildProposalViewModel(input: ProposalInput): ProposalViewModel {
  const totals = calcTotals(
    input.developmentPrice,
    input.subscriptionPrice,
    input.discountPercent,
  );
  const load = monthlyLoad(totals.subscriptionAfterDiscount, input.contractMonths);
  const paymentPlan = input.paymentScheme
    ? buildPaymentPlan(totals.total, input.paymentScheme)
    : [];

  return {
    clientName: input.clientName,
    managerName: input.managerName ?? null,
    packageLabel: PACKAGE_LABELS[input.package],
    audience: PACKAGE_AUDIENCE[input.package],
    tagline: PACKAGE_TAGLINES[input.package],
    description: PACKAGE_DESCRIPTIONS[input.package],
    features: PACKAGE_FEATURES[input.package],
    featureGroups: PACKAGE_FEATURE_GROUPS[input.package],
    contractMonths: input.contractMonths,
    totals,
    load,
    paymentSchemeLabel: input.paymentScheme ? SCHEME_LABELS[input.paymentScheme] : null,
    paymentPlan,
    issueDate: formatDateRu(input.issueDateISO),
    validUntil: formatDateRu(addDaysISO(input.issueDateISO, PROPOSAL_VALIDITY_DAYS)),
  };
}
