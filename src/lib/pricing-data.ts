/** Чтение прайса из базы. Обращается к Supabase — не тащить в браузерный код. */

import { createClient } from "@/lib/supabase/server";
import type { ContractMonths } from "@/lib/packages";
import type { PriceCity, PricePosition, PricedPackage, ServiceCategory } from "@/lib/pricing";

type PricePositionRow = {
  city: PriceCity;
  category: ServiceCategory;
  package: PricedPackage;
  contract_months: ContractMonths;
  development_price: number;
  monthly_service_price: number;
  package_price: number;
  composition: string | null;
  dialog_limit: string | null;
};

function mapPosition(row: PricePositionRow): PricePosition {
  return {
    city: row.city,
    category: row.category,
    package: row.package,
    contractMonths: row.contract_months,
    developmentPrice: Number(row.development_price),
    monthlyServicePrice: Number(row.monthly_service_price),
    packagePrice: Number(row.package_price),
    composition: row.composition,
    dialogLimit: row.dialog_limit,
  };
}

/** Все 54 позиции прайса — калькулятор подбирает нужную на клиенте, без похода в базу на каждое изменение. */
export async function getAllPricePositions(): Promise<PricePosition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_positions")
    .select("*")
    .order("city")
    .order("category")
    .order("package")
    .order("contract_months");

  if (error) throw new Error(error.message);
  return ((data ?? []) as PricePositionRow[]).map(mapPosition);
}

export type RenewalPrice = {
  city: PriceCity;
  category: ServiceCategory;
  package: PricedPackage;
  contractMonths: ContractMonths;
  renewalPrice: number;
};

/** Цены продления на 12 мес — только подсказка в интерфейсе, не участвует в расчётах. */
export async function getAllRenewalPrices(): Promise<RenewalPrice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("price_renewals").select("*");

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{
    city: PriceCity;
    category: ServiceCategory;
    package: PricedPackage;
    contract_months: ContractMonths;
    renewal_price: number;
  }>).map((row) => ({
    city: row.city,
    category: row.category,
    package: row.package,
    contractMonths: row.contract_months,
    renewalPrice: Number(row.renewal_price),
  }));
}
