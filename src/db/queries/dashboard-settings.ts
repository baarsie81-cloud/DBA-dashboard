import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dashboardSettings } from "@/db/schema";
import {
  MORTGAGE_COLUMN_ORDER_SETTING_KEY,
  parseMortgageColumnOrderJson,
  type MortgageColumnKey,
} from "@/lib/mortgage-column-order";

export async function getDashboardSetting(
  key: string,
): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ value: dashboardSettings.value })
    .from(dashboardSettings)
    .where(eq(dashboardSettings.key, key))
    .limit(1);

  return rows[0]?.value ?? null;
}

export async function setDashboardSetting(
  key: string,
  value: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(dashboardSettings)
    .values({
      key,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}

export async function getMortgageColumnOrder(): Promise<MortgageColumnKey[]> {
  const stored = await getDashboardSetting(MORTGAGE_COLUMN_ORDER_SETTING_KEY);
  return parseMortgageColumnOrderJson(stored);
}

export async function saveMortgageColumnOrder(
  order: MortgageColumnKey[],
): Promise<void> {
  await setDashboardSetting(
    MORTGAGE_COLUMN_ORDER_SETTING_KEY,
    JSON.stringify(order),
  );
}
