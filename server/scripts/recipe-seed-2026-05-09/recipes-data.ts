/**
 * DOSPRESSO Reçete Seed Verileri — Aslan'dan gelen reçeteler (9 May 2026)
 *
 * KAPSAM: Pilot için 4 ana ürün + 4 bonus
 * KAYNAK: Aslan'ın WhatsApp/Claude.ai mesajı + OREO_REC_ETE.pdf
 * HEDEF TABLO: factory_recipe_ingredients
 *
 * BİRİM NORMALİZASYON:
 * - kg → 1000 gram
 * - "adet" yumurta → 50g (standart Türk yumurta L boy)
 * - "adet" yumurta sarısı → 18g
 * - Virgülle ondalık (0,400) → nokta (0.400)
 *
 * EKSİK BİLGİLER:
 * - San Sebastian reçetesi gönderilmedi — Aslan ayrıca yollayacak
 *
 * ASLAN'IN 9 MAY 2026 CEVAPLARI:
 * - PST = Peynir Altı Suyu Tozu (4 reçetede geçer, açıldı)
 * - Donut Formül "yağ: 3100 g" = Margarin Alba (doğrulandı)
 * - "Oreo Reçete" = DOREO (DOSPRESSO'nun cookie'si, içecek topping)
 *
 * EŞLEŞME STRATEJİSİ:
 * - matchedRawMaterialId varsa: inventory'deki gerçek kayıtla bağlı
 * - matchedRawMaterialId null: hammadde inventory'de yok, MIGRATION SIRASINDA OLUŞTURULACAK
 */

export type RecipeIngredient = {
  name: string;          // Reçetedeki orijinal isim
  amount: number;        // Gram cinsinden
  unit: 'g' | 'kg' | 'ml' | 'L' | 'adet';
  notes?: string;
  matchedRawMaterialId?: number | null;  // SQL'de runtime resolve
};

export type RecipeData = {
  recipeName: string;       // Sistemdeki reçete adı (factory_recipes.name)
  recipeCode?: string;
  description?: string;
  expectedOutput?: string;  // "30 kg un bazlı" gibi
  ingredients: RecipeIngredient[];
  steps?: { stepNo: number; description: string; durationMin?: number }[];
  notes?: string;
};

export const RECIPES_PILOT_5: RecipeData[] = [

  // ═══════════════════════════════════════════════════════════════════
  // 1) DONUT BASE HAMURU (Aslan'ın "Donut Formül" mesajı)
  // ═══════════════════════════════════════════════════════════════════
  {
    recipeName: 'Donut Base Hamuru Reçetesi',
    recipeCode: 'DBH-001',
    description: 'Donut için temel hamur reçetesi - 30kg un bazlı',
    expectedOutput: '30 kg un bazlı toplam ~58 kg hamur',
    ingredients: [
      // Ana yapı
      { name: 'Buğday Unu', amount: 30000, unit: 'g' },
      { name: 'Vital Gluten', amount: 130, unit: 'g' },
      { name: 'Toz Yumurta', amount: 150, unit: 'g' },

      // Sıvı + Şeker
      { name: 'Su', amount: 17000, unit: 'g' },
      { name: 'Toz Şeker', amount: 3300, unit: 'g' },
      { name: 'Dekstroz', amount: 500, unit: 'g' },
      { name: 'İnvert Şeker Şurubu', amount: 250, unit: 'g' },
      { name: 'Gliserin', amount: 110, unit: 'g' },

      // Yağlar (Aslan doğruladı: Margarin Alba)
      { name: 'Margarin Alba', amount: 3100, unit: 'g' },
      { name: 'Sıvı Yağ', amount: 1300, unit: 'g' },

      // Süt + Soya
      { name: 'Yağsız Süt Tozu', amount: 500, unit: 'g' },
      { name: 'Soya Unu', amount: 120, unit: 'g' },
      { name: 'Peynir Altı Suyu Tozu', amount: 30, unit: 'g' },
      { name: 'Tuz', amount: 400, unit: 'g' },

      // Maya
      { name: 'Yaş Maya', amount: 1000, unit: 'g' },

      // Stabilizatörler / Emülgatörler
      { name: 'CMC (E466)', amount: 40, unit: 'g' },
      { name: 'Xanthan (E415)', amount: 1, unit: 'g' },
      { name: 'Pregel Modifiye Mısır Nişastası', amount: 50, unit: 'g' },
      { name: 'Maltogenik Amilaz', amount: 3, unit: 'g' },
      { name: 'L-Sistein (E920)', amount: 1, unit: 'g' },
      { name: 'Vitamin C (E300)', amount: 2, unit: 'g' },
      { name: 'Kalsiyum Propiyonat (E282)', amount: 40, unit: 'g' },

      // Doku iyileştiriciler
      { name: 'DATEM (E472e)', amount: 60, unit: 'g' },
      { name: 'SSL (E481)', amount: 85, unit: 'g' },
      { name: 'E471 (Mono ve Digliseridler)', amount: 85, unit: 'g' },

      // Aroma
      { name: 'Vanilya', amount: 60, unit: 'g' },
      { name: 'Şeker Kamışı Aroması', amount: 12, unit: 'g' },
      { name: 'Acı Badem Aroması', amount: 3, unit: 'g' },
      { name: 'Muskat', amount: 3, unit: 'g' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2) CINNABOOM CLASSIC (Beyaz Cinnaboom)
  // ═══════════════════════════════════════════════════════════════════
  {
    recipeName: 'Cinnaboom Classic Reçetesi',
    recipeCode: 'CC-001',
    description: 'Beyaz cinnaboom hamuru - 30kg un bazlı',
    expectedOutput: '30 kg un bazlı toplam ~58 kg hamur',
    ingredients: [
      { name: 'Buğday Unu', amount: 30000, unit: 'g' },
      { name: 'Su', amount: 16200, unit: 'g' },
      { name: 'Toz Yumurta', amount: 162, unit: 'g' },
      { name: 'Toz Şeker', amount: 3720, unit: 'g' },
      { name: 'İnvert Şeker Şurubu', amount: 120, unit: 'g' },
      { name: 'Gliserin', amount: 162, unit: 'g' },
      { name: 'Margarin Alba', amount: 3000, unit: 'g' },
      { name: 'Sıvı Yağ', amount: 1560, unit: 'g' },
      { name: 'Yaş Maya', amount: 1140, unit: 'g' },
      { name: 'Tuz', amount: 450, unit: 'g' },
      { name: 'Yağsız Süt Tozu', amount: 450, unit: 'g' },
      { name: 'Soya Unu', amount: 120, unit: 'g' },
      { name: 'Peynir Altı Suyu Tozu', amount: 42, unit: 'g' },
      { name: 'Dekstroz', amount: 390, unit: 'g' },
      { name: 'Vital Gluten', amount: 150, unit: 'g' },
      { name: 'CMC (E466)', amount: 36, unit: 'g' },
      { name: 'Xanthan (E415)', amount: 3, unit: 'g' },
      { name: 'Maltogenik Amilaz', amount: 12, unit: 'g' },
      { name: 'L-Sistein (E920)', amount: 1.2, unit: 'g' },
      { name: 'Kalsiyum Propiyonat (E282)', amount: 60, unit: 'g' },
      { name: 'Monomuls', amount: 72, unit: 'g' },
      { name: 'SSL (E481)', amount: 48, unit: 'g' },
      { name: 'DATEM (E472e)', amount: 48, unit: 'g' },
      { name: 'Vanilya', amount: 36, unit: 'g' },
      { name: 'Muskat', amount: 6, unit: 'g' },
      { name: 'Acı Badem Aroması', amount: 6, unit: 'g' },
      { name: 'Şeker Kamışı Aroması', amount: 12, unit: 'g' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3) CINNABOOM BROWNIE (Siyah Cinnaboom — kakaolu)
  // ═══════════════════════════════════════════════════════════════════
  {
    recipeName: 'Cinnaboom Brownie Reçetesi',
    recipeCode: 'CB-001',
    description: 'Siyah cinnaboom (kakaolu) - 30kg un bazlı',
    expectedOutput: '30 kg un bazlı toplam ~62 kg hamur',
    ingredients: [
      { name: 'Buğday Unu', amount: 30000, unit: 'g' },
      { name: 'Su', amount: 18600, unit: 'g' },
      { name: 'Kakao Tozu (Saf Yağ Azaltılmış)', amount: 1380, unit: 'g' },
      { name: 'Toz Yumurta', amount: 162, unit: 'g' },
      { name: 'Toz Şeker', amount: 3690, unit: 'g' },
      { name: 'İnvert Şeker Şurubu', amount: 120, unit: 'g' },
      { name: 'Gliserin', amount: 162, unit: 'g' },
      { name: 'Margarin Alba', amount: 2880, unit: 'g' },
      { name: 'Sıvı Yağ', amount: 1590, unit: 'g' },
      { name: 'Yaş Maya', amount: 1200, unit: 'g' },
      { name: 'Tuz', amount: 450, unit: 'g' },
      { name: 'Dekstroz', amount: 390, unit: 'g' },
      { name: 'Vanilya', amount: 30, unit: 'g' },
      { name: 'Muskat', amount: 6, unit: 'g' },
      { name: 'Acı Badem Aroması', amount: 6, unit: 'g' },
      { name: 'Kakao Aroması', amount: 42, unit: 'g' },
      { name: 'Karbon Black (E153)', amount: 300, unit: 'g', notes: 'Renk için' },
      { name: 'Şeker Kamışı Aroması', amount: 12, unit: 'g' },
      { name: 'Vital Gluten', amount: 180, unit: 'g' },
      { name: 'CMC (E466)', amount: 36, unit: 'g' },
      { name: 'Xanthan (E415)', amount: 3, unit: 'g' },
      { name: 'Maltogenik Amilaz', amount: 12, unit: 'g' },
      { name: 'L-Sistein (E920)', amount: 1.2, unit: 'g' },
      { name: 'Monomuls', amount: 66, unit: 'g' },
      { name: 'SSL (E481)', amount: 48, unit: 'g' },
      { name: 'DATEM (E472e)', amount: 48, unit: 'g' },
      { name: 'Soya Unu', amount: 132, unit: 'g' },
      { name: 'Yağsız Süt Tozu', amount: 420, unit: 'g' },
      { name: 'Peynir Altı Suyu Tozu', amount: 42, unit: 'g' },
      { name: 'Kalsiyum Propiyonat (E282)', amount: 60, unit: 'g' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4) CHEESECAKE BASE
  // ═══════════════════════════════════════════════════════════════════
  {
    recipeName: 'Cheesecake Base Reçetesi',
    recipeCode: 'CHB-001',
    description: 'Cheesecake temel reçetesi (krema bazı)',
    expectedOutput: '~22.3 kg cheesecake harcı',
    ingredients: [
      { name: 'Labne', amount: 12000, unit: 'g' },
      { name: 'Taze Peynir', amount: 2000, unit: 'g' },
      { name: 'Yumuşak Tereyağ', amount: 1000, unit: 'g' },
      { name: 'Vanilya Dolgu', amount: 6000, unit: 'g' },
      { name: 'Lime Konstre', amount: 300, unit: 'g' },
      { name: 'Pudra Şekeri', amount: 1000, unit: 'g' },
      { name: 'Vanilya', amount: 2, unit: 'g' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5) SAN SEBASTIAN — REÇETE EKSİK (Aslan göndermedi)
  // ═══════════════════════════════════════════════════════════════════
  // Bu reçete pilot listesinde ama Aslan göndermedi.
  // Ya başka bir mesajda gelecek ya da pilot listesinden çıkarılacak.

];

// ═══════════════════════════════════════════════════════════════════
// BONUS REÇETELER (Aslan ekstra gönderdi)
// ═══════════════════════════════════════════════════════════════════

export const RECIPES_BONUS: RecipeData[] = [

  // OREO REÇETE (PDF'den) → DOREO Cookie (DOSPRESSO'nun Oreo benzeri kurabiyesi)
  // Aslan: "oreo bisküviye benzeyen bir reçete. Bizdeki ismi DOREO. Tepsilerde
  // fırınlanır, kırılıp 1kg paketlerde şubelere gönderilir. İçeceklerde topping
  // olarak ve içeceklerin içinde kullanılır."
  // ÖNEMLİ: Bu reçete sistemde YOK — factory_recipes'e otomatik oluşturulacak
  {
    recipeName: 'DOREO',
    recipeCode: 'DRO-001',
    description: 'DOSPRESSO Oreo benzeri kurabiye — içecek topping ve içerik için kullanılır',
    expectedOutput: '~19.3 kg hamur → tepsilerde fırınlanır → kırılarak 1kg paketler',
    ingredients: [
      { name: 'Toz Şeker', amount: 6000, unit: 'g' },
      { name: 'Vanilya', amount: 15, unit: 'g' },
      { name: 'Kakao Tozu', amount: 2000, unit: 'g' },
      { name: 'Tuz', amount: 15, unit: 'g' },
      { name: 'Karbonat', amount: 15, unit: 'g' },
      { name: 'Yumurta (taze)', amount: 1000, unit: 'g', notes: '20 adet × 50g standart' },
      { name: 'Yumurta Sarısı', amount: 270, unit: 'g', notes: '15 adet × 18g standart' },
      { name: 'Tereyağ', amount: 4000, unit: 'g' },
      { name: 'Buğday Unu', amount: 6000, unit: 'g' },
    ],
    notes: 'YENİ REÇETE — factory_recipes\'te yok, seed sırasında oluşturulmalı. Bu yarı-mamul: tepsilerde pişirilir, kırılarak 1kg paketlenir, şubelere içecek topping/içerik olarak gider.',
  },

  // SICAK ÇİKOLATA (Chocolate Powder)
  {
    recipeName: 'Chocolate Powder Reçetesi',
    recipeCode: 'CHP-001',
    description: 'Sıcak çikolata için içecek tozu karışımı',
    expectedOutput: '~120 kg toz karışım',
    ingredients: [
      { name: 'Kakao Tozu', amount: 35000, unit: 'g' },
      { name: 'Pudra Şekeri', amount: 60000, unit: 'g' },
      { name: 'Kahve Kreması Tozu', amount: 20000, unit: 'g' },
      { name: 'Quantum Gum', amount: 400, unit: 'g' },
      { name: 'Vanilin', amount: 1000, unit: 'g' },
      { name: 'Tuz', amount: 150, unit: 'g' },
      { name: 'Mısır Nişastası', amount: 1000, unit: 'g' },
      { name: 'Bitter Çikolata Aroması', amount: 400, unit: 'g' },
      { name: 'Monomuls', amount: 600, unit: 'g' },
      { name: 'Karagenan', amount: 1000, unit: 'g' },
      { name: 'Trisodyum Fosfat', amount: 200, unit: 'g' },
    ],
  },

  // CREAMCIE TOZ KARIŞIMI (Creambase Powder)
  {
    recipeName: 'Creambase Powder Reçetesi',
    recipeCode: 'CRP-001',
    description: 'Cream-cie içecek toz karışımı',
    expectedOutput: '~25.5 kg toz karışım',
    ingredients: [
      { name: 'Kahve Kreması Tozu', amount: 25000, unit: 'g' },
      { name: 'Ksantan Gum', amount: 400, unit: 'g' },
      { name: 'Vanilin', amount: 100, unit: 'g' },
    ],
  },

  // BOMTYLATTE TOZ KARIŞIMI (Bombty Latte Powder)
  {
    recipeName: 'Bombty Latte Powder Reçetesi',
    recipeCode: 'BLP-001',
    description: 'Bombty Latte için toz karışım',
    expectedOutput: '~26.1 kg toz karışım',
    ingredients: [
      { name: 'Kahve Kreması Tozu', amount: 25000, unit: 'g' },
      { name: 'Vanilin', amount: 100, unit: 'g' },
      { name: 'Peynir Altı Suyu Tozu', amount: 1000, unit: 'g' },
    ],
  },

  // GOLDEN LATTE (yeni reçete - sistemde olabilir veya eklenecek)
  {
    recipeName: 'Golden Latte Powder',
    recipeCode: 'GLP-001',
    description: 'Golden Latte için zerdeçallı toz karışım',
    expectedOutput: '~17.7 kg toz karışım',
    ingredients: [
      { name: 'Kahve Kreması Tozu', amount: 6000, unit: 'g', notes: 'Aslan "creamer" yazdı' },
      { name: 'Zerdeçal', amount: 3000, unit: 'g' },
      { name: 'Pudra Şekeri', amount: 5000, unit: 'g' },
      { name: 'Toz Şeker', amount: 3000, unit: 'g' },
      { name: 'Zencefil', amount: 500, unit: 'g' },
      { name: 'Karabiber', amount: 150, unit: 'g' },
      { name: 'Cha Tea Aroması', amount: 50, unit: 'g' },
      { name: 'Tarçın', amount: 1000, unit: 'g' },
      { name: 'Vanilya', amount: 25, unit: 'g' },
    ],
    notes: 'Bu reçete R-4 listesinde değil — yeni reçete olabilir, factory_recipes\'e eklenecek',
  },

];

// ═══════════════════════════════════════════════════════════════════
// İSTATİSTİK ÖZETİ
// ═══════════════════════════════════════════════════════════════════

export const STATS = {
  pilotRecipes: 4,         // Donut Base, Cinnaboom Classic, Cinnaboom Brownie, Cheesecake Base
  pilotRecipesMissing: 1,  // San Sebastian — Aslan göndermedi
  bonusRecipes: 5,         // Oreo, Chocolate Powder, Creambase, Bombty Latte, Golden Latte
  totalIngredients: 0,     // Migration sırasında hesaplanacak
};
