import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { RamTechLogoPdf } from "@/lib/pdf/ramtech-logo-pdf";
import {
  COMPANY_INFO,
  COMPANY_INTRO,
  WHY_CHATBOT_INTRO,
  CHATBOT_ADVANTAGES,
  formatTengePdf,
  type ProposalViewModel,
} from "@/lib/proposal-content";
import { STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS } from "@/lib/stages";
import type { ServicePackage } from "@/lib/packages";

/** Цвета бейджа пакета в PDF — те же смыслы, что и PACKAGE_STYLES в интерфейсе. */
const PACKAGE_COLORS: Record<ServicePackage, { bg: string; text: string }> = {
  start: { bg: "#f1f5f9", text: "#334155" },
  business: { bg: "#ede9fe", text: "#5b21b6" },
  pro: { bg: "#e0f2fe", text: "#075985" },
  enterprise: { bg: "#fef3c7", text: "#78350f" },
};

const BRAND_PURPLE = "#7c3aed";
const BRAND_DARK = "#0b0910";

const styles = StyleSheet.create({
  // fontFamily сюда не кладём: имя шрифта уникально на каждый рендер
  // (см. registerProposalFonts) и подмешивается инлайном в <Page>.
  page: {
    fontSize: 10,
    color: "#0f172a",
    paddingBottom: 56,
  },
  header: {
    backgroundColor: BRAND_DARK,
    paddingHorizontal: 40,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBrand: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  headerTitle: { fontSize: 12, color: "#c4b5fd" },

  // Тонкая линия из точек под шапкой — отсылка к дорожкам платы на логотипе.
  circuitLine: { flexDirection: "row", paddingHorizontal: 40, marginTop: -1 },
  circuitDot: { width: 3, height: 3, borderRadius: 1.5, marginRight: 6 },

  body: { paddingHorizontal: 40, paddingTop: 24, flexGrow: 1 },

  pageTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16, color: "#0f172a" },
  subTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 10,
    textTransform: "uppercase",
    color: "#475569",
  },
  paragraph: { fontSize: 10.5, color: "#334155", lineHeight: 1.6, marginBottom: 14 },

  // Обложка
  coverTitle: { fontSize: 28, fontWeight: "bold", color: "#ffffff", marginBottom: 8 },
  coverTagline: { fontSize: 12.5, color: "#c4b5fd" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 24, gap: 20 },
  metaCell: { width: "45%" },
  metaLabel: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 },
  metaValue: { fontSize: 12, fontWeight: "bold" },
  summaryBox: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: { fontSize: 9, color: "#64748b", marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: "bold", color: BRAND_PURPLE },

  // Бейдж пакета
  badge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeText: { fontSize: 13, fontWeight: "bold" },
  tagline: { fontSize: 13, fontWeight: "bold", marginBottom: 3 },
  audience: { fontSize: 10, color: "#64748b", marginBottom: 12 },

  // Категории состава пакета
  featureGroupsRow: { flexDirection: "row", gap: 18, marginTop: 8 },
  featureGroupCol: { flex: 1 },
  featureGroupTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: BRAND_PURPLE,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  featureGroupItem: { fontSize: 9.5, color: "#334155", lineHeight: 1.4, marginBottom: 6 },

  pricingBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 16,
  },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  pricingLabel: { fontSize: 10, color: "#64748b" },
  pricingValue: { fontSize: 10.5, fontWeight: "bold" },
  discountText: { color: "#059669" },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 8 },
  totalLabel: { fontSize: 11, fontWeight: "bold" },
  totalValue: { fontSize: 13, fontWeight: "bold" },

  loadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f5f3ff",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  loadLabel: { fontSize: 10, color: "#5b21b6" },
  loadValue: { fontSize: 12, fontWeight: "bold", color: "#5b21b6" },

  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 7,
  },
  planSeq: { fontSize: 10, flex: 1 },
  planPercent: { fontSize: 10, color: "#94a3b8", width: 50, textAlign: "right" },
  planAmount: { fontSize: 10, fontWeight: "bold", width: 110, textAlign: "right" },

  // Этапы работы
  timelineRow: { flexDirection: "row" },
  timelineRail: { width: 20, alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_PURPLE },
  timelineLine: { width: 1, flexGrow: 1, backgroundColor: "#e2e8f0", marginTop: 2 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  timelineLabel: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 3,
    textTransform: "uppercase",
    color: "#0f172a",
  },
  timelineDesc: { fontSize: 10, color: "#64748b", lineHeight: 1.4 },

  ctaBox: { marginTop: 4, backgroundColor: BRAND_DARK, borderRadius: 6, padding: 18 },
  ctaTitle: { fontSize: 14, fontWeight: "bold", color: "#ffffff", marginBottom: 6 },
  ctaText: { fontSize: 10.5, color: "#c4b5fd", lineHeight: 1.6 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 40,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: { fontSize: 10, fontWeight: "bold", color: "#334155" },
  footerContact: { fontSize: 9, color: "#94a3b8" },
});

/** Дорожка из точек под шапкой — декоративная отсылка к печатной плате логотипа. */
function CircuitLine() {
  const dots = Array.from({ length: 60 });
  return (
    <View style={styles.circuitLine}>
      {dots.map((_, i) => (
        <View
          key={i}
          style={[
            styles.circuitDot,
            { backgroundColor: i % 5 === 0 ? BRAND_PURPLE : "#e2e8f0" },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Общая «рамка» страницы: шапка с логотипом, точечная линия, тело и подвал.
 * Подвал зафиксирован (`fixed`) — иначе react-pdf может перенести его
 * на отдельную почти пустую страницу, если контент не влезает впритык.
 */
function ProposalPage({
  pageLabel,
  fontFamily,
  children,
}: {
  pageLabel: string;
  fontFamily: string;
  children: ReactNode;
}) {
  return (
    <Page size="A4" style={[styles.page, { fontFamily }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RamTechLogoPdf size={26} />
          <Text style={styles.headerBrand}>{COMPANY_INFO.name}</Text>
        </View>
        <Text style={styles.headerTitle}>{pageLabel}</Text>
      </View>

      <CircuitLine />

      <View style={styles.body}>{children}</View>

      <View style={styles.footer} fixed>
        <Text style={styles.footerBrand}>
          {COMPANY_INFO.name} — {COMPANY_INFO.tagline}
        </Text>
        <Text style={styles.footerContact}>
          {COMPANY_INFO.phone} · {COMPANY_INFO.email} · {COMPANY_INFO.contact}
        </Text>
      </View>
    </Page>
  );
}

export function ProposalDocument({
  model,
  servicePackage,
  fontFamily,
}: {
  model: ProposalViewModel;
  servicePackage: ServicePackage;
  /** Уникальное на каждый рендер имя семейства шрифта — см. registerProposalFonts(). */
  fontFamily: string;
}) {
  const colors = PACKAGE_COLORS[servicePackage];
  const discount = model.totals.base > 0 ? model.totals.discountAmount : 0;
  const discountPercent =
    model.totals.base > 0 ? Math.round((discount / model.totals.base) * 100) : 0;

  return (
    <Document title={`КП ${COMPANY_INFO.name} — ${model.clientName}`}>
      {/* Обложка */}
      <Page size="A4" style={[styles.page, { fontFamily }]}>
        <View style={[styles.header, { paddingBottom: 40 }]}>
          <View>
            <View style={styles.headerLeft}>
              <RamTechLogoPdf size={30} />
              <Text style={styles.headerBrand}>{COMPANY_INFO.name}</Text>
            </View>
            <Text style={[styles.coverTitle, { marginTop: 24 }]}>Коммерческое предложение</Text>
            <Text style={styles.coverTagline}>{model.tagline}</Text>
          </View>
        </View>

        <CircuitLine />

        <View style={styles.body}>
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Клиент</Text>
              <Text style={styles.metaValue}>{model.clientName}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Пакет</Text>
              <Text style={styles.metaValue}>{model.packageLabel}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Дата</Text>
              <Text style={styles.metaValue}>{model.issueDate}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Действительно до</Text>
              <Text style={styles.metaValue}>{model.validUntil}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Представлено</Text>
              <Text style={styles.metaValue}>{model.managerName ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.summaryBox}>
            <View>
              <Text style={styles.summaryLabel}>Итого к оплате</Text>
              <Text style={styles.summaryValue}>{formatTengePdf(model.totals.total)}</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Груз в месяц</Text>
              <Text style={styles.summaryValue}>{formatTengePdf(model.load)}/мес</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>
            {COMPANY_INFO.name} — {COMPANY_INFO.tagline}
          </Text>
          <Text style={styles.footerContact}>
            {COMPANY_INFO.phone} · {COMPANY_INFO.email} · {COMPANY_INFO.contact}
          </Text>
        </View>
      </Page>

      {/* О компании и зачем чат-бот — на одной странице, чтобы не плодить
          почти пустые листы под каждый отдельный абзац. */}
      <ProposalPage pageLabel="О компании" fontFamily={fontFamily}>
        <Text style={styles.pageTitle}>Чат-боты для бизнеса</Text>
        <Text style={styles.paragraph}>{COMPANY_INTRO}</Text>

        <Text style={styles.subTitle}>Зачем чат-бот?</Text>
        <Text style={styles.paragraph}>{WHY_CHATBOT_INTRO}</Text>

        <Text style={styles.subTitle}>Преимущества чат-ботов</Text>
        <Text style={styles.paragraph}>{CHATBOT_ADVANTAGES}</Text>
      </ProposalPage>

      {/* Пакет */}
      <ProposalPage pageLabel={`Пакет ${model.packageLabel}`} fontFamily={fontFamily}>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{model.packageLabel}</Text>
        </View>
        <Text style={styles.tagline}>{model.tagline}</Text>
        <Text style={styles.audience}>Подходит: {model.audience}</Text>
        <Text style={styles.paragraph}>{model.description}</Text>

        <Text style={styles.subTitle}>Что входит в пакет</Text>
        <View style={styles.featureGroupsRow}>
          {model.featureGroups.map((group) => (
            <View key={group.category} style={styles.featureGroupCol}>
              <Text style={styles.featureGroupTitle}>{group.category}</Text>
              {group.items.map((item, index) => (
                <Text key={index} style={styles.featureGroupItem}>
                  {item}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ProposalPage>

      {/* Стоимость */}
      <ProposalPage pageLabel="Стоимость" fontFamily={fontFamily}>
        <Text style={styles.pageTitle}>Стоимость</Text>

        <View style={styles.pricingBox}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Разработка</Text>
            <Text style={styles.pricingValue}>
              {formatTengePdf(model.totals.developmentAfterDiscount)}
            </Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Абонемент за {model.contractMonths} мес.</Text>
            <Text style={styles.pricingValue}>
              {formatTengePdf(model.totals.subscriptionAfterDiscount)}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.pricingRow}>
              <Text style={[styles.pricingLabel, styles.discountText]}>
                Скидка {discountPercent}%
              </Text>
              <Text style={[styles.pricingValue, styles.discountText]}>
                −{formatTengePdf(discount)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.pricingRow}>
            <Text style={styles.totalLabel}>Итого к оплате</Text>
            <Text style={styles.totalValue}>{formatTengePdf(model.totals.total)}</Text>
          </View>

          <View style={styles.loadRow}>
            <Text style={styles.loadLabel}>Груз в месяц (стоимость размещения)</Text>
            <Text style={styles.loadValue}>{formatTengePdf(model.load)}/мес</Text>
          </View>
        </View>

        {/* График оплаты — на той же странице, что и стоимость, если схема выбрана. */}
        {model.paymentPlan.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.subTitle}>График оплаты: {model.paymentSchemeLabel}</Text>
            {model.paymentPlan.map((item) => (
              <View key={item.seq} style={styles.planRow}>
                <Text style={styles.planSeq}>{item.seq}-й платёж</Text>
                <Text style={styles.planPercent}>{item.percent}%</Text>
                <Text style={styles.planAmount}>{formatTengePdf(item.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </ProposalPage>

      {/* Этапы работы */}
      <ProposalPage pageLabel="Этапы работы" fontFamily={fontFamily}>
        <Text style={styles.pageTitle}>Этапы работы</Text>
        {STAGES.map((stage, index) => (
          <View key={stage} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot} />
              {index < STAGES.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>{STAGE_LABELS[stage]}</Text>
              <Text style={styles.timelineDesc}>{STAGE_DESCRIPTIONS[stage]}</Text>
            </View>
          </View>
        ))}
      </ProposalPage>

      {/* Контакты */}
      <ProposalPage pageLabel="Контакты" fontFamily={fontFamily}>
        <Text style={styles.pageTitle}>Готовы обсудить детали?</Text>
        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Свяжитесь с нами</Text>
          <Text style={styles.ctaText}>
            Ответим на вопросы, зафиксируем условия и запустим проект в ближайшие сроки.
            Предложение действительно до {model.validUntil}.
          </Text>
        </View>
      </ProposalPage>
    </Document>
  );
}
