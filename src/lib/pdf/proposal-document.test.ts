import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { registerProposalFonts } from "./fonts";
import { ProposalDocument } from "./proposal-document";
import { buildProposalViewModel } from "@/lib/proposal-content";

/**
 * Прогоняет весь конвейер целиком: регистрация шрифта, чтение файла с диска,
 * вёрстка через @react-pdf/renderer — а не только то, что типы сходятся.
 * Если шрифт не найдётся или разметка сломается, здесь это будет видно.
 */
describe("ProposalDocument", () => {
  it("рендерится в настоящий PDF-файл", async () => {
    const fontFamily = registerProposalFonts();

    const model = buildProposalViewModel({
      clientName: "ТОО Ромашка",
      package: "business",
      contractMonths: 6,
      developmentPrice: 265_000,
      subscriptionPrice: 737_500,
      discountPercent: 10,
      paymentScheme: "split_30_30_40",
      issueDateISO: "2026-07-18",
    });

    const buffer = await renderToBuffer(
      ProposalDocument({ model, servicePackage: "business", fontFamily }),
    );

    // Сигнатура PDF-файла — если рендер сломался, тут будет мусор, а не "%PDF".
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // Документ с шрифтом и логотипом весит заметно больше пустого файла —
    // маленький размер значит, что шрифт не встроился или страница пустая.
    expect(buffer.length).toBeGreaterThan(50_000);
  });

  it("рендерится и без схемы оплаты (график платежей не задан)", async () => {
    const fontFamily = registerProposalFonts();

    const model = buildProposalViewModel({
      clientName: "Клиент без графика",
      package: "start",
      contractMonths: 3,
      developmentPrice: 159_000,
      subscriptionPrice: 255_990,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
    });

    const buffer = await renderToBuffer(
      ProposalDocument({ model, servicePackage: "start", fontFamily }),
    );

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  /**
   * На тёплом serverless-инстансе несколько запросов на скачивание КП подряд
   * попадают в один и тот же процесс Node.js. Раньше registerProposalFonts()
   * регистрировала шрифт один раз под общим именем "PTSans" и переиспользовала
   * его между документами — из-за этого у второго и последующих PDF в одном
   * процессе съезжала ToUnicode-карта: текст выглядел верно на глаз, но не
   * копировался и не искался (сам PDF при этом не ломался и рендерился без
   * ошибок — поймать это можно только сверкой видимого текста с содержимым
   * страницы). Уникальное имя шрифта на каждый вызов — защита от регресса.
   */
  it("два рендера подряд в одном процессе получают разные семейства шрифта", async () => {
    const first = registerProposalFonts();
    const second = registerProposalFonts();

    expect(first).not.toBe(second);

    const model = buildProposalViewModel({
      clientName: "ТОО Энтерпрайз Групп",
      package: "enterprise",
      contractMonths: 12,
      developmentPrice: 500_000,
      subscriptionPrice: 3_190_990,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
    });

    const buffer = await renderToBuffer(
      ProposalDocument({ model, servicePackage: "enterprise", fontFamily: second }),
    );

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
