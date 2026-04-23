import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalIngredientName, INGREDIENT_ALIASES, getAllAliases } from "./ingredient-canonical";

describe("canonicalIngredientName", () => {
  it("maps şeker varyantlarını Toz Şeker'e", () => {
    expect(canonicalIngredientName("ŞEKER")).toBe("Toz Şeker");
    expect(canonicalIngredientName("Şeker")).toBe("Toz Şeker");
    expect(canonicalIngredientName("TOZ ŞEKER")).toBe("Toz Şeker");
    expect(canonicalIngredientName("Toz şeker")).toBe("Toz Şeker");
  });

  it("maps su varyantlarını Su'ya", () => {
    expect(canonicalIngredientName("SU")).toBe("Su");
    expect(canonicalIngredientName("SOĞUK SU")).toBe("Su");
    expect(canonicalIngredientName("Su (28-30°C)")).toBe("Su");
  });

  it("maps maya varyantlarını Yaş Maya'ya", () => {
    expect(canonicalIngredientName("MAYA")).toBe("Yaş Maya");
    expect(canonicalIngredientName("YAŞ MAYA")).toBe("Yaş Maya");
    expect(canonicalIngredientName("Yaş maya (taze)")).toBe("Yaş Maya");
  });

  it("typo'ları düzeltir", () => {
    expect(canonicalIngredientName("DEKSTORZ")).toBe("Dekstroz");
    expect(canonicalIngredientName("XHANTAN GUM")).toBe("Ksantan Gum (E415)");
    expect(canonicalIngredientName("TOZ YUMARTA")).toBe("Yumurta Tozu");
    expect(canonicalIngredientName("KALSİYUM PROBİYONAT")).toBe("Kalsiyum Propiyonat (E282)");
    expect(canonicalIngredientName("L-SESTEİN")).toBe("L-Sistein (E920)");
    expect(canonicalIngredientName("POTASTUM SORBAT")).toBe("Potasyum Sorbat");
  });

  it("kanonik formdaki ismi olduğu gibi bırakır", () => {
    expect(canonicalIngredientName("Toz Şeker")).toBe("Toz Şeker");
    expect(canonicalIngredientName("Buğday Unu")).toBe("Buğday Unu");
  });

  it("alias map'te olmayan ismi (trim'li) geri verir", () => {
    expect(canonicalIngredientName("  YENİ MALZEME  ")).toBe("YENİ MALZEME");
  });

  it("boş veya null girdi için boş string döner", () => {
    expect(canonicalIngredientName("")).toBe("");
    expect(canonicalIngredientName(null)).toBe("");
    expect(canonicalIngredientName(undefined)).toBe("");
  });

  it("farklı kalemler ayrı kalır (kasıtlı korunan ayrımlar)", () => {
    // ŞEKER KAMIŞI ≠ Esmer Şeker (farklı ürünler)
    expect(canonicalIngredientName("ŞEKER KAMIŞI")).toBe("ŞEKER KAMIŞI");
    // TURYAĞ ≠ Margarin (Alba) (farklı marka)
    expect(canonicalIngredientName("TURYAĞ")).toBe("TURYAĞ");
    // VANİLİN ≠ Vanilya (sentetik vs doğal)
    expect(canonicalIngredientName("VANİLİN")).toBe("VANİLİN");
  });
});

describe("SQL ↔ TS alias map paritesi", () => {
  // SQL migration ile TS sözlüğü eş tutmak kritik. Bu test SQL VALUES
  // satırlarını parse edip TS map ile aynı olduğunu doğrular.
  it("scripts/pilot/20-ingredient-name-canonical-merge.sql ile aynı eşlemeleri içerir", () => {
    const sqlPath = resolve(__dirname, "../../scripts/pilot/20-ingredient-name-canonical-merge.sql");
    const sql = readFileSync(sqlPath, "utf8");

    // VALUES bloğundan ('alias', 'canonical') satırlarını çek
    const re = /\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g;
    const sqlPairs = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      const alias = m[1].replace(/''/g, "'");
      const canonical = m[2].replace(/''/g, "'");
      sqlPairs.add(`${alias}→${canonical}`);
    }

    const tsPairs = new Set<string>();
    for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
      for (const alias of aliases) tsPairs.add(`${alias}→${canonical}`);
    }

    const onlyInSql = [...sqlPairs].filter((p) => !tsPairs.has(p));
    const onlyInTs = [...tsPairs].filter((p) => !sqlPairs.has(p));

    expect(onlyInSql, `SQL'de olup TS'de olmayan eşlemeler: ${onlyInSql.join(", ")}`).toEqual([]);
    expect(onlyInTs, `TS'de olup SQL'de olmayan eşlemeler: ${onlyInTs.join(", ")}`).toEqual([]);
  });

  it("getAllAliases() hiçbir alias'ı kanonikle eşit göstermez", () => {
    for (const { canonical, alias } of getAllAliases()) {
      expect(alias).not.toBe(canonical);
    }
  });
});
