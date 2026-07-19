import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Клиент с service_role — обходит все политики доступа.
 *
 * `import "server-only"` не даёт сборке Next.js утащить этот файл в бандл
 * браузера: если это случайно попадёт в клиентский код, сборка упадёт
 * с ошибкой, а не молча утечёт ключ пользователю.
 *
 * Используется только в server actions админки — заведение сотрудников
 * требует Auth Admin API, которого нет у обычного (anon) ключа.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY не задан. Добавьте его в .env.local (Supabase → Project Settings → API Keys → service_role).",
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
