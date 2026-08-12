import { Document, Page, View, Text, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { RamTechLogoPdf } from "@/lib/pdf/ramtech-logo-pdf";
import {
  ABOUT_CARDS,
  ABOUT_HEADING,
  ABOUT_INTRO,
  ABOUT_STATS,
  BUSINESS_BENEFITS,
  CHANNELS,
  CLOSING_CTA,
  CLOSING_NOTE,
  COMPANY_INFO,
  CONTACTS_HEADING,
  CONTACTS_INTRO,
  COVER_CLOSING,
  COVER_LEAD,
  COVER_TAGLINE,
  COVER_TAGS,
  COVER_TITLE,
  DELIVERY_CHECKLIST,
  MODULAR_NOTE,
  NEXT_STEPS,
  OFFER_INFO,
  SERVICES_INTRO_TEXT,
  SERVICES_INTRO_TITLE,
  SERVICE_MODULES,
  SOLUTION_AREAS,
  SOLUTION_INTRO,
  TRANSPARENT_PRICING_NOTE,
  WORK_STEPS,
  formatTengePdf,
  type InfoCard,
  type ProposalViewModel,
} from "@/lib/proposal-content";

const BG = "#0a0714";
const BG_CARD = "#140f22";
const BG_CARD_SOFT = "#120c1f";
const BORDER = "#2a2140";
const PURPLE = "#8b5cf6";
const PURPLE_SOFT = "#7c3aed";
const PURPLE_LIGHT = "#c4b5fd";
const TEXT_WHITE = "#f8fafc";
const TEXT_MUTED = "#a89fc0";
const TEXT_FAINT = "#6f6788";
const GREEN = "#34d399";

const PAGE_COUNT = 7;

const styles = StyleSheet.create({
  page: {
    backgroundColor: BG,
    color: TEXT_MUTED,
    fontSize: 8.5,
    paddingTop: 26,
    paddingBottom: 34,
    paddingHorizontal: 34,
  },

  // Шапка секции: номер в фиолетовом квадрате + заголовок + номер страницы.
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionBadge: {
    backgroundColor: PURPLE_SOFT,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  sectionBadgeText: { fontSize: 9, fontWeight: "bold", color: "#ffffff" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: TEXT_WHITE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionPage: { marginLeft: "auto", fontSize: 8, color: TEXT_FAINT },
  sectionDivider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },

  heading: { fontSize: 13, fontWeight: "bold", color: TEXT_WHITE, lineHeight: 1.35, marginBottom: 8 },
  paragraph: { fontSize: 8.7, color: TEXT_MUTED, lineHeight: 1.55 },

  card: {
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
  },
  cardTitle: { fontSize: 9, fontWeight: "bold", color: TEXT_WHITE, marginBottom: 4 },
  cardText: { fontSize: 8, color: TEXT_MUTED, lineHeight: 1.45 },

  pill: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  pillText: { fontSize: 7.5, color: PURPLE_LIGHT },

  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  checkMark: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: PURPLE_SOFT,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { fontSize: 8, color: TEXT_MUTED, flexShrink: 1 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 34,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: TEXT_FAINT },

  // --- Обложка -------------------------------------------------------
  coverRow: { flexDirection: "row", flex: 1 },
  coverLeftCol: { width: "34%", paddingRight: 24, justifyContent: "flex-start" },
  coverRightCol: { flex: 1, paddingLeft: 24, borderLeftWidth: 1, borderLeftColor: BORDER },
  coverBrand: { fontSize: 15, fontWeight: "bold", color: TEXT_WHITE, marginTop: 10, letterSpacing: 1 },
  coverBrandSub: { fontSize: 7.5, color: PURPLE_LIGHT, letterSpacing: 2, marginTop: 1, marginBottom: 22 },
  coverBar: { width: 34, height: 3, backgroundColor: PURPLE_SOFT, borderRadius: 2, marginBottom: 10 },
  coverBigTitle: { fontSize: 21, fontWeight: "bold", color: TEXT_WHITE, lineHeight: 1.2, marginBottom: 8 },
  coverTagline: { fontSize: 10, fontWeight: "bold", color: PURPLE_LIGHT, marginBottom: 8 },
  coverLead: { fontSize: 8.3, color: TEXT_MUTED, lineHeight: 1.55, marginBottom: 12 },
  coverTagsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 18 },
  coverClosing: {
    fontSize: 8,
    color: TEXT_FAINT,
    lineHeight: 1.5,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    marginTop: "auto",
  },

  aboutCardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 14 },
  aboutCard: { width: "48.5%" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCell: { flex: 1, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  statValue: { fontSize: 13, fontWeight: "bold", color: PURPLE_LIGHT, marginBottom: 3 },
  statLabel: { fontSize: 7, color: TEXT_MUTED, lineHeight: 1.35 },

  // --- Решение ---------------------------------------------------------
  areaRow: {
    flexDirection: "row",
    backgroundColor: BG_CARD_SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  areaTitle: { width: 130, fontSize: 8.7, fontWeight: "bold", color: TEXT_WHITE },
  areaText: { flex: 1, fontSize: 8, color: TEXT_MUTED, lineHeight: 1.45 },

  labelCaps: {
    fontSize: 7.3,
    color: TEXT_FAINT,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 6,
  },

  benefitsBox: {
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
  },
  benefitsTitle: { fontSize: 9, fontWeight: "bold", color: TEXT_WHITE, marginBottom: 8 },
  benefitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  benefitCell: { width: "31%", flexDirection: "row", alignItems: "flex-start" },

  // --- Услуги ------------------------------------------------------------
  moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  moduleCard: { width: "32%" },
  moduleTitle: { fontSize: 8.7, fontWeight: "bold", color: TEXT_WHITE, marginBottom: 6 },
  moduleItem: { fontSize: 7.5, color: TEXT_MUTED, lineHeight: 1.5, marginBottom: 3 },
  moduleBullet: { color: PURPLE_LIGHT },

  noteRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  noteCard: { flex: 1 },

  // --- Предложение -------------------------------------------------------
  offerInfoRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  offerInfoCard: { flex: 1 },

  tierCard: {
    backgroundColor: BG_CARD,
    borderWidth: 1.5,
    borderColor: PURPLE_SOFT,
    borderRadius: 8,
    padding: 16,
  },
  tierHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tierBadge: {
    alignSelf: "flex-start",
    backgroundColor: PURPLE_SOFT,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  tierBadgeText: { fontSize: 11, fontWeight: "bold", color: "#ffffff" },
  tierLaunch: { fontSize: 7.5, color: TEXT_FAINT, textAlign: "right" },
  tierIntro: { fontSize: 8.7, color: TEXT_MUTED, lineHeight: 1.5, marginBottom: 4, maxWidth: "70%" },
  tierComposition: { fontSize: 8, color: PURPLE_LIGHT, marginBottom: 10 },

  tierBody: { flexDirection: "row", gap: 20, marginTop: 6 },
  tierFeaturesCol: { flex: 1 },
  tierFeatureRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },

  tierPriceCol: { width: 190, borderLeftWidth: 1, borderLeftColor: BORDER, paddingLeft: 16 },
  priceRow: { marginBottom: 10 },
  priceLabel: { fontSize: 7.3, color: TEXT_FAINT, textTransform: "uppercase", marginBottom: 2 },
  priceValue: { fontSize: 13, fontWeight: "bold", color: TEXT_WHITE },
  priceValueAccent: { fontSize: 13, fontWeight: "bold", color: PURPLE_LIGHT },

  // --- Стоимость ---------------------------------------------------------
  pricingBox: {
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 16,
  },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  pricingLabel: { fontSize: 8.7, color: TEXT_MUTED },
  pricingValue: { fontSize: 9, fontWeight: "bold", color: TEXT_WHITE },
  discountText: { color: GREEN },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  totalLabel: { fontSize: 10, fontWeight: "bold", color: TEXT_WHITE },
  totalValue: { fontSize: 13, fontWeight: "bold", color: PURPLE_LIGHT },

  loadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BG_CARD_SOFT,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  loadLabel: { fontSize: 8.5, color: PURPLE_LIGHT },
  loadValue: { fontSize: 10.5, fontWeight: "bold", color: PURPLE_LIGHT },

  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 7,
  },
  planSeq: { fontSize: 8.5, flex: 1, color: TEXT_MUTED },
  planPercent: { fontSize: 8.5, color: TEXT_FAINT, width: 50, textAlign: "right" },
  planAmount: { fontSize: 8.5, fontWeight: "bold", width: 110, textAlign: "right", color: TEXT_WHITE },

  singlePaymentBox: {
    marginTop: 20,
    backgroundColor: BG_CARD_SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 12,
  },

  // --- Этапы работы --------------------------------------------------------
  stepsRow: { flexDirection: "row", gap: 26 },
  stepsCol: { flex: 1 },
  stepRow: { flexDirection: "row", marginBottom: 14 },
  stepRail: { width: 22, alignItems: "center" },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PURPLE_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotText: { fontSize: 7.5, fontWeight: "bold", color: "#ffffff" },
  stepLine: { width: 1, flexGrow: 1, backgroundColor: BORDER, marginTop: 3 },
  stepContent: { flex: 1, paddingLeft: 10 },
  stepTitle: { fontSize: 8.7, fontWeight: "bold", color: TEXT_WHITE, marginBottom: 3 },
  stepText: { fontSize: 7.7, color: TEXT_MUTED, lineHeight: 1.45 },

  deliveryBox: {
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 12,
    marginTop: 4,
  },
  deliveryTitle: { fontSize: 9, fontWeight: "bold", color: TEXT_WHITE, marginBottom: 8 },

  // --- Контакты ------------------------------------------------------------
  contactsRow: { flexDirection: "row", gap: 30 },
  contactsLeft: { flex: 1.1 },
  contactsRight: { flex: 0.9, paddingLeft: 30, borderLeftWidth: 1, borderLeftColor: BORDER },
  contactHeading: { fontSize: 16, fontWeight: "bold", color: TEXT_WHITE, lineHeight: 1.3, marginBottom: 10 },
  stepsList: { backgroundColor: BG_CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 12, marginTop: 14 },
  nextStepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  nextStepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PURPLE_SOFT,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nextStepDotText: { fontSize: 7, fontWeight: "bold", color: "#ffffff" },
  nextStepText: { fontSize: 8, color: TEXT_MUTED, flex: 1, lineHeight: 1.4 },

  contactRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  contactIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 8,
  },
  contactValue: { fontSize: 9.5, fontWeight: "bold", color: TEXT_WHITE },

  closingBox: {
    backgroundColor: BG_CARD_SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 14,
    marginTop: 10,
  },
  closingText: { fontSize: 8, color: TEXT_MUTED, lineHeight: 1.5, marginBottom: 8 },
  closingCta: { fontSize: 9.5, fontWeight: "bold", color: PURPLE_LIGHT },
});

function SectionHeader({ number, title, page }: { number: string; title: string; page: number }) {
  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{number}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionPage}>
          СТР. {page} / {PAGE_COUNT}
        </Text>
      </View>
      <View style={styles.sectionDivider} />
    </>
  );
}

function InfoCardBox({ card }: { card: InfoCard }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{card.title}</Text>
      <Text style={styles.cardText}>{card.text}</Text>
    </View>
  );
}

/** Галочка — векторный путь, а не символ «✓»: в шрифте PT Sans его нет,
 * и в PDF на его месте оставался пустой квадрат. */
function CheckMark() {
  return (
    <View style={styles.checkMark}>
      <Svg viewBox="0 0 12 12" width={7} height={7}>
        <Path
          d="M2 6.2L4.8 9L10 3"
          stroke="#ffffff"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function Check({ text }: { text: string }) {
  return (
    <View style={styles.checkRow}>
      <CheckMark />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {COMPANY_INFO.name} · {COMPANY_INFO.tagline}
      </Text>
      <Text style={styles.footerText}>
        {COMPANY_INFO.phone} · {COMPANY_INFO.email} · {COMPANY_INFO.contact}
      </Text>
    </View>
  );
}

function ProposalPage({ fontFamily, children }: { fontFamily: string; children: ReactNode }) {
  return (
    <Page size="A4" orientation="landscape" style={[styles.page, { fontFamily }]}>
      {children}
      <Footer />
    </Page>
  );
}

export function ProposalDocument({
  model,
  fontFamily,
}: {
  model: ProposalViewModel;
  fontFamily: string;
}) {
  const discount = model.totals.base > 0 ? model.totals.discountAmount : 0;
  const discountPercent =
    model.totals.base > 0 ? Math.round((discount / model.totals.base) * 100) : 0;

  const workStepsLeft = WORK_STEPS.slice(0, 4);
  const workStepsRight = WORK_STEPS.slice(4);

  return (
    <Document title={`КП ${COMPANY_INFO.name} — ${model.clientName}`}>
      {/* Стр 1 — обложка и «О нас» */}
      <ProposalPage fontFamily={fontFamily}>
        <View style={styles.coverRow}>
          <View style={styles.coverLeftCol}>
            <RamTechLogoPdf size={44} color={PURPLE_LIGHT} />
            <Text style={styles.coverBrand}>RAMTECH</Text>
            <Text style={styles.coverBrandSub}>AI SOLUTIONS</Text>

            <View style={styles.coverBar} />
            <Text style={styles.coverBigTitle}>{COVER_TITLE.toUpperCase()}</Text>
            <Text style={styles.coverTagline}>{COVER_TAGLINE}</Text>
            <Text style={styles.coverLead}>{COVER_LEAD}</Text>

            <View style={styles.coverTagsRow}>
              {COVER_TAGS.map((tag) => (
                <View key={tag} style={styles.pill}>
                  <Text style={styles.pillText}>{tag}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.coverClosing}>{COVER_CLOSING}</Text>
          </View>

          <View style={styles.coverRightCol}>
            <SectionHeader number="01" title="О нас" page={1} />
            <Text style={styles.heading}>{ABOUT_HEADING}</Text>
            <Text style={styles.paragraph}>{ABOUT_INTRO}</Text>

            <View style={styles.aboutCardsGrid}>
              {ABOUT_CARDS.map((card) => (
                <View key={card.title} style={styles.aboutCard}>
                  <InfoCardBox card={card} />
                </View>
              ))}
            </View>

            <View style={styles.statsRow}>
              {ABOUT_STATS.map((stat) => (
                <View key={stat.value} style={styles.statCell}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ProposalPage>

      {/* Стр 2 — решение */}
      <ProposalPage fontFamily={fontFamily}>
        <SectionHeader number="02" title="Решение: AI-ассистенты" page={2} />
        <Text style={styles.paragraph}>{SOLUTION_INTRO}</Text>

        <View style={{ marginTop: 12 }}>
          {SOLUTION_AREAS.map((area) => (
            <View key={area.title} style={styles.areaRow}>
              <Text style={styles.areaTitle}>{area.title}</Text>
              <Text style={styles.areaText}>{area.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.labelCaps}>Каналы взаимодействия</Text>
        <View style={styles.coverTagsRow}>
          {CHANNELS.map((channel) => (
            <View key={channel} style={styles.pill}>
              <Text style={styles.pillText}>{channel}</Text>
            </View>
          ))}
        </View>

        <View style={styles.benefitsBox}>
          <Text style={styles.benefitsTitle}>Преимущества для вашего бизнеса</Text>
          <View style={styles.benefitsGrid}>
            {BUSINESS_BENEFITS.map((item) => (
              <View key={item} style={styles.benefitCell}>
                <Check text={item} />
              </View>
            ))}
          </View>
        </View>
      </ProposalPage>

      {/* Стр 3 — услуги */}
      <ProposalPage fontFamily={fontFamily}>
        <SectionHeader number="03" title="Услуги" page={3} />
        <Text style={styles.heading}>{SERVICES_INTRO_TITLE}</Text>
        <Text style={styles.paragraph}>{SERVICES_INTRO_TEXT}</Text>

        <View style={styles.moduleGrid}>
          {SERVICE_MODULES.map((module) => (
            <View key={module.title} style={styles.moduleCard}>
              <View style={styles.card}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                {module.items.map((item) => (
                  <Text key={item} style={styles.moduleItem}>
                    <Text style={styles.moduleBullet}>• </Text>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noteRow}>
          <View style={styles.noteCard}>
            <InfoCardBox card={MODULAR_NOTE} />
          </View>
          <View style={styles.noteCard}>
            <InfoCardBox card={TRANSPARENT_PRICING_NOTE} />
          </View>
        </View>
      </ProposalPage>

      {/* Стр 4 — предложение (персонализировано под клиента) */}
      <ProposalPage fontFamily={fontFamily}>
        <SectionHeader number="04" title="Наше предложение" page={4} />
        <Text style={styles.heading}>
          Пакет {model.tierLabel} — то, что мы предлагаем именно вам.
        </Text>

        <View style={styles.offerInfoRow}>
          {OFFER_INFO.map((info) => (
            <View key={info.title} style={styles.offerInfoCard}>
              <InfoCardBox card={info} />
            </View>
          ))}
        </View>

        <View style={styles.tierCard}>
          <View style={styles.tierHeadRow}>
            <View>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>{model.tierLabel}</Text>
              </View>
              <Text style={styles.tierIntro}>{model.tierIntro}</Text>
              {model.compositionLabel && (
                <Text style={styles.tierComposition}>
                  Состав: {model.compositionLabel}
                  {model.cityLabel ? ` · ${model.cityLabel}` : ""}
                </Text>
              )}
            </View>
            <Text style={styles.tierLaunch}>
              СРОК ЗАПУСКА{"\n"}
              {model.launchTime}
            </Text>
          </View>

          <View style={styles.tierBody}>
            <View style={styles.tierFeaturesCol}>
              {model.tierFeatures.map((feature) => (
                <View key={feature} style={styles.tierFeatureRow}>
                  <Check text={feature} />
                </View>
              ))}
            </View>

            <View style={styles.tierPriceCol}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Внедрение</Text>
                <Text style={styles.priceValue}>
                  {formatTengePdf(model.totals.developmentAfterDiscount)}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Сопровождение / {model.contractMonths} мес.</Text>
                <Text style={styles.priceValueAccent}>
                  {formatTengePdf(model.totals.subscriptionAfterDiscount)}
                </Text>
              </View>
              {discount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.discountText]}>
                    Скидка {discountPercent}%
                  </Text>
                  <Text style={[styles.priceValue, styles.discountText]}>
                    −{formatTengePdf(discount)}
                  </Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Груз в месяц</Text>
                <Text style={styles.priceValueAccent}>{formatTengePdf(model.load)}/мес</Text>
              </View>
            </View>
          </View>
        </View>
      </ProposalPage>

      {/* Стр 5 — стоимость и график оплаты */}
      <ProposalPage fontFamily={fontFamily}>
        <SectionHeader number="05" title="Стоимость" page={5} />

        <View style={styles.pricingBox}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Внедрение</Text>
            <Text style={styles.pricingValue}>
              {formatTengePdf(model.totals.developmentAfterDiscount)}
            </Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Сопровождение за {model.contractMonths} мес.</Text>
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

        {/* Один платёж (целиком или Kaspi) — отдельной понятной строкой,
            а не таблицей на одну строку с «100%», которая читается как
            обрезанный график. Несколько траншей — как и раньше, таблицей. */}
        {model.paymentPlan.length === 1 && (
          <View style={styles.singlePaymentBox}>
            <Text style={styles.labelCaps}>Схема оплаты: {model.paymentSchemeLabel}</Text>
            <Text style={styles.paragraph}>
              {model.paymentSchemeHint} — {formatTengePdf(model.paymentPlan[0].amount)}
            </Text>
          </View>
        )}

        {model.paymentPlan.length > 1 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.labelCaps}>График оплаты: {model.paymentSchemeLabel}</Text>
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

      {/* Стр 6 — этапы работы */}
      <ProposalPage fontFamily={fontFamily}>
        <SectionHeader number="06" title="Этапы работы" page={6} />

        <View style={styles.stepsRow}>
          <View style={styles.stepsCol}>
            {workStepsLeft.map((step, index) => (
              <View key={step.title} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View style={styles.stepDot}>
                    <Text style={styles.stepDotText}>{index + 1}</Text>
                  </View>
                  {index < workStepsLeft.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.stepsCol}>
            {workStepsRight.map((step, index) => (
              <View key={step.title} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View style={styles.stepDot}>
                    <Text style={styles.stepDotText}>{workStepsLeft.length + index + 1}</Text>
                  </View>
                  {index < workStepsRight.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              </View>
            ))}

            <View style={styles.deliveryBox}>
              <Text style={styles.deliveryTitle}>Что вы получаете на выходе</Text>
              {DELIVERY_CHECKLIST.map((item) => (
                <Check key={item} text={item} />
              ))}
            </View>
          </View>
        </View>
      </ProposalPage>

      {/* Стр 7 — контакты */}
      <ProposalPage fontFamily={fontFamily}>
        <SectionHeader number="07" title="Контакты" page={7} />

        <View style={styles.contactsRow}>
          <View style={styles.contactsLeft}>
            <Text style={styles.contactHeading}>{CONTACTS_HEADING}</Text>
            <Text style={styles.paragraph}>{CONTACTS_INTRO}</Text>

            <View style={styles.stepsList}>
              {NEXT_STEPS.map((step, index) => (
                <View key={step} style={styles.nextStepRow}>
                  <View style={styles.nextStepDot}>
                    <Text style={styles.nextStepDotText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.nextStepText}>{step}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.labelCaps, { marginTop: 14 }]}>
              Предложение действительно до {model.validUntil}
              {model.managerName ? ` · Представлено: ${model.managerName}` : ""}
            </Text>
          </View>

          <View style={styles.contactsRight}>
            <View style={styles.contactRow}>
              <View style={styles.contactIcon} />
              <Text style={styles.contactValue}>{COMPANY_INFO.email}</Text>
            </View>
            <View style={styles.contactRow}>
              <View style={styles.contactIcon} />
              <Text style={styles.contactValue}>{COMPANY_INFO.phone}</Text>
            </View>
            <View style={styles.contactRow}>
              <View style={styles.contactIcon} />
              <Text style={styles.contactValue}>{COMPANY_INFO.contact}</Text>
            </View>

            <View style={styles.closingBox}>
              <Text style={styles.closingText}>{CLOSING_NOTE}</Text>
              <Text style={styles.closingCta}>{CLOSING_CTA}</Text>
            </View>
          </View>
        </View>
      </ProposalPage>
    </Document>
  );
}
