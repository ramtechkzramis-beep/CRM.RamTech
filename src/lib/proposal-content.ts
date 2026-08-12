/**
 * Содержимое коммерческого предложения — тексты и реквизиты, без обращений
 * к базе. Копирайт компании: позиционирование «AI-ассистенты для бизнеса»
 * (не только чат-боты), три пакета — Старт / Бизнес / Корпоративный.
 */

import type { ContractMonths, ServicePackage } from "@/lib/packages";
import {
  CITY_LABELS,
  SERVICE_CATEGORY_LABELS,
  type PriceCity,
  type ServiceCategory,
} from "@/lib/pricing";
import {
  calcTotals,
  monthlyLoad,
  buildPaymentPlan,
  SCHEME_HINTS,
  SCHEME_LABELS,
  type PaymentScheme,
  type PaymentPlanItem,
  type Totals,
} from "@/lib/payments";
import { addDaysISO, formatDateRu } from "@/lib/dates";

/** Сколько дней предложение считается действительным с даты выгрузки. */
export const PROPOSAL_VALIDITY_DAYS = 14;

export const COMPANY_INFO = {
  name: "RamTech",
  tagline: "AI Solutions",
  phone: "8 776 979 2285",
  email: "ramtech24@mail.ru",
  contact: "ram-techkz.vercel.app",
};

// --- Обложка и «О нас» -------------------------------------------------

export const COVER_TITLE = "Коммерческое предложение";
export const COVER_TAGLINE = "AI-ассистенты для бизнеса";
export const COVER_LEAD =
  "Интеллектуальные решения, которые автоматизируют процессы, улучшают клиентский опыт и увеличивают прибыль.";
export const COVER_TAGS = [
  "Чат-боты",
  "Голосовые ассистенты",
  "Интеграции с CRM",
  "Базы знаний",
  "Аналитика диалогов",
];
export const COVER_CLOSING = "Будущее бизнеса начинается с искусственного интеллекта.";

export const ABOUT_HEADING = "Мы создаём AI-ассистентов, которые работают на результат.";
export const ABOUT_INTRO =
  "RamTech — команда экспертов в области искусственного интеллекта, автоматизации и бизнес-процессов. Мы разрабатываем AI-ассистентов, которые интегрируются в ваши системы, говорят голосом вашего бренда и решают конкретные задачи бизнеса: от обработки заявок и поддержки клиентов до внутренней аналитики. Работаем с компаниями сегмента B2B и SMB — там, где важны скорость ответа, качество сервиса и стоимость обработки обращения.";

export type InfoCard = { title: string; text: string };

export const ABOUT_CARDS: InfoCard[] = [
  {
    title: "Экспертиза",
    text: "Глубокая экспертиза в AI, NLP и автоматизации бизнес-процессов. Опыт внедрения решений в продажах, клиентском сервисе и операционных задачах.",
  },
  {
    title: "Надёжность",
    text: "Безопасность данных и соответствие современным стандартам. Разграничение доступов, логирование диалогов, размещение в вашем контуре при необходимости.",
  },
  {
    title: "Результат",
    text: "Фокус на измеримом результате: скорость ответа, доля автоматизированных обращений, конверсия в заявку. Метрики фиксируем до старта работ.",
  },
  {
    title: "Индивидуальный подход",
    text: "Никаких шаблонных ботов: сценарии, тональность и логика собираются под задачи и цели именно вашего бизнеса.",
  },
];

export const ABOUT_STATS: { value: string; label: string }[] = [
  { value: "24/7", label: "Ассистент на связи без выходных и пауз" },
  { value: "2–8 недель", label: "Срок разработки и запуска решения" },
  { value: "7 этапов", label: "Прозрачный процесс от идеи до поддержки" },
  { value: "100%", label: "Кастомизация под ваши процессы" },
];

// --- Решение -------------------------------------------------------------

export const SOLUTION_INTRO =
  "AI-ассистенты RamTech берут на себя рутинные задачи, чтобы вы и ваша команда могли сосредоточиться на росте.";

export const SOLUTION_AREAS: InfoCard[] = [
  {
    title: "Работа с клиентами",
    text: "Поддержка 24/7, ответы на типовые вопросы, консультации по товарам и услугам, запись и оформление заявок.",
  },
  {
    title: "Продажи",
    text: "Квалификация лидов, подбор и рекомендации, сопровождение сделок, автоматические напоминания и возврат «спящих» клиентов.",
  },
  {
    title: "Аналитика",
    text: "Сбор и анализ данных по диалогам, отчёты по обращениям и конверсиям, прогнозы нагрузки и точки роста.",
  },
  {
    title: "База знаний",
    text: "Поиск информации по вашим документам и регламентам, обучение сотрудников, мгновенный доступ к актуальным данным.",
  },
  {
    title: "Внутренние процессы",
    text: "Автоматизация задач, уведомления команде, контроль исполнения поручений и передача данных между системами.",
  },
];

export const CHANNELS = ["WhatsApp", "Telegram", "Сайт / виджет", "Instagram Direct", "Почта", "Телефония"];

export const BUSINESS_BENEFITS = [
  "Снижение операционных затрат",
  "Повышение скорости обработки запросов",
  "Рост качества клиентского сервиса",
  "Масштабируемость без потери качества",
  "Быстрая окупаемость решения",
];

// --- Услуги ----------------------------------------------------------------

export const SERVICES_INTRO_TITLE = "Вы выбираете только те услуги, которые нужны именно вам.";
export const SERVICES_INTRO_TEXT =
  "Модульный подход: можно начать с анализа и пилота, а можно передать нам весь цикл — от проектирования до поддержки и развития ассистента.";

export type ServiceModule = { title: string; items: string[] };

export const SERVICE_MODULES: ServiceModule[] = [
  {
    title: "Анализ и консультация",
    items: [
      "Аудит бизнес-процессов и точек потери клиентов",
      "Определение сценариев использования AI",
      "Оценка экономического эффекта",
      "Формирование технического задания",
    ],
  },
  {
    title: "Проектирование решения",
    items: [
      "Архитектура AI-ассистента",
      "Проектирование диалогов и логики",
      "Выбор технологий и интеграций",
      "Согласование сценариев с командой",
    ],
  },
  {
    title: "Разработка AI-ассистента",
    items: [
      "Разработка чат-бота или голосового ассистента",
      "Настройка NLP и бизнес-логики",
      "Обучение на ваших данных и документах",
      "Интеграция с вашими системами",
    ],
  },
  {
    title: "Интеграция и подключение",
    items: [
      "Подключение к CRM, ERP, 1С, сайту и др.",
      "Настройка каналов: мессенджеры, сайт, почта, телефон",
      "Передача данных и заявок в ваши системы",
      "Настройка ролей и прав доступа",
    ],
  },
  {
    title: "Тестирование и запуск",
    items: [
      "Тестирование сценариев и отладка",
      "Пилот на ограниченном потоке обращений",
      "Обучение вашей команды работе с решением",
      "Запуск и передача решения",
    ],
  },
  {
    title: "Поддержка и развитие",
    items: [
      "Техническая поддержка и мониторинг",
      "Обновление и улучшение ассистента",
      "Добавление новых функций и сценариев",
      "Регулярная отчётность по метрикам",
    ],
  },
];

export const MODULAR_NOTE: InfoCard = {
  title: "Модульный подход",
  text: "Вы платите только за те модули, которые используете, и подключаете новые по мере роста задач.",
};

export const TRANSPARENT_PRICING_NOTE: InfoCard = {
  title: "Прозрачная стоимость",
  text: "Смета формируется после бесплатного аудита: вы видите состав работ, сроки и стоимость каждого модуля.",
};

// --- Предложение (пакеты) ---------------------------------------------------

/**
 * Название пакета в КП. «Корпоративный» покрывает и Pro, и Enterprise —
 * Enterprise отдельного места в документе не получает: цена там всё равно
 * ручная, а описание уровня то же самое, «для сложных процессов».
 */
export const PDF_TIER_LABEL: Record<ServicePackage, string> = {
  start: "Старт",
  business: "Бизнес",
  pro: "Корпоративный",
  enterprise: "Корпоративный",
};

export const PDF_TIER_INTRO: Record<ServicePackage, string> = {
  start: "Быстрый запуск для малого бизнеса: закрыть поток типовых вопросов и заявок.",
  business: "Оптимально для компаний с постоянным потоком обращений и отделом продаж.",
  pro: "Для компаний со сложными процессами и несколькими внутренними системами.",
  enterprise: "Для компаний со сложными процессами и несколькими внутренними системами.",
};

export const PDF_TIER_LAUNCH: Record<ServicePackage, string> = {
  start: "2–3 недели",
  business: "3–5 недель",
  pro: "от 6 недель",
  enterprise: "от 6 недель",
};

const START_FEATURES = [
  "1 канал связи на выбор: WhatsApp, Telegram или виджет на сайте",
  "База знаний по вашим материалам (услуги, цены, условия)",
  "До 15 типовых сценариев диалога",
  "Сбор заявок и передача на почту или в таблицу",
  "Переключение на живого менеджера",
  "Поддержка и правки — 1 месяц после запуска",
];

const BUSINESS_FEATURES = [
  "До 3 каналов связи одновременно",
  "Интеграция с вашей CRM: создание сделок и карточек клиентов",
  "Квалификация лидов, подбор услуг, запись и напоминания",
  "Расширенная база знаний по документам и регламентам",
  "Панель аналитики: обращения, темы, конверсии",
  "Обучение команды работе с ассистентом",
  "Поддержка и развитие — 3 месяца после запуска",
];

const CORPORATE_FEATURES = [
  "Без ограничений по каналам и количеству сценариев",
  "Интеграции с CRM, ERP, 1С и внутренними сервисами",
  "Голосовой ассистент и подключение телефонии",
  "Ассистент для сотрудников: база знаний, задачи, уведомления",
  "Индивидуальные роли, права доступа и логирование диалогов",
  "Отчётность по метрикам и план развития",
  "Приоритетная поддержка и выделенный менеджер проекта",
];

export const PDF_TIER_FEATURES: Record<ServicePackage, string[]> = {
  start: START_FEATURES,
  business: BUSINESS_FEATURES,
  pro: CORPORATE_FEATURES,
  enterprise: CORPORATE_FEATURES,
};

export const OFFER_INFO: InfoCard[] = [
  { title: "Что влияет на стоимость", text: "Количество сценариев и каналов, глубина интеграций, объём обращений." },
  { title: "Как формируется смета", text: "После бесплатного аудита: фиксированный состав работ, сроки и цена в договоре." },
  { title: "Оплата", text: "Поэтапная: аванс на старте и остаток после запуска решения." },
];

// --- Этапы работы ------------------------------------------------------------

export type WorkStep = { title: string; text: string };

export const WORK_STEPS: WorkStep[] = [
  {
    title: "Знакомство и брифинг",
    text: "Понимаем ваши цели, задачи и ожидаемый результат. Фиксируем текущие процессы, объём обращений и метрики, которые нужно улучшить.",
  },
  {
    title: "Анализ и предложение",
    text: "Анализируем процессы и предлагаем оптимальное решение, план работ, сроки и стоимость. Согласуем состав модулей.",
  },
  {
    title: "Проектирование",
    text: "Создаём архитектуру и сценарии диалогов, определяем интеграции и правила эскалации на живого менеджера. Согласовываем детали.",
  },
  {
    title: "Разработка",
    text: "Создаём AI-ассистента, обучаем его на ваших данных и интегрируем с вашими системами и каналами связи.",
  },
  {
    title: "Тестирование",
    text: "Проводим тесты, обучаем ассистента на ваших данных, прогоняем реальные сценарии и устраняем ошибки до запуска.",
  },
  {
    title: "Запуск",
    text: "Запускаем решение в работу, передаём доступы, обучаем команду и сопровождаем первые недели эксплуатации.",
  },
  {
    title: "Поддержка и развитие",
    text: "Обеспечиваем стабильную работу, следим за метриками и развиваем ассистента: новые сценарии, каналы и функции.",
  },
];

export const DELIVERY_CHECKLIST = [
  "Работающего AI-ассистента в ваших каналах",
  "Интеграции с CRM и внутренними системами",
  "Документацию, доступы и обученную команду",
  "Панель метрик и регулярную отчётность",
];

// --- Контакты ------------------------------------------------------------

export const CONTACTS_HEADING = "Готовы к внедрению AI-ассистента в ваш бизнес?";
export const CONTACTS_INTRO =
  "Свяжитесь с нами — проведём бесплатный аудит ваших процессов, покажем демо ассистента на ваших сценариях и предложим решение с понятными сроками и стоимостью.";

export const NEXT_STEPS = [
  "Короткий созвон 20–30 минут: обсуждаем задачи и текущие процессы.",
  "Бесплатный аудит и демонстрация ассистента на ваших сценариях.",
  "Персональное предложение: состав работ, сроки, стоимость и план запуска.",
];

export const CLOSING_NOTE =
  "RamTech — ваш технологический партнёр в мире искусственного интеллекта. Мы помогаем бизнесу превращать рутину в автоматизированные процессы и расти без роста издержек.";
export const CLOSING_CTA = "Давайте создавать будущее вместе!";

/** Валюта для PDF — «тг.», а не значок ₸: не гарантировано, что этот
 * относительно редкий символ есть в глифах встроенного шрифта. */
export function formatTengePdf(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} тг.`;
}

// --- Сборка данных для документа ------------------------------------------

export type ProposalServiceItem = {
  category: ServiceCategory;
  package: ServicePackage;
};

export type ProposalInput = {
  clientName: string;
  /** Имя ответственного менеджера — «Представлено» на обложке. Может быть неизвестно. */
  managerName?: string | null;
  /** Пакет, чьё описание и список услуг показываются на странице предложения. */
  package: ServicePackage;
  contractMonths: ContractMonths;
  developmentPrice: number | null;
  subscriptionPrice: number | null;
  discountPercent: number;
  paymentScheme: PaymentScheme | null;
  /** Дата выгрузки, YYYY-MM-DD. От неё считается срок действия предложения. */
  issueDateISO: string;
  /** Реальный состав услуг клиента (из client_services). Пусто у клиентов
   * старого формата — тогда строка состава просто не показывается. */
  composition?: ProposalServiceItem[];
  city?: PriceCity | null;
};

export type ProposalViewModel = {
  clientName: string;
  managerName: string | null;
  tierLabel: string;
  tierIntro: string;
  tierFeatures: string[];
  launchTime: string;
  compositionLabel: string | null;
  cityLabel: string | null;
  contractMonths: number;
  totals: Totals;
  load: number;
  paymentSchemeLabel: string | null;
  /** Пояснение к схеме — например, «Один платёж на всю сумму» для полной оплаты. */
  paymentSchemeHint: string | null;
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

  const compositionLabel =
    input.composition && input.composition.length > 0
      ? input.composition
          .map((item) => `${SERVICE_CATEGORY_LABELS[item.category]} (${PDF_TIER_LABEL[item.package]})`)
          .join(" + ")
      : null;

  return {
    clientName: input.clientName,
    managerName: input.managerName ?? null,
    tierLabel: PDF_TIER_LABEL[input.package],
    tierIntro: PDF_TIER_INTRO[input.package],
    tierFeatures: PDF_TIER_FEATURES[input.package],
    launchTime: PDF_TIER_LAUNCH[input.package],
    compositionLabel,
    cityLabel: input.city ? CITY_LABELS[input.city] : null,
    contractMonths: input.contractMonths,
    totals,
    load,
    paymentSchemeLabel: input.paymentScheme ? SCHEME_LABELS[input.paymentScheme] : null,
    paymentSchemeHint: input.paymentScheme ? SCHEME_HINTS[input.paymentScheme] : null,
    paymentPlan,
    issueDate: formatDateRu(input.issueDateISO),
    validUntil: formatDateRu(addDaysISO(input.issueDateISO, PROPOSAL_VALIDITY_DAYS)),
  };
}
