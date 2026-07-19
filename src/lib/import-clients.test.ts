import { describe, expect, it } from "vitest";
import {
  looksLikeEmail,
  mapHeaders,
  parseBusinessSize,
  parseClientRows,
  parseRole,
} from "./import-clients";

// Заголовки реального файла RamTech.
const REAL_HEADERS = ["Город куратора", "Фирмы", "Роль", "Имя", "Должность", "Данные"];

describe("mapHeaders", () => {
  it("узнаёт колонки реального файла, а не только шаблона", () => {
    expect(mapHeaders(REAL_HEADERS)).toEqual({
      city: 0,
      name: 1,
      role: 2,
      contact_name: 3,
      position: 4,
      contact_data: 5,
    });
  });

  it("узнаёт колонки нашего шаблона", () => {
    const map = mapHeaders(["Компания", "Город", "Имя", "Телефон", "Почта"]);
    expect(map.name).toBe(0);
    expect(map.city).toBe(1);
    expect(map.contact_name).toBe(2);
    expect(map.phone).toBe(3);
    expect(map.email).toBe(4);
  });

  it("не зависит от регистра и лишних слов", () => {
    expect(mapHeaders(["ГОРОД КУРАТОРА", "  фирмы  "])).toEqual({ city: 0, name: 1 });
  });
});

describe("parseRole", () => {
  it("распознаёт роли из файла", () => {
    expect(parseRole("Принимает решение")).toBe("decision_maker");
    expect(parseRole("Влияет на решение")).toBe("influencer");
    expect(parseRole("Сотрудник")).toBe("employee");
  });

  it("на пустое и непонятное возвращает null", () => {
    expect(parseRole("")).toBeNull();
    expect(parseRole("непонятно")).toBeNull();
  });
});

describe("looksLikeEmail", () => {
  it("отличает почту от телефона", () => {
    expect(looksLikeEmail("albina84zippy84@yandex.ru")).toBe(true);
    expect(looksLikeEmail("+77005055004")).toBe(false);
  });
});

describe("parseBusinessSize", () => {
  it("понимает варианты и синонимы", () => {
    expect(parseBusinessSize("Малый")).toBe("small");
    expect(parseBusinessSize("средний")).toBe("medium");
    expect(parseBusinessSize("КРУПНЫЙ")).toBe("large");
    expect(parseBusinessSize("мелкий")).toBe("small");
  });

  it("на непонятное возвращает null", () => {
    expect(parseBusinessSize("огромный")).toBeNull();
    expect(parseBusinessSize(null)).toBeNull();
  });
});

describe("parseClientRows — реальные данные RamTech", () => {
  it("собирает несколько контактов одной фирмы в одного клиента", () => {
    const { clients, errors } = parseClientRows(REAL_HEADERS, [
      ["Алматы", "OHKZ Clinic", "Сотрудник", "Эльмира", "", "+77017103630"],
      ["Алматы", "OHKZ Clinic", "Сотрудник", "Кундыз", "Бухгалтер", "+77752795995"],
      ["Алматы", "OHKZ Clinic", "Влияет на решение", "Ольга", "Директор по маркетингу", "+77017898689"],
    ]);

    expect(errors).toEqual([]);
    // Главное: одна фирма, а не три «дубля».
    expect(clients).toHaveLength(1);
    expect(clients[0].name).toBe("OHKZ Clinic");
    expect(clients[0].city).toBe("Алматы");
    expect(clients[0].contacts).toHaveLength(3);
    expect(clients[0].contacts[2]).toEqual({
      full_name: "Ольга",
      role: "influencer",
      position: "Директор по маркетингу",
      phone: "+77017898689",
      email: null,
    });
  });

  it("раскладывает колонку «Данные» на телефон и почту по содержимому", () => {
    const { clients } = parseClientRows(REAL_HEADERS, [
      ["Алматы", "BiHappy", "Принимает решение", "Альбина", "директор", "+77077143858"],
      ["Алматы", "BiHappy", "Принимает решение", "Альбина", "директор", "albina84zippy84@yandex.ru"],
    ]);

    expect(clients[0].contacts[0].phone).toBe("+77077143858");
    expect(clients[0].contacts[0].email).toBeNull();
    expect(clients[0].contacts[1].email).toBe("albina84zippy84@yandex.ru");
    expect(clients[0].contacts[1].phone).toBeNull();
  });

  it("берёт фирму без контактов, если в строке только название", () => {
    const { clients, errors } = parseClientRows(REAL_HEADERS, [
      ["Алматы", "Corleone, барбершоп", "", "", "", ""],
    ]);

    expect(errors).toEqual([]);
    expect(clients).toHaveLength(1);
    expect(clients[0].contacts).toHaveLength(0);
  });

  it("схлопывает переносы строк внутри ячейки", () => {
    const { clients } = parseClientRows(REAL_HEADERS, [
      ["Алматы", "Kaiza Machinery,\nТОО, компания", "Принимает решение", "Олег", "", "+77775823402"],
    ]);

    expect(clients[0].name).toBe("Kaiza Machinery, ТОО, компания");
  });

  it("считает фирму одной, даже если регистр в файле разный", () => {
    const { clients } = parseClientRows(REAL_HEADERS, [
      ["Алматы", "BiHappy", "", "Фазыл", "", "+7707"],
      ["Алматы", "bihappy", "", "Альбина", "", "+7708"],
    ]);

    expect(clients).toHaveLength(1);
    expect(clients[0].contacts).toHaveLength(2);
  });

  it("молча пропускает пустые строки", () => {
    const { clients, errors } = parseClientRows(REAL_HEADERS, [
      ["Алматы", "Альфа", "", "Иван", "", "+7701"],
      [null, null, null, null, null, null],
      ["", "", "", "", "", ""],
    ]);

    expect(clients).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("сообщает о строке без фирмы", () => {
    const { errors } = parseClientRows(REAL_HEADERS, [
      ["Алматы", null, "Сотрудник", "Иван", "", "+7701"],
    ]);

    expect(errors[0].row).toBe(2);
    expect(errors[0].message).toContain("Не указана компания");
  });

  it("честно отказывается, если колонки с фирмой нет вовсе", () => {
    const { clients, errors } = parseClientRows(["Город", "Телефон"], [["Алматы", "+7701"]]);

    expect(clients).toHaveLength(0);
    expect(errors[0].message).toContain("Не нашёл колонку с названием компании");
  });

  it("ставит «Без имени», если есть телефон, но нет имени", () => {
    const { clients } = parseClientRows(REAL_HEADERS, [
      ["Алматы", "Гамма", "", "", "", "+77011234567"],
    ]);

    expect(clients[0].contacts[0].full_name).toBe("Без имени");
    expect(clients[0].contacts[0].phone).toBe("+77011234567");
  });
});
