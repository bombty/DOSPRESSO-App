/**
 * DOSPRESSO Ürün Reçeteleri Seed — 13 Reçete
 * Kaynak: GÜNCEL ÜRÜN REÇETESİ.pdf
 * 
 * Çalıştırma: npx tsx server/seed-product-recipes.ts
 */

import { db } from "./db";
import { factoryRecipes, factoryRecipeIngredients, factoryRecipeSteps, inventory } from "@shared/schema";
import { eq, sql, ilike } from "drizzle-orm";

// ── Birim normalizasyonu ──
function normalizeUnit(unit: string, amount: number): { amount: number; unit: string } {
  const u = unit.toUpperCase().trim();
  if (u === "KG") return { amount: amount * 1000, unit: "g" };
  if (u === "GR" || u === "G") return { amount, unit: "g" };
  if (u === "ADET") return { amount: amount * 55, unit: "g" }; // ~55g/yumurta
  if (u === "LT" || u === "L") return { amount: amount * 1000, unit: "ml" };
  return { amount, unit: "g" };
}

// ── Inventory eşleştirme ──
const INGREDIENT_MAP: Record<string, string[]> = {
  // Temel malzemeler
  "UN": ["Un", "un"],
  "ŞEKER": ["TOZ ŞEKER", "Toz Şeker", "şeker"],
  "TOZ ŞEKER": ["TOZ ŞEKER", "Toz Şeker"],
  "ESMER ŞEKER": ["ESMER ŞEKER", "Esmer Şeker"],
  "TUZ": ["TUZ", "Tuz"],
  "SU": ["Su"],
  "SOĞUK SU": ["Su"],
  "MAYA": ["Yaş Maya", "YAŞ MAYA"],
  "YAŞ MAYA": ["Yaş Maya", "YAŞ MAYA"],
  "YUMURTA": ["Yumurta"],
  "TOZ YUMURTA": ["Yumurta Tozu", "TOZ YUMURTA", "YUMURTA TOZU"],
  "TOZ YUMARTA": ["Yumurta Tozu", "TOZ YUMURTA"],
  "YUMURTA TOZU": ["Yumurta Tozu"],
  
  // Süt ürünleri
  "LABNE": ["LABNE", "Labne"],
  "TAZE PEYNİR": ["TAZE PEYNİR", "Taze Peynir", "Peynir"],
  "KREMA": ["KREMA", "Krema"],
  "TEREYAĞ": ["TEREYAĞ", "Tereyağ"],
  "YAĞSIZ SÜT TOZU": ["Yağsız Süt Tozu", "SÜT TOZU"],
  "SÜT TOZU": ["Yağsız Süt Tozu", "SÜT TOZU"],
  
  // Çikolatalar
  "BİTTER ÇİKOLATA": ["BİTTER ÇİKOLATA", "Bitter Çikolata"],
  "SÜTLÜ ÇİKOLATA": ["SÜTLÜ ÇİKOLATA", "Sütlü Çikolata"],
  "BEYAZ ÇİKOLATA": ["BEYAZ ÇİKOLATA", "Beyaz Çikolata"],
  
  // Yağlar
  "SIVI YAĞ": ["SIVI YAĞ", "Sıvı Yağ", "Ayçiçek"],
  "ZEYTİN YAĞ": ["ZEYTİN YAĞ", "Zeytinyağ"],
  "TURYAĞ": ["TURYAĞ", "Margarin", "AAK ALBA"],
  "T-2": ["T-2", "Margarin"],
  
  // Katkılar
  "KAKAO TOZU": ["KAKAO", "Kakao Tozu"],
  "KABARTMA TOZU": ["KABARTMA TOZU", "Kabartma"],
  "VANİLİN": ["VANİLİN", "Vanilya", "VANILYA DKT"],
  "VANİLYA": ["VANİLİN", "Vanilya", "VANILYA"],
  "POTASYUM SORBAT": ["POTASYUM SORBAT", "Potasyum Sorbat"],
  "POTASTUM SORBAT": ["POTASYUM SORBAT"],
  "KSANTAN GUM": ["KSANTAN", "Xanthan"],
  "XANTHAN GUM": ["KSANTAN", "Xanthan"],
  "XHANTAN GUM": ["KSANTAN", "Xanthan"],
  "VİTAMİN C": ["VİTAMİN C", "Askorbik"],
  "KALSİYUM PROPİYONAT": ["KALSİYUM PROPİYONAT", "Kalsiyum"],
  "KALSİYUM PROBİYONAT": ["KALSİYUM PROPİYONAT"],
  "KARBONAT": ["KARBONAT", "Sodyum Bikarbonat"],
  "DATEM": ["DATEM"],
  "SSL": ["SSL"],
  "CMC": ["CMC"],
  "HPMC": ["HPMC"],
  "PST": ["PST"],
  "GLİSERİN": ["Gliserin", "GLİSERİN"],
  "DEKSTORZ": ["DEKSTROZ", "Dekstroz"],
  "DEKSTROZ": ["DEKSTROZ", "Dekstroz"],
  "MODİFİYE MSIIR NİŞASTASI": ["Modifiye Nişasta"],
  "MALTOGENİK AMİLAZ": ["MALTOGENİK", "Maltogenik"],
  "L-SESTEİN": ["L-SİSTEİN", "Sistein"],
  "L-SİSTEİN": ["L-SİSTEİN", "Sistein"],
  "SOYA UNU": ["SOYA UNU", "Soya"],
  "BUĞDAY GLUTENİ": ["Gluten", "Vital Wheat Gluten"],
  "E471": ["E471", "Mono"],
  "İNVERT ŞURUP": ["Creamice Base", "İnvert"],
  "İNVERT ŞEKER": ["Creamice Base", "İnvert"],
  "AROMA CREAMBASE": ["Creamice Base", "AROMA"],
  "AROMA ŞURUBU": ["Creamice Base", "AROMA"],
  
  // Özel
  "FİLE BADEM": ["BADEM", "Badem"],
  "OREO PARÇACIĞI": ["OREO", "Oreo"],
  "KARAMEL DOLGU": ["KARAMEL", "Karamel"],
  "ÇİKOLATA AROMASI": ["ÇİKOLATA AROMA", "Çikolata Aroma"],
  "BEYAZ ÇİKOLATA AROMASI": ["BEYAZ ÇİKOLATA AROMA"],
  "WHITE MOCHA AROMASI": ["WHITE MOCHA", "Mocha"],
  "ESPRESSO TOZ": ["ESPRESSO", "Kahve"],
  "MUSKAT": ["MUSKAT", "Muskat"],
  "ACI BADEM": ["ACI BADEM", "Acı Badem"],
  "ŞEKER KAMIŞI": ["ŞEKER KAMIŞI", "Şeker Kamışı"],
  "KARBON BLACK": ["KARBON", "Carbon Black"],
  "VİZYON": ["VİZYON", "Vizyon"],
};

// ── 13 Reçete ──
const RECIPES = [
  {
    name: "Ciabatta Ana Hamur",
    code: "EKM-001",
    category: "ekmek",
    outputType: "mamul" as const,
    baseBatchOutput: 192,
    expectedUnitWeight: "150",
    outputUnit: "adet",
    bakingTemp: 140, bakingTime: 30, bakingFan: 1, bakingHumidity: 10,
    notes: "İlk aşama: 40°C/30dk fermantasyon. İkinci aşama: 140°C/30dk pişirme. Fan: 1, Nem: %10",
    ingredients: [
      { name: "UN", amount: 10, unit: "KG" },
      { name: "SU", amount: 8, unit: "KG" },
      { name: "TUZ", amount: 150, unit: "GR" },
      { name: "MAYA", amount: 400, unit: "GR" },
      { name: "ZEYTİN YAĞ", amount: 500, unit: "GR" },
    ],
  },
  {
    name: "Cheesecake Lotus",
    code: "CHE-001",
    category: "cheesecake",
    outputType: "mamul" as const,
    baseBatchOutput: 225,
    expectedUnitWeight: "180",
    outputUnit: "adet",
    bakingTemp: 140, bakingTime: 30, bakingFan: 1, bakingHumidity: 0,
    notes: "Taban: 50gr Karamelli Burçak Bisküvi. Topping: Süt Reçeli. Pişirme: 140°C/30dk, Benmari su",
    ingredients: [
      { name: "ŞEKER", amount: 7.5, unit: "KG" },
      { name: "UN", amount: 750, unit: "GR" },
      { name: "LABNE", amount: 12, unit: "KG" },
      { name: "TAZE PEYNİR", amount: 6, unit: "KG" },
      { name: "KREMA", amount: 9, unit: "KG" },
      { name: "YUMURTA", amount: 105, unit: "ADET" },
      { name: "KARAMEL DOLGU", amount: 1, unit: "KG" },
      { name: "VANİLİN", amount: 30, unit: "GR" },
      { name: "POTASYUM SORBAT", amount: 4.5, unit: "GR" },
      { name: "KSANTAN GUM", amount: 27, unit: "GR" },
    ],
  },
  {
    name: "Cheesecake Frambuaz",
    code: "CHE-002",
    category: "cheesecake",
    outputType: "mamul" as const,
    baseBatchOutput: 225,
    expectedUnitWeight: "180",
    outputUnit: "adet",
    bakingTemp: 140, bakingTime: 30, bakingFan: 1, bakingHumidity: 0,
    notes: "Taban: 50gr Burçak Bisküvi. Topping: Frambuaz",
    ingredients: [
      { name: "ŞEKER", amount: 7.5, unit: "KG" },
      { name: "UN", amount: 750, unit: "GR" },
      { name: "LABNE", amount: 12, unit: "KG" },
      { name: "TAZE PEYNİR", amount: 6, unit: "KG" },
      { name: "KREMA", amount: 9, unit: "KG" },
      { name: "YUMURTA", amount: 105, unit: "ADET" },
      { name: "VANİLİN", amount: 30, unit: "GR" },
      { name: "POTASYUM SORBAT", amount: 4.5, unit: "GR" },
      { name: "KSANTAN GUM", amount: 27, unit: "GR" },
    ],
  },
  {
    name: "Cheesecake Limon",
    code: "CHE-003",
    category: "cheesecake",
    outputType: "mamul" as const,
    baseBatchOutput: 225,
    expectedUnitWeight: "180",
    outputUnit: "adet",
    bakingTemp: 140, bakingTime: 30, bakingFan: 1, bakingHumidity: 0,
    notes: "Taban: 50gr Burçak Bisküvi. Topping: Limon",
    ingredients: [
      { name: "ŞEKER", amount: 7.5, unit: "KG" },
      { name: "UN", amount: 750, unit: "GR" },
      { name: "LABNE", amount: 12, unit: "KG" },
      { name: "TAZE PEYNİR", amount: 6, unit: "KG" },
      { name: "KREMA", amount: 9, unit: "KG" },
      { name: "YUMURTA", amount: 105, unit: "ADET" },
      { name: "VANİLİN", amount: 30, unit: "GR" },
      { name: "POTASYUM SORBAT", amount: 4.5, unit: "GR" },
      { name: "KSANTAN GUM", amount: 27, unit: "GR" },
    ],
  },
  {
    name: "Cheesecake Oreo",
    code: "CHE-004",
    category: "cheesecake",
    outputType: "mamul" as const,
    baseBatchOutput: 225,
    expectedUnitWeight: "180",
    outputUnit: "adet",
    bakingTemp: 140, bakingTime: 30, bakingFan: 1, bakingHumidity: 0,
    notes: "Taban: 30gr Oreo Bisküvi. Topping: Çikolata. Pişirme: Benmari su",
    ingredients: [
      { name: "ŞEKER", amount: 7.5, unit: "KG" },
      { name: "UN", amount: 750, unit: "GR" },
      { name: "LABNE", amount: 12, unit: "KG" },
      { name: "TAZE PEYNİR", amount: 6, unit: "KG" },
      { name: "KREMA", amount: 9, unit: "KG" },
      { name: "OREO PARÇACIĞI", amount: 450, unit: "GR" },
      { name: "YUMURTA", amount: 105, unit: "ADET" },
      { name: "VANİLİN", amount: 30, unit: "GR" },
      { name: "POTASTUM SORBAT", amount: 4.5, unit: "GR" },
      { name: "KSANTAN GUM", amount: 27, unit: "GR" },
    ],
  },
  {
    name: "San Sebastian Cheesecake",
    code: "CHE-005",
    category: "cheesecake",
    outputType: "mamul" as const,
    baseBatchOutput: 225,
    expectedUnitWeight: "180",
    outputUnit: "adet",
    bakingTemp: 140, bakingTime: 30, bakingFan: 1, bakingHumidity: 0,
    notes: "Taban: 50gr Burçak Bisküvi. Klasik San Sebastian usulü",
    ingredients: [
      { name: "ŞEKER", amount: 4.5, unit: "KG" },
      { name: "UN", amount: 700, unit: "GR" },
      { name: "TAZE PEYNİR", amount: 13, unit: "KG" },
      { name: "KREMA", amount: 6, unit: "KG" },
      { name: "YUMURTA", amount: 80, unit: "ADET" },
      { name: "VANİLİN", amount: 5, unit: "GR" },
      { name: "POTASYUM SORBAT", amount: 1.5, unit: "GR" },
      { name: "KSANTAN GUM", amount: 6.3, unit: "GR" },
    ],
  },
  {
    name: "Beyaz Brownie",
    code: "BRW-001",
    category: "brownie",
    outputType: "mamul" as const,
    baseBatchOutput: 100,
    expectedUnitWeight: "90",
    outputUnit: "adet",
    bakingTemp: 160, bakingTime: 25, bakingFan: 1, bakingHumidity: 0,
    notes: "Beyaz çikolatalı brownie. File badem süsleme",
    ingredients: [
      { name: "BEYAZ ÇİKOLATA", amount: 1.5, unit: "KG" },
      { name: "TEREYAĞ", amount: 2, unit: "KG" },
      { name: "ŞEKER", amount: 1.6, unit: "KG" },
      { name: "TOZ YUMARTA", amount: 320, unit: "GR" },
      { name: "SU", amount: 1.2, unit: "KG" },
      { name: "YAĞSIZ SÜT TOZU", amount: 250, unit: "GR" },
      { name: "UN", amount: 1.45, unit: "KG" },
      { name: "KABARTMA TOZU", amount: 15, unit: "GR" },
      { name: "TUZ", amount: 25, unit: "GR" },
      { name: "VANİLİN", amount: 15, unit: "GR" },
      { name: "FİLE BADEM", amount: 350, unit: "GR" },
      { name: "POTASYUM SORBAT", amount: 4, unit: "GR" },
      { name: "VİTAMİN C", amount: 1, unit: "GR" },
      { name: "BEYAZ ÇİKOLATA AROMASI", amount: 30, unit: "GR" },
    ],
  },
  {
    name: "Brownie",
    code: "BRW-002",
    category: "brownie",
    outputType: "mamul" as const,
    baseBatchOutput: 100,
    expectedUnitWeight: "90",
    outputUnit: "adet",
    bakingTemp: 160, bakingTime: 25, bakingFan: 1, bakingHumidity: 0,
    notes: "Klasik bitter çikolatalı brownie",
    ingredients: [
      { name: "BİTTER ÇİKOLATA", amount: 2, unit: "KG" },
      { name: "TEREYAĞ", amount: 1.65, unit: "KG" },
      { name: "TOZ ŞEKER", amount: 1.65, unit: "KG" },
      { name: "ESMER ŞEKER", amount: 620, unit: "GR" },
      { name: "TOZ YUMURTA", amount: 540, unit: "GR" },
      { name: "SU", amount: 1050, unit: "GR" },
      { name: "UN", amount: 1.15, unit: "KG" },
      { name: "KAKAO TOZU", amount: 240, unit: "GR" },
      { name: "TUZ", amount: 25, unit: "GR" },
      { name: "KABARTMA TOZU", amount: 2, unit: "GR" },
      { name: "İNVERT ŞURUP", amount: 60, unit: "GR" },
      { name: "ÇİKOLATA AROMASI", amount: 10, unit: "GR" },
      { name: "POTASYUM SORBAT", amount: 10, unit: "GR" },
      { name: "HPMC", amount: 25, unit: "GR" },
    ],
  },
  {
    name: "Siyah Cookie",
    code: "COK-001",
    category: "cookie",
    outputType: "mamul" as const,
    baseBatchOutput: 300,
    expectedUnitWeight: "100",
    outputUnit: "adet",
    bakingTemp: 170, bakingTime: 12, bakingFan: 1, bakingHumidity: 0,
    notes: "Triple çikolatalı siyah cookie. Bitter + Sütlü + Beyaz çikolata parçacıklı",
    ingredients: [
      { name: "TEREYAĞ", amount: 3.74, unit: "KG" },
      { name: "T-2", amount: 1.11, unit: "KG" },
      { name: "ESMER ŞEKER", amount: 4.79, unit: "KG" },
      { name: "TOZ ŞEKER", amount: 3.465, unit: "KG" },
      { name: "AROMA CREAMBASE", amount: 1.385, unit: "KG" },
      { name: "YUMURTA", amount: 2.3, unit: "KG" },
      { name: "VANİLYA", amount: 8, unit: "GR" },
      { name: "UN", amount: 4.85, unit: "KG" },
      { name: "KAKAO TOZU", amount: 1.91, unit: "KG" },
      { name: "KARBONAT", amount: 277, unit: "GR" },
      { name: "KABARTMA TOZU", amount: 111, unit: "GR" },
      { name: "TUZ", amount: 134, unit: "GR" },
      { name: "DATEM", amount: 97, unit: "GR" },
      { name: "KALSİYUM PROPİYONAT", amount: 40, unit: "GR" },
      { name: "BİTTER ÇİKOLATA", amount: 1.5, unit: "KG" },
      { name: "SÜTLÜ ÇİKOLATA", amount: 2, unit: "KG" },
      { name: "BEYAZ ÇİKOLATA", amount: 1.5, unit: "KG" },
    ],
  },
  {
    name: "Yulaflı Cookie",
    code: "COK-002",
    category: "cookie",
    outputType: "mamul" as const,
    baseBatchOutput: 300,
    expectedUnitWeight: "100",
    outputUnit: "adet",
    bakingTemp: 170, bakingTime: 12, bakingFan: 1, bakingHumidity: 0,
    notes: "Yulaflı cookie. Sütlü + Beyaz çikolata parçacıklı, White mocha aromalı",
    ingredients: [
      { name: "TEREYAĞ", amount: 5.96, unit: "KG" },
      { name: "ESMER ŞEKER", amount: 5.23, unit: "KG" },
      { name: "TOZ ŞEKER", amount: 1.7, unit: "KG" },
      { name: "YUMURTA TOZU", amount: 545, unit: "GR" },
      { name: "SU", amount: 1.75, unit: "KG" },
      { name: "UN", amount: 8.6, unit: "KG" },
      { name: "VANİLYA", amount: 21, unit: "GR" },
      { name: "WHITE MOCHA AROMASI", amount: 90, unit: "GR" },
      { name: "KARBONAT", amount: 170, unit: "GR" },
      { name: "TUZ", amount: 105, unit: "GR" },
      { name: "ESPRESSO TOZ", amount: 20, unit: "GR" },
      { name: "POTASYUM SORBAT", amount: 40, unit: "GR" },
      { name: "VİTAMİN C", amount: 2, unit: "GR" },
      { name: "SÜTLÜ ÇİKOLATA", amount: 4, unit: "KG" },
      { name: "BEYAZ ÇİKOLATA", amount: 2, unit: "KG" },
    ],
  },
  {
    name: "Blueberry Crown",
    code: "EKM-002",
    category: "ekmek",
    outputType: "mamul" as const,
    baseBatchOutput: 100,
    expectedUnitWeight: "120",
    outputUnit: "adet",
    bakingTemp: 180, bakingTime: 20, bakingFan: 1, bakingHumidity: 10,
    notes: "Blueberry dolgulu taç ekmek",
    ingredients: [
      { name: "UN", amount: 10, unit: "KG" },
      { name: "TEREYAĞ", amount: 1, unit: "KG" },
      { name: "SIVI YAĞ", amount: 500, unit: "GR" },
      { name: "ŞEKER", amount: 1, unit: "KG" },
      { name: "TUZ", amount: 150, unit: "GR" },
      { name: "SOĞUK SU", amount: 4, unit: "KG" },
      { name: "MAYA", amount: 400, unit: "GR" },
      { name: "SÜT TOZU", amount: 1, unit: "KG" },
    ],
  },
  {
    name: "Beyaz Cinebom",
    code: "CIN-002",
    category: "cinnamon_roll",
    outputType: "mamul" as const,
    baseBatchOutput: 65,
    expectedUnitWeight: "120",
    outputUnit: "adet",
    bakingTemp: 170, bakingTime: 18, bakingFan: 1, bakingHumidity: 10,
    notes: "Beyaz tarçınlı rulo. 27 malzemelik endüstriyel formül",
    ingredients: [
      { name: "UN", amount: 30, unit: "KG" },
      { name: "TOZ YUMURTA", amount: 220, unit: "GR" },
      { name: "SU", amount: 17, unit: "KG" },
      { name: "ŞEKER", amount: 3.3, unit: "KG" },
      { name: "DEKSTORZ", amount: 450, unit: "GR" },
      { name: "İNVERT ŞURUP", amount: 450, unit: "GR" },
      { name: "GLİSERİN", amount: 160, unit: "GR" },
      { name: "TURYAĞ", amount: 4.7, unit: "KG" },
      { name: "SIVI YAĞ", amount: 1.3, unit: "KG" },
      { name: "YAĞSIZ SÜT TOZU", amount: 700, unit: "GR" },
      { name: "SOYA UNU", amount: 90, unit: "GR" },
      { name: "PST", amount: 30, unit: "GR" },
      { name: "TUZ", amount: 430, unit: "GR" },
      { name: "YAŞ MAYA", amount: 1, unit: "KG" },
      { name: "CMC", amount: 38, unit: "GR" },
      { name: "XANTHAN GUM", amount: 1, unit: "GR" },
      { name: "MODİFİYE MSIIR NİŞASTASI", amount: 90, unit: "GR" },
      { name: "MALTOGENİK AMİLAZ", amount: 3, unit: "GR" },
      { name: "L-SESTEİN", amount: 1, unit: "GR" },
      { name: "VİTAMİN C", amount: 1.5, unit: "GR" },
      { name: "KALSİYUM PROPİYONAT", amount: 40, unit: "GR" },
      { name: "DATEM", amount: 45, unit: "GR" },
      { name: "SSL", amount: 75, unit: "GR" },
      { name: "VANİLYA", amount: 60, unit: "GR" },
      { name: "ŞEKER KAMIŞI", amount: 12, unit: "GR" },
      { name: "ACI BADEM", amount: 3, unit: "GR" },
      { name: "MUSKAT", amount: 3, unit: "GR" },
    ],
  },
  {
    name: "Siyah Brownie Cinebom",
    code: "CIN-003",
    category: "cinnamon_roll",
    outputType: "mamul" as const,
    baseBatchOutput: 65,
    expectedUnitWeight: "120",
    outputUnit: "adet",
    bakingTemp: 170, bakingTime: 18, bakingFan: 1, bakingHumidity: 10,
    notes: "Siyah brownie tarçınlı rulo. Kakaolu + Carbon Black formül",
    ingredients: [
      { name: "UN", amount: 28.2, unit: "KG" },
      { name: "SU", amount: 17.4, unit: "KG" },
      { name: "ŞEKER", amount: 3.45, unit: "KG" },
      { name: "AROMA ŞURUBU", amount: 105, unit: "GR" },
      { name: "T-2", amount: 2.7, unit: "KG" },
      { name: "GLİSERİN", amount: 150, unit: "GR" },
      { name: "MAYA", amount: 300, unit: "GR" },
      { name: "KAKAO TOZU", amount: 300, unit: "GR" },
      { name: "ŞEKER KAMIŞI", amount: 9, unit: "GR" },
      { name: "BUĞDAY GLUTENİ", amount: 250, unit: "GR" },
      { name: "KARBON BLACK", amount: 280, unit: "GR" },
      { name: "TUZ", amount: 420, unit: "GR" },
      { name: "TOZ YUMURTA", amount: 150, unit: "GR" },
      { name: "YAĞSIZ SÜT TOZU", amount: 360, unit: "GR" },
      { name: "SOYA UNU", amount: 100, unit: "GR" },
      { name: "PST", amount: 30, unit: "GR" },
      { name: "DEKSTROZ", amount: 360, unit: "GR" },
      { name: "CMC", amount: 55, unit: "GR" },
      { name: "XHANTAN GUM", amount: 2, unit: "GR" },
      { name: "MALTOGENİK AMİLAZ", amount: 4, unit: "GR" },
      { name: "VİZYON", amount: 195, unit: "GR" },
      { name: "L-SİSTEİN", amount: 1, unit: "GR" },
      { name: "VANİLİN", amount: 30, unit: "GR" },
      { name: "KALSİYUM PROBİYONAT", amount: 60, unit: "GR" },
      { name: "MUSKAT", amount: 3, unit: "GR" },
      { name: "E471", amount: 50, unit: "GR" },
      { name: "SSL", amount: 65, unit: "GR" },
      { name: "DATEM", amount: 95, unit: "GR" },
      { name: "ACI BADEM", amount: 3, unit: "GR" },
    ],
  },
];

async function findInventoryId(ingredientName: string): Promise<number | null> {
  const searchTerms = INGREDIENT_MAP[ingredientName] || [ingredientName];
  
  for (const term of searchTerms) {
    const [found] = await db.select({ id: inventory.id, name: inventory.name })
      .from(inventory)
      .where(ilike(inventory.name, `%${term}%`))
      .limit(1);
    if (found) return found.id;
  }
  return null;
}

async function seedRecipes() {
  console.log("[SEED] 13 ürün reçetesi ekleniyor...\n");

  let created = 0, skipped = 0, totalIngredients = 0, linked = 0, unlinked = 0;

  for (const recipe of RECIPES) {
    // Var mı kontrol?
    const [existing] = await db.select({ id: factoryRecipes.id })
      .from(factoryRecipes)
      .where(eq(factoryRecipes.code, recipe.code))
      .limit(1);

    if (existing) {
      console.log(`  ⏭️ ${recipe.code} "${recipe.name}" zaten var (id: ${existing.id})`);
      skipped++;
      continue;
    }

    // Reçete oluştur
    const [newRecipe] = await db.insert(factoryRecipes).values({
      name: recipe.name,
      code: recipe.code,
      category: recipe.category,
      outputType: recipe.outputType,
      baseBatchOutput: recipe.baseBatchOutput,
      expectedUnitWeight: recipe.expectedUnitWeight,
      outputUnit: recipe.outputUnit,
      recipeType: "OPEN",
      isVisible: true,
      editLocked: false,
      version: 1,
      description: recipe.notes,
    }).returning();

    console.log(`  ✅ ${recipe.code} "${recipe.name}" (id: ${newRecipe.id})`);

    // Malzemeler ekle
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      const { amount, unit } = normalizeUnit(ing.unit, ing.amount);
      const invId = await findInventoryId(ing.name);

      const refId = String(i + 1).padStart(4, "0");
      await db.insert(factoryRecipeIngredients).values({
        recipeId: newRecipe.id,
        refId,
        name: ing.name,
        amount: String(amount),
        unit,
        ingredientType: "normal",
        ingredientCategory: "ana",
        rawMaterialId: invId,
        sortOrder: i,
      });

      totalIngredients++;
      if (invId) linked++; else unlinked++;
    }

    created++;
  }

  // Maliyet raporu
  console.log(`\n[SEED] ═══════════════════════════════════════`);
  console.log(`[SEED] ✅ Sonuç: ${created} oluşturuldu, ${skipped} atlandı`);
  console.log(`[SEED] 📦 ${totalIngredients} malzeme kaydı (${linked} eşleşti, ${unlinked} eşleşmedi)`);

  // Fiyat raporu
  console.log(`\n[SEED] ═══ ÜRÜN MALİYET RAPORU ═══`);

  const allRecipes = await db.select({ id: factoryRecipes.id, name: factoryRecipes.name, code: factoryRecipes.code, baseBatchOutput: factoryRecipes.baseBatchOutput })
    .from(factoryRecipes)
    .where(sql`${factoryRecipes.code} LIKE 'EKM-%' OR ${factoryRecipes.code} LIKE 'CHE-%' OR ${factoryRecipes.code} LIKE 'BRW-%' OR ${factoryRecipes.code} LIKE 'COK-%' OR ${factoryRecipes.code} LIKE 'CIN-%'`)
    .orderBy(factoryRecipes.code);

  for (const r of allRecipes) {
    const ingredients = await db.execute(sql`
      SELECT fri.name as ing_name, fri.amount, fri.unit, fri.raw_material_id,
        i.market_price, i.conversion_factor, i.name as inv_name
      FROM factory_recipe_ingredients fri
      LEFT JOIN inventory i ON i.id = fri.raw_material_id
      WHERE fri.recipe_id = ${r.id}
      ORDER BY fri.sort_order
    `);

    let totalCost = 0;
    let hasMissing = false;

    console.log(`\n  ${r.code} — ${r.name} (${r.baseBatchOutput} adet/batch)`);
    console.log(`  ${"Malzeme".padEnd(30)} ${"Miktar".padEnd(15)} ${"Birim Fiyat".padEnd(15)} ${"Maliyet".padEnd(12)}`);
    console.log(`  ${"-".repeat(72)}`);

    for (const ing of (ingredients.rows || []) as any[]) {
      const amount = Number(ing.amount || 0);
      const price = Number(ing.market_price || 0);
      const conv = Number(ing.conversion_factor || 1000);
      const pricePerUnit = conv > 0 ? price / conv : 0;
      const cost = amount * pricePerUnit;
      totalCost += cost;

      const priceStr = price > 0 ? `₺${pricePerUnit.toFixed(4)}/g` : "FİYAT YOK";
      const costStr = price > 0 ? `₺${cost.toFixed(2)}` : "—";
      const linked = ing.raw_material_id ? "" : " ⚠";
      console.log(`  ${(ing.ing_name + linked).padEnd(30)} ${(amount.toLocaleString("tr-TR") + " " + (ing.unit || "g")).padEnd(15)} ${priceStr.padEnd(15)} ${costStr.padEnd(12)}`);

      if (!ing.raw_material_id || price === 0) hasMissing = true;
    }

    const unitCost = r.baseBatchOutput > 0 ? totalCost / r.baseBatchOutput : 0;
    console.log(`  ${"-".repeat(72)}`);
    console.log(`  TOPLAM BATCH MALİYET: ₺${totalCost.toFixed(2)}${hasMissing ? " (eksik fiyatlar var)" : ""}`);
    console.log(`  BİRİM MALİYET: ₺${unitCost.toFixed(2)} / adet`);
  }
}

seedRecipes()
  .then(() => process.exit(0))
  .catch((err) => { console.error("[SEED] Fatal:", err); process.exit(1); });
