import { db } from "./db";
import { recipes, recipeCategories, recipeVersions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const CATEGORIES = [
  { slug: "classic_coffee", titleTr: "Classic Coffee", titleEn: "Classic Coffee", description: "Espresso bazlı klasik kahveler. Sıcak ve soğuk seçeneklerle.", iconName: "Coffee", colorHex: "#6F4E37", displayOrder: 1 },
  { slug: "special_latte", titleTr: "Special Latte", titleEn: "Special Latte", description: "DOSPRESSO imza latte çeşitleri. Her biri özel şurup ve toz kombinasyonlarıyla.", iconName: "Sparkles", colorHex: "#D4A574", displayOrder: 2 },
  { slug: "freshess", titleTr: "Freshess", titleEn: "Freshess", description: "Freshess konsantreleri ile hazırlanan serinletici içecekler. Iced Tea, Mojito, Italian Soda, Blend stilleri.", iconName: "Citrus", colorHex: "#7CB342", displayOrder: 3 },
  { slug: "frappe_shake", titleTr: "Frappe Shake", titleEn: "Frappe Shake", description: "Blender'da kırık buz ile hazırlanan kremalı buzlu içecekler.", iconName: "IceCream", colorHex: "#8D6E63", displayOrder: 4 },
  { slug: "frozen_yogurt", titleTr: "Frozen Yogurt Milkshakes", titleEn: "Frozen Yogurt Milkshakes", description: "Dondurulmuş yoğurt bazlı milkshake'ler.", iconName: "CupSoda", colorHex: "#E91E63", displayOrder: 5 },
  { slug: "gourmet_shakes", titleTr: "Gourmet Shakes", titleEn: "Gourmet Shakes", description: "Çikolata bar ve bisküvi bazlı premium shake'ler.", iconName: "Candy", colorHex: "#5D4037", displayOrder: 6 },
  { slug: "herbal_tea", titleTr: "Herbal Tea / Modum Çay", titleEn: "Herbal Tea / Modum Tea", description: "Özel harmanlı Modum çayları ve bitkisel çaylar.", iconName: "Leaf", colorHex: "#4CAF50", displayOrder: 7 },
  { slug: "donutlar", titleTr: "Donutlar", titleEn: "Donuts", description: "Merkezde geliştirilen gizli formüllerle hazırlanan DOSPRESSO donutları. Classic ve Gourmet.", iconName: "Circle", colorHex: "#FF7043", displayOrder: 8 },
  { slug: "tatlilar", titleTr: "Tatlılar", titleEn: "Desserts", description: "Özel formüllerle, doğal içeriklerle hazırlanan tatlılar.", iconName: "Cake", colorHex: "#AB47BC", displayOrder: 9 },
  { slug: "tuzlular", titleTr: "Tuzlular", titleEn: "Savoury Foods", description: "Sıcak kruvasanlar, doyurucu sandviçler ve pratik lezzetler.", iconName: "Sandwich", colorHex: "#FFA726", displayOrder: 10 },
];

interface RecipeData {
  code: string;
  nameTr: string;
  nameEn?: string;
  description?: string;
  coffeeType?: string;
  hasCoffee: boolean;
  hasMilk: boolean;
  difficulty: string;
  estimatedMinutes: number;
  displayOrder: number;
  tags?: string[];
  sizes?: {
    massivo?: { cupMl: number; steps: string[]; syrups?: Record<string, number>; powders?: Record<string, number>; garnish?: string[]; ice?: string };
    longDiva?: { cupMl: number; steps: string[]; syrups?: Record<string, number>; powders?: Record<string, number>; garnish?: string[]; ice?: string };
  };
  ingredients?: Array<{name: string; amount: string; unit?: string}>;
}

const CLASSIC_COFFEE_HOT: RecipeData[] = [
  { code: "ESP", nameTr: "Espresso", nameEn: "Espresso", coffeeType: "espresso", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 2, displayOrder: 1, tags: ["classic"],
    sizes: { massivo: { cupMl: 300, steps: ["Espresso bardağına Single Espresso çekilir.", "Servis edilir."] }, longDiva: { cupMl: 300, steps: ["Espresso bardağına Double Espresso çekilir.", "Servis edilir."] } } },
  { code: "TK", nameTr: "Türk Kahvesi", nameEn: "Turkish Coffee", coffeeType: "turkish", hasCoffee: true, hasMilk: false, difficulty: "medium", estimatedMinutes: 5, displayOrder: 2, tags: ["classic"],
    sizes: { massivo: { cupMl: 100, steps: ["Cezveye 1 fincan soğuk su eklenir.", "1 ölçek Türk kahvesi eklenir.", "Kısık ateşte köpürene kadar pişirilir.", "Fincan ile servis edilir."] } } },
  { code: "EM", nameTr: "Espresso Macchiato", nameEn: "Espresso Macchiato", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 2, displayOrder: 3, tags: ["classic"],
    sizes: { massivo: { cupMl: 300, steps: ["Espresso bardağına Single Espresso çekilir.", "Üzerine 1 kaşık süt köpüğü eklenir.", "Servis edilir."] } } },
  { code: "A_HOT", nameTr: "Americano", nameEn: "Americano", coffeeType: "espresso", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 4, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Bardak içerisine logo başlangıç çizgisine kadar sıcak su eklenir.", "Üzerine Double Espresso eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Bardak içerisine logo başlangıç çizgisine kadar sıcak su eklenir.", "Üzerine Double Espresso ve Single Espresso eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "FK", nameTr: "Filtre Kahve", nameEn: "Filter Coffee", coffeeType: "filter", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 5, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Bardak içerisine sunum çizgisine kadar filtre kahve eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Bardak içerisine sunum çizgisine kadar filtre kahve eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CO_HOT", nameTr: "Cortado", nameEn: "Cortado", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 3, displayOrder: 6, tags: ["classic"],
    sizes: {
      longDiva: { cupMl: 550, steps: ["Double Espresso eklenir.", "Üzerine 80 ml sıcak süt eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "L_HOT", nameTr: "Latte", nameEn: "Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 7, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Bardak içerisine Single Espresso eklenir.", "Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt ısıtılır.", "Isıtılan süt bardak içerisine ilave edilir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Bardak içerisine Double Espresso eklenir.", "Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt ısıtılır.", "Isıtılan süt bardak içerisine ilave edilir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "LM_HOT", nameTr: "Latte Macchiato", nameEn: "Latte Macchiato", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 8, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt ısıtılır ve bardağa dökülür.", "Üzerine yavaşça Single Espresso eklenir (katmanlı sunum).", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt ısıtılır ve bardağa dökülür.", "Üzerine yavaşça Double Espresso eklenir (katmanlı sunum).", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CAP_HOT", nameTr: "Cappuccino", nameEn: "Cappuccino", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 9, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Bardak içerisine Single Espresso eklenir.", "Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt köpürtülür (kalın köpük).", "Köpürtülen süt bardak içerisine ilave edilir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Bardak içerisine Double Espresso eklenir.", "Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt köpürtülür (kalın köpük).", "Köpürtülen süt bardak içerisine ilave edilir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "FW_HOT", nameTr: "Flat White", nameEn: "Flat White", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 10, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Bardak içerisine Double Espresso eklenir.", "Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt ısıtılır.", "Isıtılan süt bardak içerisine ilave edilir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Bardak içerisine Double + Single Espresso eklenir.", "Pitcher içerisine ilk çizgisine kadar süt eklenir.", "Süt ısıtılır.", "Isıtılan süt bardak içerisine ilave edilir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "BE_HOT", nameTr: "Bull Eye", nameEn: "Bull Eye", coffeeType: "espresso", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 11, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Single Espresso bardağa ilave edilir.", "Üzerine sunum çizgisine kadar filtre kahve eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Double Espresso bardağa ilave edilir.", "Üzerine sunum çizgisine kadar filtre kahve eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CB_HOT", nameTr: "Cold Brew", nameEn: "Cold Brew", coffeeType: "filter", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 2, displayOrder: 12, tags: ["classic", "signature"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Massivo PET bardağı boğum çizgisine kadar cold brew ile doldur.", "Sunum çizgisine kadar buz ekle.", "Strawless kapak ile servis et."] },
      longDiva: { cupMl: 650, steps: ["Long Diva bardağı boğuma kadar cold brew ile doldur.", "Sunum çizgisine kadar buz ekle.", "Strawless kapak."] }
    } },
  { code: "FCAP", nameTr: "Freddo Cappuccino", nameEn: "Freddo Cappuccino", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 13, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Double Espresso çekilir.", "Espresso, buz ve süt shaker'da karıştırılır.", "Bardağa dökülür.", "Üzerine soğuk süt köpüğü eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, steps: ["Double + Single Espresso çekilir.", "Buz ve süt ile shaker'da karıştırılır.", "Bardağa dökülür, soğuk süt köpüğü eklenir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "FESP", nameTr: "Freddo Espresso", nameEn: "Freddo Espresso", coffeeType: "espresso", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 14, tags: ["classic"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Double Espresso çekilir.", "Buz ile shaker'da karıştırılır.", "Bardağa dökülür.", "Sunum çizgisine kadar buz eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, steps: ["Double + Single Espresso çekilir.", "Buz ile shaker'da karıştırılır.", "Bardağa dökülür, buz eklenir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "CL_HOT", nameTr: "Creamy Latte", nameEn: "Creamy Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 15, tags: ["classic", "signature"],
    sizes: {
      massivo: { cupMl: 300, steps: ["Single Espresso bardak içerisine eklenir.", "Özel krema karışımı (100 ml krema + 400 ml laktozsuz süt) pitcher ilk çizgisine kadar eklenir.", "Krema karışımı ısıtılır.", "Isıtılan krema karışımı bardağa ilave edilir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, steps: ["Double Espresso bardak içerisine eklenir.", "Özel krema karışımı (100 ml krema + 400 ml laktozsuz süt) pitcher ilk çizgisine kadar eklenir.", "Krema karışımı ısıtılır.", "Isıtılan krema karışımı bardağa ilave edilir.", "Sıcak kapak ile servis edilir."] }
    } },
];

const CLASSIC_COFFEE_ICED: RecipeData[] = [
  { code: "IA", nameTr: "Iced Americano", nameEn: "Iced Americano", coffeeType: "espresso", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 16, tags: ["classic", "iced"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Bardağın boğum çizgisine kadar su eklenir.", "Sunum çizgisine kadar küp buz eklenir.", "Üzerine Double Espresso eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, steps: ["Bardağın boğum çizgisine kadar su eklenir.", "Sunum çizgisine kadar küp buz eklenir.", "Üzerine Double + Single Espresso eklenir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "IL", nameTr: "Iced Latte", nameEn: "Iced Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 3, displayOrder: 17, tags: ["classic", "iced"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Bardak boğum çizgisine kadar soğuk süt eklenir.", "Üzerine Single Espresso eklenir.", "Milk çizgisine kadar süt tamamlanır.", "Sunum çizgisine kadar küp buz eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, steps: ["Bardak boğum çizgisine kadar soğuk süt eklenir.", "Üzerine Double Espresso eklenir.", "Milk çizgisine kadar süt tamamlanır.", "Sunum çizgisine kadar küp buz eklenir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "IFW", nameTr: "Iced Flat White", nameEn: "Iced Flat White", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 3, displayOrder: 18, tags: ["classic", "iced"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Bardak boğum çizgisine kadar soğuk süt eklenir.", "Üzerine Double Espresso eklenir.", "Milk çizgisine kadar süt tamamlanır.", "Sunum çizgisine kadar küp buz eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, steps: ["Bardak boğum çizgisine kadar soğuk süt eklenir.", "Üzerine Double + Single Espresso eklenir.", "Milk çizgisine kadar süt tamamlanır.", "Sunum çizgisine kadar küp buz eklenir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "IBE", nameTr: "Iced Bull Eye", nameEn: "Iced Bull Eye", coffeeType: "espresso", hasCoffee: true, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 19, tags: ["classic", "iced"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Bardağa silme küp buz eklenir.", "Üzerine Single Espresso eklenir.", "Sunum çizgisine kadar soğuk filtre kahve eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, steps: ["Bardağa silme küp buz eklenir.", "Üzerine Double Espresso eklenir.", "Sunum çizgisine kadar soğuk filtre kahve eklenir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "ICL", nameTr: "Iced Creamy Latte", nameEn: "Iced Creamy Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 3, displayOrder: 20, tags: ["classic", "iced", "signature"],
    sizes: {
      massivo: { cupMl: 400, steps: ["Bardak boğum çizgisine kadar özel krema karışımı eklenir.", "Üzerine Single Espresso eklenir.", "Milk çizgisine kadar özel krema karışımı tamamlanır.", "Sunum çizgisine kadar küp buz eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, steps: ["Bardak boğum çizgisine kadar özel krema karışımı eklenir.", "Üzerine Single Espresso eklenir.", "Milk çizgisine kadar özel krema karışımı tamamlanır.", "Sunum çizgisine kadar küp buz eklenir.", "Strawless kapak ile servis edilir."] }
    } },
];

const SPECIAL_LATTE_HOT: RecipeData[] = [
  { code: "CM_HOT", nameTr: "Caramel Macchiato", nameEn: "Caramel Macchiato", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 1, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { vanilya: 2 }, steps: ["2 pump vanilya şurubu eklenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır.", "Isıtılan süt bardağa ilave edilir.", "Üzerine Single Espresso yavaşça eklenir (katmanlı).", "Karamel mazgal çizilir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { vanilya: 3 }, steps: ["3 pump vanilya şurubu eklenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır.", "Isıtılan süt bardağa ilave edilir.", "Üzerine Double Espresso yavaşça eklenir (katmanlı).", "Karamel mazgal çizilir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "VL_HOT", nameTr: "French Vanilla", nameEn: "French Vanilla", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 2, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { vanilya: 3 }, steps: ["3 pump vanilya şurubu eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır.", "Isıtılan süt bardağa ilave edilir.", "Üzerine 1,5 numarada krema eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { vanilya: 4 }, steps: ["4 pump vanilya şurubu eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır.", "Isıtılan süt bardağa ilave edilir.", "Üzerine 1,5 numarada krema eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "BL_HOT", nameTr: "Bombty Latte", nameEn: "Bombty Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 3, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { beyaz_cikolata: 1 }, powders: { bombty_latte: 10 }, steps: ["1 pump beyaz çikolata şurubu eklenir.", "1 ölçek Bombty latte tozu eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır ve bardağa ilave edilir.", "Kremasızdır.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { beyaz_cikolata: 1.5 }, powders: { bombty_latte: 20 }, steps: ["1,5 pump beyaz çikolata şurubu eklenir.", "2 ölçek Bombty latte tozu eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır ve bardağa ilave edilir.", "Kremasızdır.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CB_HOT_SL", nameTr: "Chocobianco", nameEn: "Chocobianco", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 4, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { beyaz_cikolata: 1 }, garnish: ["krema", "beyaz çikolata parçası"], steps: ["1 pump beyaz çikolata eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir.", "Sıcak süt bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve beyaz çikolata parçası eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { beyaz_cikolata: 1.5 }, garnish: ["krema", "beyaz çikolata parçası"], steps: ["1,5 pump beyaz çikolata eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ikinci çizgisine kadar süt eklenir.", "Sıcak süt bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve beyaz çikolata parçası eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CN_HOT", nameTr: "Choconero", nameEn: "Choconero", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 5, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { creamice_base: 1, findik: 1 }, powders: { cikolata: 15 }, garnish: ["krema", "siyah çikolata parçası"], steps: ["1 pump creamice base şurup eklenir.", "1 pump fındık şurup eklenir.", "1,5 ölçek çikolata tozu eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir ve ısıtılır.", "Üzerine 1,5 numarada krema ve siyah çikolata parçası eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { creamice_base: 2, findik: 1 }, powders: { cikolata: 25 }, garnish: ["krema", "siyah çikolata parçası"], steps: ["2 pump creamice base şurup eklenir.", "1 pump fındık şurup eklenir.", "2,5 ölçek çikolata tozu eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ikinci çizgisine kadar süt eklenir ve ısıtılır.", "Üzerine 1,5 numarada krema ve siyah çikolata parçası eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "PB_HOT", nameTr: "Power Brown", nameEn: "Power Brown", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 6, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { tarcin: 1, karamel: 1 }, powders: { bombty_latte: 10 }, steps: ["1 pump tarçın, 1 pump karamel şurup eklenir.", "1 ölçek Bombty Latte tozu eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır ve bardağa ilave edilir.", "Kremasızdır.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { tarcin: 1, karamel: 1 }, powders: { bombty_latte: 20 }, steps: ["1 pump tarçın, 1 pump karamel şurup eklenir.", "2 ölçek Bombty Latte tozu eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır ve bardağa ilave edilir.", "Kremasızdır.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CRH_HOT", nameTr: "Caramocha", nameEn: "Caramocha", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 7, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { karamel: 2 }, garnish: ["krema", "karamel drizzle"], steps: ["2 pump karamel şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve karamel hypnose eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { karamel: 3 }, garnish: ["krema", "karamel drizzle"], steps: ["3 pump karamel şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve karamel hypnose eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "TN_HOT", nameTr: "Toffee Nut Latte", nameEn: "Toffee Nut Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 8, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { findik: 1, karamel: 1 }, garnish: ["krema", "fındık parçaları"], steps: ["1 pump fındık, 1 pump karamel şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve fındık parçaları eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { findik: 1, karamel: 2 }, garnish: ["krema", "fındık parçaları"], steps: ["1 pump fındık, 2 pump karamel şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve fındık parçaları eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "PN_HOT", nameTr: "Pecan Nutty", nameEn: "Pecan Nutty", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 9, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { pecan: 2 }, garnish: ["krema", "pecan drizzle"], steps: ["2 pump Pecan şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır ve bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve Pecan şurup eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { pecan: 3 }, garnish: ["krema", "pecan drizzle"], steps: ["3 pump Pecan şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır ve bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve Pecan şurup eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "NN_HOT", nameTr: "Nut Nougat", nameEn: "Nut Nougat", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 10, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { beyaz_cikolata: 1, findik: 1 }, garnish: ["krema", "fındık mix"], steps: ["1 pump beyaz çikolata eklenir.", "1 pump fındık eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve fındık mix eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { beyaz_cikolata: 1.5, findik: 1 }, garnish: ["krema", "fındık mix"], steps: ["1,5 pump beyaz çikolata eklenir.", "1 pump fındık eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ikinci çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine 1,5 numarada krema ve fındık mix eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "HL_HOT", nameTr: "Hazelnut Latte", nameEn: "Hazelnut Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 11, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { findik: 2 }, steps: ["2 pump fındık şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { findik: 3 }, steps: ["3 pump fındık şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "DL_HOT", nameTr: "Dolce Latte", nameEn: "Dolce Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 12, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { karamel: 1, vanilya: 1 }, garnish: ["krema"], steps: ["1 pump karamel ve 1 pump vanilya şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { karamel: 2, vanilya: 1 }, garnish: ["krema"], steps: ["2 pump karamel ve 1 pump vanilya şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "PL_HOT", nameTr: "Pumpkin Latte", nameEn: "Pumpkin Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 13, tags: ["signature", "seasonal"],
    sizes: {
      massivo: { cupMl: 300, syrups: { pumpkin: 2 }, garnish: ["krema", "tarçın tozu"], steps: ["2 pump pumpkin şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema ve tarçın tozu eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { pumpkin: 3 }, garnish: ["krema", "tarçın tozu"], steps: ["3 pump pumpkin şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema ve tarçın tozu eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "POP_HOT", nameTr: "Popcorn Latte", nameEn: "Popcorn Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 14, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { popflix: 4 }, garnish: ["krema", "karamel drizzle", "popcorn"], steps: ["4 pump Popflix şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema, karamel drizzle ve popcorn eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { popflix: 5 }, garnish: ["krema", "karamel drizzle", "popcorn"], steps: ["5 pump Popflix şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema, karamel drizzle ve popcorn eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CHTY_HOT", nameTr: "Chaity Latte", nameEn: "Chaity Latte", coffeeType: "none", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 15, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { tarcin: 2 }, steps: ["2 pump tarçın şurup eklenir.", "Çay demliği ile chai çayı hazırlanır.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır.", "Chai çayı ve ısıtılan süt bardağa ilave edilir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { tarcin: 3 }, steps: ["3 pump tarçın şurup eklenir.", "Çay demliği ile chai çayı hazırlanır.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır.", "Chai çayı ve ısıtılan süt bardağa ilave edilir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "GL_HOT", nameTr: "Golden Latte", nameEn: "Golden Latte", coffeeType: "none", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 16, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, powders: { golden_latte: 10 }, syrups: { vanilya: 1 }, steps: ["1 ölçek golden latte tozu eklenir.", "50 ml sıcak su ile mikslenir.", "1 pump vanilya eklenir.", "200 ml ısıtılmış süt eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, powders: { golden_latte: 20 }, syrups: { vanilya: 2 }, steps: ["2 ölçek golden latte tozu eklenir.", "80 ml sıcak su ile mikslenir.", "2 pump vanilya eklenir.", "260 ml ısıtılmış süt eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "TOM_HOT", nameTr: "Marshmallow", nameEn: "Toasted Marshmallow", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 17, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { marshmallow: 3 }, garnish: ["krema", "marshmallow drizzle"], steps: ["3 pump marshmallow şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema ve marshmallow drizzle eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { marshmallow: 4 }, garnish: ["krema", "marshmallow drizzle"], steps: ["4 pump marshmallow şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema ve marshmallow drizzle eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "CHOP_HOT", nameTr: "Chocolatte+", nameEn: "Chocolatte+", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 18, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, syrups: { creamice_base: 1, findik: 1 }, powders: { cikolata: 15 }, garnish: ["krema", "kakao tozu"], steps: ["1 pump creamice base ve 1 pump fındık eklenir.", "1,5 ölçek çikolata tozu eklenir.", "Single Espresso eklenir ve mikslenir.", "Pitcher ilk çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema ve kakao tozu eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, syrups: { creamice_base: 2, findik: 1 }, powders: { cikolata: 25 }, garnish: ["krema", "kakao tozu"], steps: ["2 pump creamice base ve 1 pump fındık eklenir.", "2,5 ölçek çikolata tozu eklenir.", "Double Espresso eklenir ve mikslenir.", "Pitcher ikinci çizgisine kadar süt eklenir, ısıtılır, bardağa ilave edilir.", "Üzerine krema ve kakao tozu eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
  { code: "MC_HOT", nameTr: "Matcha Latte", nameEn: "Matcha Latte", coffeeType: "none", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 19, tags: ["signature"],
    sizes: {
      massivo: { cupMl: 300, powders: { matcha: 2.5 }, steps: ["1 ölçek (2,5 g) matcha tozu eklenir.", "30 ml arıtma suyu ve 30 ml sıcak su eklenir, mikslenir.", "1 pump istenen aroma eklenir.", "200 ml ısıtılmış süt eklenir.", "Sıcak kapak ile servis edilir."] },
      longDiva: { cupMl: 550, powders: { matcha: 2.5 }, steps: ["1 ölçek (2,5 g) matcha tozu eklenir.", "30 ml arıtma suyu ve 30 ml sıcak su eklenir, mikslenir.", "2 pump istenen aroma eklenir.", "260 ml ısıtılmış süt eklenir.", "Sıcak kapak ile servis edilir."] }
    } },
];

const SPECIAL_LATTE_ICED: RecipeData[] = [
  { code: "IBL", nameTr: "Iced Bombty Latte", nameEn: "Iced Bombty Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 20, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { beyaz_cikolata: 1 }, powders: { bombty_latte: 10 }, steps: ["1 pump beyaz çikolata şurubu bardağa eklenir.", "1 ölçek Bombty latte tozu eklenir.", "Üzerine Single Espresso eklenir ve mikslenir.", "Milk çizgisine kadar soğuk süt eklenir.", "Sunum çizgisine kadar küp buz eklenir.", "Kremasızdır.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { beyaz_cikolata: 1.5 }, powders: { bombty_latte: 20 }, steps: ["1,5 pump beyaz çikolata şurubu eklenir.", "2 ölçek Bombty latte tozu eklenir.", "Double Espresso eklenir ve mikslenir.", "Süt eklenir, buz ile tamamlanır.", "Kremasızdır.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "IPN", nameTr: "Iced Pecan Nutty", nameEn: "Iced Pecan Nutty", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 21, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { pecan: 2 }, garnish: ["krema", "pecan drizzle"], steps: ["2 pump Pecan şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt eklenir.", "Buz ile tamamlanır.", "Üzerine krema ve Pecan şurup eklenir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { pecan: 3 }, garnish: ["krema", "pecan drizzle"], steps: ["3 pump Pecan şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt eklenir, buz ile tamamlanır.", "Üzerine krema ve Pecan şurup eklenir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "IPB", nameTr: "Iced Power Brown", nameEn: "Iced Power Brown", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 22, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { tarcin: 1, karamel: 1 }, powders: { bombty_latte: 10 }, steps: ["1 pump tarçın, 1 pump karamel şurup eklenir.", "1 ölçek Bombty Latte tozu eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt eklenir, buz ile tamamlanır.", "Kremasızdır.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { tarcin: 1, karamel: 1 }, powders: { bombty_latte: 20 }, steps: ["1 pump tarçın, 1 pump karamel şurup eklenir.", "2 ölçek Bombty Latte tozu eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt eklenir, buz ile tamamlanır.", "Kremasızdır.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "ICB_SL", nameTr: "Iced Chocobianco", nameEn: "Iced Chocobianco", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 23, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { beyaz_cikolata: 1 }, garnish: ["krema", "beyaz çikolata parçası"], steps: ["1 pump beyaz çikolata eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt eklenir.", "Buz ile tamamlanır.", "Krema ve beyaz çikolata parçası eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { beyaz_cikolata: 1.5 }, garnish: ["krema", "beyaz çikolata parçası"], steps: ["1,5 pump beyaz çikolata eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve beyaz çikolata parçası eklenir.", "Bombe kapak ile servis edilir."] }
    } },
  { code: "ICN", nameTr: "Iced Choconero", nameEn: "Iced Choconero", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 24, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { creamice_base: 1, findik: 1 }, powders: { cikolata: 15 }, garnish: ["krema", "siyah çikolata parçası"], steps: ["1 pump creamice base ve 1 pump fındık eklenir.", "1,5 ölçek çikolata tozu eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve siyah çikolata parçası eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { creamice_base: 2, findik: 1 }, powders: { cikolata: 25 }, garnish: ["krema", "siyah çikolata parçası"], steps: ["2 pump creamice base ve 1 pump fındık eklenir.", "2,5 ölçek çikolata tozu eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve siyah çikolata parçası eklenir.", "Bombe kapak ile servis edilir."] }
    } },
  { code: "ICRH", nameTr: "Iced Caramocha", nameEn: "Iced Caramocha", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 25, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { karamel: 2 }, garnish: ["krema", "karamel drizzle"], steps: ["2 pump karamel şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve karamel drizzle eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { karamel: 3 }, garnish: ["krema", "karamel drizzle"], steps: ["3 pump karamel şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve karamel drizzle eklenir.", "Bombe kapak ile servis edilir."] }
    } },
  { code: "IVL", nameTr: "Iced French Vanilla", nameEn: "Iced French Vanilla", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 26, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { vanilya: 3 }, garnish: ["krema"], steps: ["3 pump vanilya şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { vanilya: 4 }, garnish: ["krema"], steps: ["4 pump vanilya şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema eklenir.", "Bombe kapak ile servis edilir."] }
    } },
  { code: "ICM", nameTr: "Iced Caramel Macchiato", nameEn: "Iced Caramel Macchiato", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 27, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { vanilya: 2 }, garnish: ["karamel mazgal"], steps: ["2 pump vanilya şurup eklenir.", "Soğuk süt eklenir.", "Buz eklenir.", "Üzerine Single Espresso yavaşça eklenir (katmanlı).", "Karamel mazgal çizilir.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { vanilya: 3 }, garnish: ["karamel mazgal"], steps: ["3 pump vanilya şurup eklenir.", "Soğuk süt eklenir.", "Buz eklenir.", "Üzerine Double Espresso yavaşça eklenir (katmanlı).", "Karamel mazgal çizilir.", "Strawless kapak ile servis edilir."] }
    } },
  { code: "ITN", nameTr: "Iced Toffee Nut", nameEn: "Iced Toffee Nut", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 28, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { findik: 1, karamel: 1 }, garnish: ["krema", "fındık parçaları"], steps: ["1 pump fındık, 1 pump karamel eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve fındık parçaları eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { findik: 1, karamel: 2 }, garnish: ["krema", "fındık parçaları"], steps: ["1 pump fındık, 2 pump karamel eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve fındık parçaları eklenir.", "Bombe kapak ile servis edilir."] }
    } },
  { code: "INN", nameTr: "Iced Nut Nougat", nameEn: "Iced Nut Nougat", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 29, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, syrups: { beyaz_cikolata: 1, findik: 1 }, garnish: ["krema", "fındık mix"], steps: ["1 pump beyaz çikolata, 1 pump fındık eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve fındık mix eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { beyaz_cikolata: 1.5, findik: 1 }, garnish: ["krema", "fındık mix"], steps: ["1,5 pump beyaz çikolata, 1 pump fındık eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve fındık mix eklenir.", "Bombe kapak ile servis edilir."] }
    } },
  { code: "IPL", nameTr: "Iced Pumpkin Latte", nameEn: "Iced Pumpkin Latte", coffeeType: "espresso", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 30, tags: ["signature", "iced", "seasonal"],
    sizes: {
      massivo: { cupMl: 400, syrups: { pumpkin: 2 }, garnish: ["krema", "tarçın tozu"], steps: ["2 pump pumpkin şurup eklenir.", "Single Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve tarçın tozu eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { pumpkin: 3 }, garnish: ["krema", "tarçın tozu"], steps: ["3 pump pumpkin şurup eklenir.", "Double Espresso eklenir ve mikslenir.", "Soğuk süt ve buz eklenir.", "Krema ve tarçın tozu eklenir.", "Bombe kapak ile servis edilir."] }
    } },
  { code: "IMC", nameTr: "Iced Matcha Latte", nameEn: "Iced Matcha Latte", coffeeType: "none", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 4, displayOrder: 31, tags: ["signature", "iced"],
    sizes: {
      massivo: { cupMl: 400, powders: { matcha: 2.5 }, steps: ["1 ölçek matcha tozu + 30 ml sıcak su + 30 ml arıtma suyu, mikslenir.", "1 pump istenen aroma eklenir.", "Soğuk süt eklenir.", "Buz ile tamamlanır.", "Strawless kapak ile servis edilir."] },
      longDiva: { cupMl: 650, powders: { matcha: 2.5 }, steps: ["1 ölçek matcha tozu + 30 ml sıcak su + 30 ml arıtma suyu, mikslenir.", "2 pump istenen aroma eklenir.", "Soğuk süt eklenir.", "Buz ile tamamlanır.", "Strawless kapak ile servis edilir."] }
    } },
];

const FRESHESS_RECIPES: RecipeData[] = [
  { code: "FR_HIB", nameTr: "Hibiscus", nameEn: "Hibiscus Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 1, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa 1/4 oranında küp buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Hibiscus Freshess konsantresi ekle.", "Karıştır ve bardağa dök.", "Buz ile tamamla.", "Limon dilimi ile süsle.", "Düz pipetli kapak ile servis et."] },
      longDiva: { cupMl: 650, steps: ["Long Diva bardağa 1/3 oranında buz ekle.", "320 ml soğutulmuş siyah çay hazırla.", "5 pump Hibiscus Freshess konsantresi ekle.", "Karıştır, bardağa dök, buz ile tamamla.", "Düz pipetli kapak ile servis et."] } } },
  { code: "FR_PC", nameTr: "Şeftali", nameEn: "Peach Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 2, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Şeftali Freshess konsantresi ekle.", "Karıştır ve bardağa dök.", "Düz pipetli kapak ile servis et."] },
      longDiva: { cupMl: 650, steps: ["Bardağa buz ekle.", "320 ml soğutulmuş siyah çay hazırla.", "5 pump Şeftali Freshess konsantresi ekle.", "Karıştır, dök, düz pipetli kapak."] } } },
  { code: "FR_BB", nameTr: "Blueberry", nameEn: "Blueberry Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 3, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Blueberry Freshess konsantresi ekle.", "Karıştır ve bardağa dök.", "Düz pipetli kapak ile servis et."] },
      longDiva: { cupMl: 650, steps: ["320 ml siyah çay + 5 pump Blueberry.", "Buz ile tamamla, servis et."] } } },
  { code: "FR_PB", nameTr: "Pinkberry", nameEn: "Pinkberry Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 4, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Pinkberry Freshess konsantresi ekle.", "Karıştır ve dök.", "Düz pipetli kapak."] },
      longDiva: { cupMl: 650, steps: ["320 ml siyah çay + 5 pump Pinkberry.", "Buz ile tamamla, servis et."] } } },
  { code: "FR_LIME", nameTr: "Freshess Lime", nameEn: "Lime Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 5, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Lime Freshess konsantresi ekle.", "Karıştır ve dök, lime dilimi ile süsle.", "Düz pipetli kapak."] },
      longDiva: { cupMl: 650, steps: ["320 ml siyah çay + 5 pump Lime.", "Buz ile tamamla, servis et."] } } },
  { code: "FR_AV", nameTr: "Aloe Vera", nameEn: "Aloe Vera Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 6, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Aloe Vera Freshess konsantresi ekle.", "Karıştır ve dök.", "Düz pipetli kapak."] },
      longDiva: { cupMl: 650, steps: ["320 ml siyah çay + 5 pump Aloe Vera.", "Buz ile tamamla, servis et."] } } },
  { code: "FR_NS", nameTr: "Narita Sakura", nameEn: "Narita Sakura Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 7, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Narita Sakura Freshess konsantresi ekle.", "Karıştır ve dök.", "Düz pipetli kapak."] },
      longDiva: { cupMl: 650, steps: ["320 ml siyah çay + 5 pump Narita Sakura.", "Buz ile tamamla, servis et."] } } },
  { code: "FR_MG", nameTr: "Mango / Maracuja", nameEn: "Mango Maracuja Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 8, tags: ["freshess"],
    sizes: { massivo: { cupMl: 400, steps: ["Bardağa buz ekle.", "220 ml soğutulmuş siyah çay hazırla.", "3 pump Mango Freshess konsantresi ekle.", "Karıştır ve dök.", "Düz pipetli kapak."] },
      longDiva: { cupMl: 650, steps: ["320 ml siyah çay + 5 pump Mango.", "Buz ile tamamla, servis et."] } } },
  { code: "FR_MP", nameTr: "Multipower", nameEn: "Multipower Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 9, tags: ["freshess", "energy"] },
  { code: "FR_PK", nameTr: "Pumpkin", nameEn: "Pumpkin Freshess", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 10, tags: ["freshess", "seasonal"] },
  { code: "FR_ESP", nameTr: "Fresh Espresso", nameEn: "Fresh Espresso", hasCoffee: true, hasMilk: false, difficulty: "medium", estimatedMinutes: 4, displayOrder: 11, tags: ["freshess"] },
  { code: "FR_365", nameTr: "365 Volt", nameEn: "365 Volt", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 12, tags: ["freshess", "energy"] },
  { code: "FR_CN", nameTr: "Cola Natura", nameEn: "Cola Natura", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 2, displayOrder: 13, tags: ["freshess"] },
];

const FROZEN_YOGURT_RECIPES: RecipeData[] = [
  { code: "FY_VAN", nameTr: "Vanilemon", nameEn: "Vanilemon", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 1, tags: ["frozen_yogurt"],
    sizes: { massivo: { cupMl: 400, steps: ["Dondurulmuş yoğurt bardağa eklenir.", "Limon ve vanilya aroması eklenir.", "Blender'da pürüzsüz kıvama kadar çekilir.", "Bardağa dökülür.", "Bombe kapak ile servis edilir."] } } },
  { code: "FY_MR", nameTr: "Moulin Rouge", nameEn: "Moulin Rouge", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 2, tags: ["frozen_yogurt"],
    sizes: { massivo: { cupMl: 400, steps: ["Dondurulmuş yoğurt bardağa eklenir.", "Çilek ve frambuaz aroması eklenir.", "Blender'da pürüzsüz kıvama kadar çekilir.", "Bardağa dökülür.", "Bombe kapak ile servis edilir."] } } },
  { code: "FY_CJ", nameTr: "Captain Jack", nameEn: "Captain Jack", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 3, tags: ["frozen_yogurt"],
    sizes: { massivo: { cupMl: 400, steps: ["Dondurulmuş yoğurt bardağa eklenir.", "Yaban mersini aroması eklenir.", "Blender'da pürüzsüz kıvama kadar çekilir.", "Bardağa dökülür.", "Bombe kapak ile servis edilir."] } } },
  { code: "FY_JJ", nameTr: "Jimmy Jambo", nameEn: "Jimmy Jambo", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 4, tags: ["frozen_yogurt"],
    sizes: { massivo: { cupMl: 400, steps: ["Dondurulmuş yoğurt bardağa eklenir.", "Hibiscus ve şeftali aroması eklenir.", "Blender'da çekilir.", "Bardağa dökülür.", "Bombe kapak ile servis edilir."] } } },
  { code: "FY_TM", nameTr: "Tango Mango", nameEn: "Tango Mango", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 5, tags: ["frozen_yogurt"],
    sizes: { massivo: { cupMl: 400, steps: ["Dondurulmuş yoğurt bardağa eklenir.", "Mango ve marakuya aroması eklenir.", "Blender'da çekilir.", "Bardağa dökülür.", "Bombe kapak ile servis edilir."] } } },
  { code: "FY_BM", nameTr: "Bloody Mary", nameEn: "Bloody Mary", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 6, tags: ["frozen_yogurt"] },
];

const FRAPPE_SHAKE_RECIPES: RecipeData[] = [
  { code: "FP_VL", nameTr: "French Vanilla Frappe", nameEn: "French Vanilla Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 1, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, syrups: { vanilya: 3 }, garnish: ["krema"], steps: ["Süt + 3 pump vanilya + Single Espresso blender kabına eklenir.", "1 bardak buz eklenir.", "Blender'da kremalı kıvama kadar çekilir.", "Bardağa dökülür, krema eklenir.", "Bombe kapak ile servis edilir."] },
      longDiva: { cupMl: 650, syrups: { vanilya: 4 }, garnish: ["krema"], steps: ["Süt + 4 pump vanilya + Double Espresso blender kabına.", "Buz eklenir, blend edilir.", "Krema topping, bombe kapak."] } } },
  { code: "FP_BL", nameTr: "Bombty Frappe", nameEn: "Bombty Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 2, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, powders: { bombty_latte: 10 }, syrups: { beyaz_cikolata: 1 }, steps: ["Süt + 1 scoop Bombty tozu + 1 pump beyaz çikolata + Single Espresso.", "Buz eklenir, blend edilir.", "Kremasız, strawless kapak."] },
      longDiva: { cupMl: 650, powders: { bombty_latte: 20 }, syrups: { beyaz_cikolata: 1.5 }, steps: ["Daha fazla süt + 2 scoop Bombty + Double Espresso.", "Blend, kremasız servis."] } } },
  { code: "FP_CB", nameTr: "Chocobianco Frappe", nameEn: "Chocobianco Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 3, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, syrups: { beyaz_cikolata: 1 }, garnish: ["krema", "beyaz çikolata parçası"], steps: ["Süt + beyaz çikolata + Single Espresso.", "Buz, blend.", "Krema + beyaz çikolata parçası.", "Bombe kapak."] } } },
  { code: "FP_CN", nameTr: "Choconero Frappe", nameEn: "Choconero Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 4, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, syrups: { creamice_base: 1, findik: 1 }, powders: { cikolata: 15 }, garnish: ["krema", "siyah çikolata parçası"], steps: ["Süt + creamice base + fındık + çikolata tozu + Single Espresso.", "Buz, blend.", "Krema + siyah çikolata parçası.", "Bombe kapak."] } } },
  { code: "FP_PB", nameTr: "Power Brown Frappe", nameEn: "Power Brown Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 5, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, syrups: { tarcin: 1, karamel: 1 }, powders: { bombty_latte: 10 }, steps: ["Süt + tarçın + karamel + Bombty tozu + Single Espresso.", "Buz, blend.", "Kremasız, strawless kapak."] } } },
  { code: "FP_CRH", nameTr: "Caramocha Frappe", nameEn: "Caramocha Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 6, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, syrups: { karamel: 3 }, garnish: ["krema", "karamel hypnose"], steps: ["Süt + 3 pump karamel + Single Espresso.", "Buz, blend.", "Krema + karamel hypnose.", "Bombe kapak."] } } },
  { code: "FP_TN", nameTr: "Toffee Nut Frappe", nameEn: "Toffee Nut Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 7, tags: ["frappe"] },
  { code: "FP_NN", nameTr: "Nut Nougat Frappe", nameEn: "Nut Nougat Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 8, tags: ["frappe"] },
  { code: "FP_HZ", nameTr: "Hazelnut Frappe", nameEn: "Hazelnut Frappe", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 5, displayOrder: 9, tags: ["frappe"] },
  { code: "FP_PK", nameTr: "Pumpkin Frappe", nameEn: "Pumpkin Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 10, tags: ["frappe", "seasonal"] },
  { code: "FP_EC", nameTr: "Espresso Cream", nameEn: "Espresso Cream Frappe", hasCoffee: true, hasMilk: true, difficulty: "easy", estimatedMinutes: 5, displayOrder: 11, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, steps: ["Süt bardağın alt boğumuna kadar eklenir, blender kabına boşaltılır.", "Double Espresso eklenir.", "Bardağı silme buzla doldurup blender'a aktarılır.", "Kremalı kıvama kadar blend edilir.", "Bardağa dökülür, strawless kapak."] },
      longDiva: { cupMl: 650, steps: ["Daha fazla süt + Double + Single Espresso.", "Buz, blend, servis."] } } },
  { code: "FP_GL", nameTr: "Golden Frappe", nameEn: "Golden Frappe", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 12, tags: ["frappe"] },
  { code: "FP_MM", nameTr: "Marshmallow Frappe", nameEn: "Marshmallow Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 13, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, syrups: { marshmallow: 4 }, garnish: ["krema", "marshmallow drizzle"], steps: ["Süt + 4 pump marshmallow şurubu.", "Buz, blend.", "Krema + marshmallow drizzle.", "Bombe kapak."] } } },
  { code: "FP_POP", nameTr: "Popcorn Frappe", nameEn: "Popcorn Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 14, tags: ["frappe"],
    sizes: { massivo: { cupMl: 400, syrups: { popflix: 4 }, garnish: ["krema", "karamel drizzle", "popcorn"], steps: ["Süt + 4 pump Popflix + 3 adet patlamış mısır.", "Buz, blend.", "Krema + karamel hypnose + popcorn topping.", "Bombe kapak."] } } },
  { code: "FP_CHP", nameTr: "Chocolatte+ Frappe", nameEn: "Chocolatte+ Frappe", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 15, tags: ["frappe"] },
];

const GOURMET_SHAKE_RECIPES: RecipeData[] = [
  { code: "GS_ORE", nameTr: "Oreoloji", nameEn: "Oreoloji", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 1, tags: ["gourmet"],
    sizes: { massivo: { cupMl: 400, steps: ["Süt bardağa eklenir.", "Oreo bisküvi parçalanarak eklenir.", "Buz eklenir, blender'da çekilir.", "Bardağa dökülür.", "Üzerine krema ve Oreo parçası eklenir.", "Bombe kapak ile servis edilir."] } } },
  { code: "GS_TWX", nameTr: "Twix Mix", nameEn: "Twix Mix", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 2, tags: ["gourmet"] },
  { code: "GS_MRS", nameTr: "Mars Attack", nameEn: "Mars Attack", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 3, tags: ["gourmet"] },
  { code: "GS_KIT", nameTr: "Kitkat Break", nameEn: "Kitkat Break", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 4, tags: ["gourmet"] },
  { code: "GS_BNT", nameTr: "Bounty Island", nameEn: "Bounty Island", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 5, tags: ["gourmet"] },
  { code: "GS_SNK", nameTr: "Snickers", nameEn: "Snickers", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 6, tags: ["gourmet"] },
  { code: "GS_ORT", nameTr: "Orient Frappe", nameEn: "Orient Frappe", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 7, tags: ["gourmet"] },
  { code: "GS_VAN", nameTr: "Vanilemon Shake", nameEn: "Vanilemon Shake", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 4, displayOrder: 8, tags: ["gourmet"] },
  { code: "GS_SUR", nameTr: "Surprise Shake", nameEn: "Surprise Shake", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 9, tags: ["gourmet"] },
  { code: "GS_DL", nameTr: "Dolce Latte Shake", nameEn: "Dolce Latte Shake", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 10, tags: ["gourmet"] },
  { code: "GS_PN", nameTr: "Pecan Nutty Shake", nameEn: "Pecan Nutty Shake", hasCoffee: true, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 11, tags: ["gourmet"] },
  { code: "GS_MC", nameTr: "Matcha Frappe", nameEn: "Matcha Frappe", hasCoffee: false, hasMilk: true, difficulty: "medium", estimatedMinutes: 5, displayOrder: 12, tags: ["gourmet"] },
];

const DONUT_RECIPES: RecipeData[] = [
  { code: "DN_CLS", nameTr: "Classic Donut", nameEn: "Classic Donut", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 1, tags: ["donut", "classic"], description: "Kaplama: Dekstroz Şekeri. Dolgu: Sade." },
  { code: "DN_ALM", nameTr: "Almond", nameEn: "Almond", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 2, tags: ["donut", "gourmet"], description: "Kaplama: Sütlü Çikolata, Badem. Dolgu: Boston Creme." },
  { code: "DN_BW", nameTr: "Black & White", nameEn: "Black & White", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 3, tags: ["donut"], description: "Kaplama: Sütlü Çikolata, Beyaz Çikolata. Dolgu: Boston Creme." },
  { code: "DN_BJ", nameTr: "Black Jack", nameEn: "Black Jack", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 4, tags: ["donut", "gourmet"], description: "Kaplama: Bitter Çikolata, Çikolatalı Şeker. Dolgu: Pralin Çikolata." },
  { code: "DN_CRM", nameTr: "Caramella", nameEn: "Caramella", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 5, tags: ["donut", "gourmet"], description: "Kaplama: Beyaz Çikolata, Esmer Şeker. Dolgu: Karamel." },
  { code: "DN_CHK", nameTr: "Cheesecake", nameEn: "Cheesecake Donut", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 6, tags: ["donut", "gourmet"], description: "Kaplama: Beyaz Çikolata, Bisküvi, Frambuaz Sos. Dolgu: Taze Peynir, Labne, Krema." },
  { code: "DN_CHC", nameTr: "Chococino", nameEn: "Chococino", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 7, tags: ["donut"], description: "Kaplama: Beyaz Çikolata, Kahve, Çikolatalı Şeker. Dolgu: Pralin Çikolata." },
  { code: "DN_CB", nameTr: "Cocoblack", nameEn: "Cocoblack", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 8, tags: ["donut"], description: "Kaplama: Sütlü Çikolata, Hindistan Cevizi. Dolgu: Boston Creme." },
  { code: "DN_CM", nameTr: "Cookie Monster", nameEn: "Cookie Monster", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 9, tags: ["donut"], description: "Kaplama: Beyaz Çikolata, Hindistan Cevizi. Dolgu: Boston Creme." },
  { code: "DN_EM", nameTr: "Elmo Monster", nameEn: "Elmo Monster", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 10, tags: ["donut"], description: "Kaplama: Beyaz Çikolata, Hindistan Cevizi. Dolgu: Boston Creme." },
  { code: "DN_GM", nameTr: "Green Mile", nameEn: "Green Mile", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 11, tags: ["donut"], description: "Kaplama: Beyaz Çikolata, Antep Fıstığı. Dolgu: Karamel." },
  { code: "DN_HF", nameTr: "Happy Face", nameEn: "Happy Face", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 12, tags: ["donut"], description: "Kaplama: Sütlü Çikolata, Renkli Şeker. Dolgu: Pralin Çikolata." },
  { code: "DN_HYP", nameTr: "Hypnos", nameEn: "Hypnos", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 13, tags: ["donut"], description: "Kaplama: Beyaz Çikolata, Tarçın, Esmer Şeker. Dolgu: Karamel." },
  { code: "DN_KRD", nameTr: "Kardeshian", nameEn: "Kardeshian", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 14, tags: ["donut"], description: "Kaplama: Siyah Belçika Çikolata, Frambuaz Şeker. Dolgu: Frambuaz." },
  { code: "DN_MAC", nameTr: "Macchiato", nameEn: "Macchiato Donut", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 15, tags: ["donut"], description: "Kaplama: Beyaz Çikolata, Kahve. Dolgu: Boston Creme." },
  { code: "DN_NC", nameTr: "Nut Corner", nameEn: "Nut Corner", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 16, tags: ["donut", "gourmet"], description: "Kaplama: Sütlü Çikolata, Fındık Parçaları. Dolgu: Karamel." },
  { code: "DN_NW", nameTr: "Nut on White", nameEn: "Nut on White", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 17, tags: ["donut", "gourmet"], description: "Kaplama: Beyaz Çikolata, Fındık Parçaları. Dolgu: Boston Creme." },
  { code: "DN_ORE", nameTr: "Oreoloji", nameEn: "Oreoloji Donut", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 18, tags: ["donut", "gourmet"], description: "Kaplama: Beyaz Çikolata, Oreo Bisküvi. Dolgu: Boston Creme." },
  { code: "DN_PL", nameTr: "Pink Lady", nameEn: "Pink Lady", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 19, tags: ["donut"], description: "Kaplama: Pembe Belçika Çikolata, Renkli Şeker. Dolgu: Frambuaz." },
  { code: "DN_RB", nameTr: "Rainbow", nameEn: "Rainbow", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 20, tags: ["donut"], description: "Kaplama: Sütlü Çikolata, Renkli Şeker. Dolgu: Karamel." },
  { code: "DN_RH", nameTr: "Rihanna", nameEn: "Rihanna", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 21, tags: ["donut", "gourmet"], description: "Kaplama: Sütlü Çikolata, Fındık Parçaları. Dolgu: Boston Creme." },
  { code: "DN_SW", nameTr: "Snow White", nameEn: "Snow White", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 22, tags: ["donut"], description: "Kaplama: Beyaz Belçika Çikolata, Renkli Şeker. Dolgu: Frambuaz." },
  { code: "DN_UN", nameTr: "Unicorn", nameEn: "Unicorn", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 1, displayOrder: 23, tags: ["donut"], description: "Kaplama: Beyaz Çikolata, Frambuaz. Dolgu: Vişne." },
];

const TATLI_RECIPES: RecipeData[] = [
  { code: "TT_EVC", nameTr: "Everest Cake", nameEn: "Everest Cake", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 1, tags: ["tatli", "cake"], description: "Karamel parçacıklı kek." },
  { code: "TT_BNC", nameTr: "Bunny Cake", nameEn: "Bunny Cake", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 2, tags: ["tatli", "cake"], description: "Havuçlu, tarçınlı kek." },
  { code: "TT_CIN", nameTr: "Cinnaboom", nameEn: "Cinnaboom", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 3, tags: ["tatli"], description: "Vanilya, tarçın, tereyağı." },
  { code: "TT_BRW", nameTr: "Brownie", nameEn: "Brownie", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 4, tags: ["tatli"], description: "Bitter ve sütlü çikolatalı brownie." },
  { code: "TT_GBR", nameTr: "Gold Brownie", nameEn: "Gold Brownie", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 5, tags: ["tatli"], description: "Beyaz çikolatalı brownie." },
  { code: "TT_NYC", nameTr: "New York Cookie", nameEn: "New York Cookie", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 6, tags: ["tatli", "cookie"], description: "Bitter, sütlü, beyaz çikolatalı kurabiye." },
  { code: "TT_CRC", nameTr: "Crumbel Cookie", nameEn: "Crumbel Cookie", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 7, tags: ["tatli", "cookie"], description: "Yulaf, beyaz çikolata, tereyağlı kurabiye." },
  { code: "TT_CHL", nameTr: "Cheesecake Lemon", nameEn: "Cheesecake Lemon", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 8, tags: ["tatli", "cheesecake"], description: "Limonlu cheesecake." },
  { code: "TT_CHR", nameTr: "Cheesecake Raspberry", nameEn: "Cheesecake Raspberry", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 9, tags: ["tatli", "cheesecake"], description: "Frambuazlı cheesecake." },
  { code: "TT_CHO", nameTr: "Cheesecake Oreo", nameEn: "Cheesecake Oreo", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 10, tags: ["tatli", "cheesecake"], description: "Oreo bisküvili cheesecake." },
  { code: "TT_CHL2", nameTr: "Cheesecake Lotus", nameEn: "Cheesecake Lotus", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 11, tags: ["tatli", "cheesecake"], description: "Lotus bisküvili cheesecake." },
  { code: "TT_SS", nameTr: "San Sebastian", nameEn: "San Sebastian Cheesecake", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 1, displayOrder: 12, tags: ["tatli", "cheesecake"], description: "Kremalı cheesecake." },
];

const TUZLU_RECIPES: RecipeData[] = [
  { code: "TZ_WHC", nameTr: "Wrapitos Honey Chilli", nameEn: "Wrapitos Honey Chilli", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 1, tags: ["tuzlu", "wrapitos"], description: "Cheddar, Mozarella, ballı acı soslu tavuk." },
  { code: "TZ_WBQ", nameTr: "Wrapitos BBQ Chicken", nameEn: "Wrapitos BBQ Chicken", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 2, tags: ["tuzlu", "wrapitos"], description: "Cheddar, Mozarella, BBQ soslu tavuk." },
  { code: "TZ_MHF", nameTr: "Hi Five Cheese Mamabon", nameEn: "Hi Five Cheese Mamabon", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 3, displayOrder: 3, tags: ["tuzlu", "mamabon"], description: "Haşhaşlı BAGEL. Cheddar, Mozarella, Krem Peynir, Melt Kaşar, Çeçil Peynir." },
  { code: "TZ_MTX", nameTr: "Texas BBQ Mamabon", nameEn: "Texas BBQ Mamabon", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 4, tags: ["tuzlu", "mamabon"], description: "Susamlı BAGEL. Köfte: Piliç Eti, Galeta Unu, Maydanoz, Domates Salçası, Baharat Karışımı, Çıtır Soğan, BBQ Sosu." },
  { code: "TZ_CIA", nameTr: "Cheese Artisan Ciabatta", nameEn: "Cheese Artisan Ciabatta", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 3, displayOrder: 5, tags: ["tuzlu", "ciabatta"], description: "Krem peynir, Kaşar, Chedar, Çeçil, Köz biber, Romesco, Zeytin ezmesi." },
  { code: "TZ_CRP", nameTr: "Red Prime Ciabatta", nameEn: "Red Prime Ciabatta", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 3, displayOrder: 6, tags: ["tuzlu", "ciabatta"], description: "Hindi Füme, Chedar, Pesto Sosu, Romesco Sos, Zeytin Dilim." },
  { code: "TZ_CMC", nameTr: "Master Cut Ciabatta", nameEn: "Master Cut Ciabatta", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 3, displayOrder: 7, tags: ["tuzlu", "ciabatta"], description: "Tavuk Jambon, Hindi Jambon, Krem Peynir, Kaşar, Chedar, Çeçil, Zeytin Dilim." },
  { code: "TZ_CRS", nameTr: "Croissant", nameEn: "Croissant", hasCoffee: false, hasMilk: true, difficulty: "easy", estimatedMinutes: 2, displayOrder: 8, tags: ["tuzlu", "bakery"], description: "Tereyağlı croissant." },
];

const HERBAL_TEA_RECIPES: RecipeData[] = [
  { code: "HT_IQ", nameTr: "IQ Tea", nameEn: "IQ Tea", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 4, displayOrder: 1, tags: ["herbal_tea", "modum"] },
  { code: "HT_BAL", nameTr: "Balance Tea", nameEn: "Balance Tea", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 4, displayOrder: 2, tags: ["herbal_tea", "modum"] },
  { code: "HT_MND", nameTr: "Mandala Tea", nameEn: "Mandala Tea", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 4, displayOrder: 3, tags: ["herbal_tea", "modum"] },
  { code: "HT_TTX", nameTr: "Teatox Tea", nameEn: "Teatox Tea", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 4, displayOrder: 4, tags: ["herbal_tea", "modum"] },
  { code: "HT_DYU", nameTr: "Do & You Tea", nameEn: "Do & You Tea", hasCoffee: false, hasMilk: false, difficulty: "easy", estimatedMinutes: 4, displayOrder: 5, tags: ["herbal_tea", "modum"] },
];

export async function seedDospressoRecipes() {
  console.log("🍵 Starting DOSPRESSO recipe seed...");

  try {
    const existingCats = await db.select().from(recipeCategories);
    const hasCorrectCategories = existingCats.some(c => c.slug === "classic_coffee") && existingCats.some(c => c.slug === "special_latte");
    if (hasCorrectCategories && existingCats.length === 10) {
      const existingRecipes = await db.select({ id: recipes.id }).from(recipes);
      if (existingRecipes.length >= 100) {
        console.log(`✅ DOSPRESSO recipes already seeded (${existingRecipes.length} recipes in ${existingCats.length} categories). Skipping.`);
        return;
      }
    }

    console.log("🗑️ Cleaning old recipe data...");
    await db.delete(recipeVersions);
    await db.delete(recipes);
    await db.delete(recipeCategories);
    console.log("✅ Old data cleaned");

    console.log("📁 Creating categories...");
    const categoryMap: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      const [inserted] = await db.insert(recipeCategories).values(cat).returning();
      categoryMap[cat.slug] = inserted.id;
      console.log(`  ✅ ${cat.titleTr} (id: ${inserted.id})`);
    }

    const allRecipeGroups: Array<{ categorySlug: string; recipes: RecipeData[] }> = [
      { categorySlug: "classic_coffee", recipes: [...CLASSIC_COFFEE_HOT, ...CLASSIC_COFFEE_ICED] },
      { categorySlug: "special_latte", recipes: [...SPECIAL_LATTE_HOT, ...SPECIAL_LATTE_ICED] },
      { categorySlug: "freshess", recipes: FRESHESS_RECIPES },
      { categorySlug: "frappe_shake", recipes: FRAPPE_SHAKE_RECIPES },
      { categorySlug: "frozen_yogurt", recipes: FROZEN_YOGURT_RECIPES },
      { categorySlug: "gourmet_shakes", recipes: GOURMET_SHAKE_RECIPES },
      { categorySlug: "herbal_tea", recipes: HERBAL_TEA_RECIPES },
      { categorySlug: "donutlar", recipes: DONUT_RECIPES },
      { categorySlug: "tatlilar", recipes: TATLI_RECIPES },
      { categorySlug: "tuzlular", recipes: TUZLU_RECIPES },
    ];

    let totalInserted = 0;

    for (const group of allRecipeGroups) {
      const categoryId = categoryMap[group.categorySlug];
      console.log(`\n📋 Seeding ${group.categorySlug} (${group.recipes.length} recipes)...`);

      for (const r of group.recipes) {
        try {
          const [recipe] = await db.insert(recipes).values({
            categoryId,
            code: r.code,
            nameTr: r.nameTr,
            nameEn: r.nameEn || r.nameTr,
            description: r.description,
            coffeeType: r.coffeeType || "none",
            hasCoffee: r.hasCoffee,
            hasMilk: r.hasMilk,
            difficulty: r.difficulty,
            estimatedMinutes: r.estimatedMinutes,
            displayOrder: r.displayOrder,
            tags: r.tags || [],
            isActive: true,
            isFeatured: false,
          }).returning();

          if (r.sizes) {
            const [version] = await db.insert(recipeVersions).values({
              recipeId: recipe.id,
              versionNumber: 1,
              sizes: r.sizes,
              ingredients: r.ingredients || [],
              isApproved: true,
            }).returning();

            await db.update(recipes).set({ currentVersionId: version.id }).where(eq(recipes.id, recipe.id));
          }

          totalInserted++;
        } catch (err: any) {
          console.error(`  ❌ Error inserting ${r.nameTr}: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ DOSPRESSO recipe seed complete: ${totalInserted} recipes inserted across ${CATEGORIES.length} categories`);
  } catch (error: any) {
    console.error("❌ Recipe seed error:", error);
    throw error;
  }
}
