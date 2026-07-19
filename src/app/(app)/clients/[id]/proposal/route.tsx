import { renderToBuffer } from "@react-pdf/renderer";
import { requireProfile } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { isPackage } from "@/lib/packages";
import { isPaymentScheme } from "@/lib/payments";
import { buildProposalViewModel } from "@/lib/proposal-content";
import { registerProposalFonts } from "@/lib/pdf/fonts";
import { ProposalDocument } from "@/lib/pdf/proposal-document";
import { todayISO } from "@/lib/dates";

// react-pdf читает файл шрифта через fs — этому нужен Node.js, не Edge-рантайм.
export const runtime = "nodejs";

/**
 * Генерирует коммерческое предложение по текущему пакету клиента.
 * Content-Disposition: inline — так документ можно и показать во встроенном
 * просмотре в карточке клиента (iframe), и скачать: атрибут download
 * на ссылке в интерфейсе заставляет браузер сохранить файл в любом случае.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireProfile();

  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    return new Response("Клиент не найден", { status: 404 });
  }

  if (!isPackage(client.package)) {
    return new Response(
      "У клиента не выбран пакет — сначала заполните его в разделе «Пакет и договор».",
      { status: 400 },
    );
  }

  const model = buildProposalViewModel({
    clientName: client.name,
    managerName: client.owner_name,
    package: client.package,
    contractMonths: client.contract_months,
    developmentPrice: client.development_price,
    subscriptionPrice: client.subscription_price,
    discountPercent: client.discount_percent,
    paymentScheme: isPaymentScheme(client.payment_scheme) ? client.payment_scheme : null,
    issueDateISO: todayISO(),
  });

  const fontFamily = registerProposalFonts();

  const buffer = await renderToBuffer(
    <ProposalDocument model={model} servicePackage={client.package} fontFamily={fontFamily} />,
  );

  const asciiName = "kp.pdf";
  const utf8Name = encodeURIComponent(`КП ${client.name}.pdf`);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "Cache-Control": "no-store",
    },
  });
}
