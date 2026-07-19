import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // По умолчанию Next режет тело запроса на 1 МБ, и загрузка Excel
      // с парой тысяч клиентов падала бы без внятной ошибки.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Страница логина и вся CRM не должны открываться во встроенном
          // фрейме на чужом сайте — это стандартная защита от clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Не даёт браузеру угадывать тип файла по содержимому — иначе
          // загруженный документ мог бы исполниться как HTML/скрипт.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Ссылки на внутренние страницы (client_id и т.п. в пути) не должны
          // утекать во Referer при переходе на внешний сайт.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
