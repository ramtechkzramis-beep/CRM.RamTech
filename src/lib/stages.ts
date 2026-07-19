/** Этапы работы над проектом после заключения договора. Без обращений к базе. */

export type ProjectStage =
  | "signing"
  | "spec"
  | "development"
  | "testing"
  | "approved";

/** Порядок важен: это последовательность прохождения, на ней строится воронка. */
export const STAGES: ProjectStage[] = [
  "signing",
  "spec",
  "development",
  "testing",
  "approved",
];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  signing: "Оформление",
  spec: "Подтверждение ТЗ",
  development: "На разработке",
  testing: "На тестировании",
  approved: "Одобрен",
};

export const STAGE_DESCRIPTIONS: Record<ProjectStage, string> = {
  signing: "Подписываем договор, ожидаем поступления оплаты",
  spec: "Ожидаем ТЗ от клиента или разработчик принял ТЗ проекта",
  development: "Разработчик разрабатывает бота по ТЗ",
  testing: "Бот отдан на тестирование клиенту",
  approved: "Проект сдан клиенту, услуга на размещении",
};

/**
 * Цвета этапов — путь от холодного к фирменному фиолетовому.
 * Одобрен выделен зелёным: это не просто следующий шаг, а результат.
 */
export const STAGE_STYLES: Record<ProjectStage, string> = {
  signing: "bg-slate-100 text-slate-700",
  spec: "bg-sky-100 text-sky-800",
  development: "bg-violet-100 text-violet-800",
  testing: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-800",
};

/** Заливка полос воронки. */
export const STAGE_BARS: Record<ProjectStage, string> = {
  signing: "from-slate-400 to-slate-500",
  spec: "from-sky-400 to-sky-600",
  development: "from-brand to-brand-dark",
  testing: "from-amber-400 to-amber-500",
  approved: "from-emerald-400 to-emerald-600",
};

export const STAGE_DOTS: Record<ProjectStage, string> = {
  signing: "bg-slate-400",
  spec: "bg-sky-500",
  development: "bg-brand",
  testing: "bg-amber-400",
  approved: "bg-emerald-500",
};

export function isStage(value: string | null | undefined): value is ProjectStage {
  return !!value && (STAGES as string[]).includes(value);
}

export function stageIndex(stage: ProjectStage): number {
  return STAGES.indexOf(stage);
}
