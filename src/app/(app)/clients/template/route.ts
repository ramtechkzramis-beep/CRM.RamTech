import ExcelJS from "exceljs";
import { requireProfile } from "@/lib/auth";
import { TEMPLATE_HEADERS } from "@/lib/import-clients";

/** Шаблон для массовой загрузки холодных клиентов. */
export async function GET() {
  await requireProfile();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Клиенты");

  sheet.columns = TEMPLATE_HEADERS.map((header) => ({
    header,
    width: header === "Заметки" ? 35 : 20,
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  // Пример показывает главное: две строки с одной фирмой — это два контакта
  // одной фирмы, а не два клиента.
  sheet.addRow([
    "ТОО Пример",
    "Алматы",
    "Айгуль Сериковна",
    "Принимает решение",
    "директор",
    "+7 701 000 0000",
    "info@primer.kz",
    "Средний",
    "входящая заявка",
    "Интересует бот для отдела продаж",
  ]);
  sheet.addRow([
    "ТОО Пример",
    "Алматы",
    "Данияр",
    "Влияет на решение",
    "маркетолог",
    "+7 701 000 0001",
    "",
    "",
    "",
    "",
  ]);

  sheet.getCell("D2").note = "Принимает решение, Влияет на решение или Сотрудник";
  sheet.getCell("H2").note = "Малый, Средний или Крупный";

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="shablon-klientov.xlsx"',
    },
  });
}
