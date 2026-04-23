/**
 * Fabrika Reçete Malzemesi — Kanonik İsim Sözlüğü
 *
 * Task #131: factory_ingredient_nutrition tablosunda yazım/kasa varyasyonları
 * yüzünden aynı malzeme birden fazla satırda duruyordu. Bu dosya kanonik
 * isimleri tek bir yerde tutar; hem reçete malzemesi insert/update yollarında
 * hem de SQL migration script'inde (scripts/pilot/20-...) kullanılır.
 *
 * Kural: Sadece açık yazım/kasa duplicate'ları birleştirilir. Farklı ürünler
 * (örn. "TURYAĞ" vs "Tereyağ", "ŞEKER KAMIŞI" vs "ESMER ŞEKER", "LABNE" vs
 * "TAZE PEYNİR") kanonik olarak ayrı kalır.
 */

export const INGREDIENT_ALIASES: Record<string, string[]> = {
  // ── Un / gluten
  "Buğday Unu": ["UN", "Un", "Buğday Unu", "Buğday unu", "BUĞDAY UNU", "Orta-güçlü un (W250-280, %11.5-12.5 protein)"],
  "Vital Gluten": ["BUĞDAY GLUTENİ", "Buğday Gluteni", "Vital Gluten", "Vital wheat gluten", "Vital Wheat Gluten"],
  "Soya Unu": ["SOYA UNU", "Soya Unu", "Soya unu"],

  // ── Şeker
  "Toz Şeker": ["ŞEKER", "Şeker", "TOZ ŞEKER", "Toz Şeker", "Toz şeker"],
  "Esmer Şeker": ["ESMER ŞEKER", "Esmer Şeker", "Esmer şeker"],

  // ── Tuz / Su
  "Tuz": ["TUZ", "Tuz", "İnce tuz", "İNCE TUZ", "İnce Tuz"],
  "Su": ["SU", "Su", "SOĞUK SU", "Soğuk Su", "Soğuk su", "Su (28-30°C)"],

  // ── Maya
  "Yaş Maya": ["MAYA", "Maya", "YAŞ MAYA", "Yaş Maya", "Yaş maya", "Yaş maya (taze)"],

  // ── Yumurta
  "Yumurta": ["YUMURTA", "Yumurta"],
  "Yumurta Tozu": [
    "TOZ YUMURTA", "Toz Yumurta", "Toz yumurta",
    "TOZ YUMARTA", // typo (yumarta)
    "YUMURTA TOZU", "Yumurta Tozu", "Yumurta tozu",
    "Yumurta tozu (spray-dried)",
  ],

  // ── Süt grubu
  "Yağsız Süt Tozu": ["YAĞSIZ SÜT TOZU", "Yağsız Süt Tozu", "Yağsız süt tozu"],
  "Süt Tozu": ["SÜT TOZU", "Süt Tozu", "Süt tozu"],
  "Peynir Altı Suyu Tozu": ["PST", "PST (Peynir Altı Suyu Tozu)", "Peynir Altı Suyu Tozu"],
  "Whey Protein Tozu": ["Whey protein tozu", "WHEY PROTEIN TOZU", "Whey Protein Tozu"],
  "Tereyağ": ["TEREYAĞ", "Tereyağ", "Tereyağı", "TEREYAĞI"],
  "Margarin (Alba)": ["AAK ALBA margarin", "AAK Alba Margarin", "Margarin (Alba)", "Margarin Alba"],
  "Krema": ["KREMA", "Krema"],
  "Labne": ["LABNE", "Labne"],
  "Taze Peynir": ["TAZE PEYNİR", "Taze Peynir", "Taze peynir"],

  // ── Yağ
  "Sıvı Yağ": ["SIVI YAĞ", "Sıvı Yağ", "Sıvı yağ"],

  // ── Aroma / Vanilya  (sadece açık case dup'ları birleştir)
  "Vanilya": ["VANİLYA", "Vanilya"],

  // ── Katkılar (E numaralı varyantlar = aynı kalem)
  "Gliserin (E422)": ["GLİSERİN", "Gliserin", "Gliserin (E422)"],
  "CMC (E466)": ["CMC", "CMC (E466)"],
  "DATEM (E472e)": ["DATEM", "DATEM (E472e)"],
  "SSL (E481)": ["SSL", "SSL (E481)"],
  "Ksantan Gum (E415)": [
    "KSANTAN GUM", "Ksantan Gum",
    "XANTHAN GUM", "Xanthan Gum",
    "XHANTAN GUM", // typo (xhantan)
    "Xanthan (E415)",
  ],
  "Kalsiyum Propiyonat (E282)": [
    "KALSİYUM PROPİYONAT", "Kalsiyum Propiyonat",
    "KALSİYUM PROBİYONAT", // typo (probiyonat)
    "Kalsiyum Propiyonat (E282)",
  ],
  "Potasyum Sorbat": [
    "POTASYUM SORBAT", "Potasyum Sorbat",
    "POTASTUM SORBAT", // typo (potastum)
  ],
  "L-Sistein (E920)": [
    "L-SİSTEİN", "L-Sistein",
    "L-SESTEİN", // typo (sestein)
    "L-Sistein (E920)",
  ],
  "Vitamin C (E300)": ["VİTAMİN C", "Vitamin C", "Vitamin C (E300)"],
  "Modifiye Mısır Nişastası (E1422)": [
    "MODİFİYE MSIIR NİŞASTASI", // typo (msiir)
    "Modifiye Mısır Nişastası",
    "Modifiye nişasta (E1422)",
    "Pregel Modifiye Mısır Nişastası",
  ],
  "Maltogenik Amilaz": ["MALTOGENİK AMİLAZ", "Maltogenik Amilaz"],
  "Muskat": ["MUSKAT", "Muskat"],

  // ── Şeker türevleri
  "Dekstroz": [
    "DEKSTROZ", "Dekstroz",
    "DEKSTORZ", // typo (dekstorz)
  ],
  "İnvert Şeker": [
    "İNVERT ŞURUP", "İnvert Şurup",
    "İnvert Şurup (Creambase)",
    "İnvert şeker", "İnvert Şeker",
  ],
};

const ALIAS_TO_CANONICAL: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    map.set(normalizeKey(canonical), canonical);
    for (const alias of aliases) {
      map.set(normalizeKey(alias), canonical);
    }
  }
  return map;
})();

function normalizeKey(s: string): string {
  return s.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

/**
 * Verilen malzeme adını kanonik forma çevirir. Eşleşme yoksa orijinal
 * (trim'lenmiş) string döner — yeni malzemeler bozulmaz.
 */
export function canonicalIngredientName(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return ALIAS_TO_CANONICAL.get(normalizeKey(trimmed)) ?? trimmed;
}

export function getAllAliases(): Array<{ canonical: string; alias: string }> {
  const out: Array<{ canonical: string; alias: string }> = [];
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    for (const alias of aliases) {
      if (alias !== canonical) out.push({ canonical, alias });
    }
  }
  return out;
}
