import { db } from "../db";
import { factoryRecipes, factoryRecipeIngredients, users } from "@shared/schema";
import { and, asc, eq, sql, inArray } from "drizzle-orm";
import { storage } from "../storage";
import { sendEmail } from "../email";
import {
  computeRecipeNutrition,
  loadNutritionMap,
  loadKeyblendAllergens,
} from "../routes/factory-allergens";

const RECIPIENT_ROLES = ["admin", "kalite_yoneticisi", "gida_muhendisi"];

export interface AllergenSummaryStats {
  totalActive: number;
  unverifiedTotal: number;
  emptyIngredients: number;
  unmatchedIngredients: number;
  lowConfidence: number;
  worst: { id: number; name: string; reason: string | null }[];
}

export async function buildAllergenSummary(): Promise<AllergenSummaryStats> {
  const nutritionMap = await loadNutritionMap();
  const keyblendAllergens = await loadKeyblendAllergens(nutritionMap);

  const recipes = await db
    .select({
      id: factoryRecipes.id,
      name: factoryRecipes.name,
    })
    .from(factoryRecipes)
    .where(and(eq(factoryRecipes.isActive, true), eq(factoryRecipes.isVisible, true)))
    .orderBy(asc(factoryRecipes.name));

  if (recipes.length === 0) {
    return {
      totalActive: 0,
      unverifiedTotal: 0,
      emptyIngredients: 0,
      unmatchedIngredients: 0,
      lowConfidence: 0,
      worst: [],
    };
  }

  const recipeIds = recipes.map((r) => r.id);
  const allIngredients = await db
    .select()
    .from(factoryRecipeIngredients)
    .where(sql`${factoryRecipeIngredients.recipeId} IN (${sql.join(recipeIds.map((id) => sql`${id}`), sql`, `)})`);

  const ingByRecipe = new Map<number, typeof allIngredients>();
  for (const ing of allIngredients) {
    const arr = ingByRecipe.get(ing.recipeId) || [];
    arr.push(ing);
    ingByRecipe.set(ing.recipeId, arr);
  }

  let emptyIngredients = 0;
  let unmatchedIngredients = 0;
  let lowConfidence = 0;
  const unverifiedRecipes: { id: number; name: string; reason: string | null; severity: number }[] = [];

  for (const r of recipes) {
    const ings = ingByRecipe.get(r.id) || [];
    const comp = await computeRecipeNutrition(r.id, ings, nutritionMap, keyblendAllergens);
    if (comp.isVerified) continue;

    let severity = 0;
    if (ings.length === 0) {
      emptyIngredients++;
      severity = 100;
    } else if (comp.matchedCount < comp.totalCount) {
      unmatchedIngredients++;
      severity = (comp.totalCount - comp.matchedCount) + 10;
    } else if (comp.lowConfidenceCount > 0) {
      lowConfidence++;
      severity = comp.lowConfidenceCount;
    }

    unverifiedRecipes.push({
      id: r.id,
      name: r.name,
      reason: comp.verificationReason,
      severity,
    });
  }

  unverifiedRecipes.sort((a, b) => b.severity - a.severity);

  return {
    totalActive: recipes.length,
    unverifiedTotal: unverifiedRecipes.length,
    emptyIngredients,
    unmatchedIngredients,
    lowConfidence,
    worst: unverifiedRecipes.slice(0, 5).map(({ id, name, reason }) => ({ id, name, reason })),
  };
}

function buildEmailHtml(stats: AllergenSummaryStats, link: string): string {
  const worstHtml = stats.worst.length === 0
    ? "<li>Detay gösterilecek reçete yok.</li>"
    : stats.worst.map((w) => `<li><strong>${escapeHtml(w.name)}</strong>${w.reason ? ` — ${escapeHtml(w.reason)}` : ""}</li>`).join("");
  return `
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">
      <div style="max-width:640px;margin:0 auto;padding:20px;">
        <h2 style="color:#b45309;">Onaylanmamış Reçete Haftalık Özet</h2>
        <p>Bu hafta <strong>${stats.unverifiedTotal}</strong> reçete hâlâ tam olarak doğrulanmamış durumda (toplam aktif reçete: ${stats.totalActive}).</p>
        <ul>
          <li>Malzeme listesi boş: <strong>${stats.emptyIngredients}</strong></li>
          <li>Eşleşmeyen malzeme içeren reçete: <strong>${stats.unmatchedIngredients}</strong></li>
          <li>Düşük güven skoru olan reçete: <strong>${stats.lowConfidence}</strong></li>
        </ul>
        <h3>En kritik 5 reçete</h3>
        <ul>${worstHtml}</ul>
        <p style="margin-top:24px;">
          <a href="${link}" style="background:#b45309;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Kalite / Alerjen sayfasını aç</a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:24px;">DOSPRESSO Franchise Management — Otomatik haftalık özet bildirimi.</p>
      </div>
    </body></html>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export async function sendAllergenWeeklySummary(): Promise<{ recipients: number; emailed: number }> {
  try {
    const stats = await buildAllergenSummary();

    const recipients = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(inArray(users.role, RECIPIENT_ROLES), eq(users.isActive, true)));

    if (recipients.length === 0) {
      console.log("[AllergenWeeklySummary] Bildirim gönderilecek yönetici bulunamadı.");
      return { recipients: 0, emailed: 0 };
    }

    const link = "/kalite/alerjen";
    const baseUrl = (
      process.env.APP_BASE_URL ||
      process.env.REPLIT_DEPLOYMENT_URL ||
      (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "") ||
      ""
    ).replace(/\/$/, "");
    const emailLink = baseUrl ? `${baseUrl}${link}` : link;
    const title = stats.unverifiedTotal === 0
      ? "Haftalık alerjen özeti — Tüm reçeteler doğrulandı"
      : `Haftalık alerjen özeti — ${stats.unverifiedTotal} reçete doğrulanmadı`;
    const message = stats.unverifiedTotal === 0
      ? `Aktif ${stats.totalActive} reçetenin tamamı doğrulanmış durumda. Tebrikler.`
      : `Bu hafta ${stats.unverifiedTotal} reçete eksik veri içeriyor: ` +
        `${stats.emptyIngredients} boş malzeme listesi, ` +
        `${stats.unmatchedIngredients} eşleşmeyen malzeme, ` +
        `${stats.lowConfidence} düşük güven skoru. ` +
        `Detaylar için /kalite/alerjen sayfasını ziyaret edin.`;

    const html = buildEmailHtml(stats, emailLink);

    let emailed = 0;
    for (const u of recipients) {
      try {
        await storage.createNotification({
          userId: u.id,
          type: "quality_weekly_summary",
          title,
          message,
          link,
        });
      } catch (err) {
        console.error(`[AllergenWeeklySummary] Bildirim oluşturulamadı (${u.id}):`, err);
      }

      if (u.email && process.env.SMTP_HOST) {
        try {
          await sendEmail({ to: u.email, subject: title, html });
          emailed++;
        } catch (err) {
          console.error(`[AllergenWeeklySummary] E-posta gönderilemedi (${u.email}):`, err);
        }
      }
    }

    console.log(`[AllergenWeeklySummary] ${recipients.length} alıcıya bildirim, ${emailed} e-posta gönderildi.`);
    return { recipients: recipients.length, emailed };
  } catch (err) {
    console.error("[AllergenWeeklySummary] Hata:", err);
    return { recipients: 0, emailed: 0 };
  }
}
