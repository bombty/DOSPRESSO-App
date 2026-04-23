# Sema Gıda — Reçete Gramaj Doğrulama Formu (Task #159)

**Tarih:** 23 Nisan 2026
**Hazırlayan:** Replit Agent (Task #129 takibi)
**Onaylayan:** Sema (hq-sema-gida) — gıda mühendisi
**Kapsam:** Script 20 ile doldurulan 11 placeholder reçete (PR-003…PR-013)

## Amaç

Script `20-bos-recete-malzeme-tamamlama.sql` ile `factory_recipe_ingredients` tablosuna eklenen 11 reçetenin malzeme miktarları (gramaj) referans tam reçetelerden (id=22 Siyah Cookie, id=27 Donut, id=15 Cheesecake Lotus) türetilerek tahmini girildi. Bu form, Sema'nın üretim formülü kâğıdı ile karşılaştırma yapıp onaylaması içindir.

Onay tamamlandıktan sonra `scripts/pilot/22-sema-recete-gramaj-onay.sql` çalıştırılarak `factory_recipes.change_log` alanına onay notu eklenir.

## Talimat

1. Aşağıdaki tabloya, üretim formülü kâğıdından bakarak ilgili reçetenin durumunu işaretle:
   - **OK** → gramajlar üretim toleransı içinde, düzeltme yok.
   - **DÜZELT** → satırda farklı gramaj var, "Düzeltme notu" alanına yaz.
2. Tüm satırlar tamamlandıktan sonra script 22'yi çalıştır.
3. Eğer DÜZELT işaretli reçete varsa, önce `factory_recipe_ingredients` tablosunda gramajları manuel düzelt (UPDATE), sonra script 22'yi çalıştır.

## Reçete Listesi

| ID | Kod | Reçete Adı | Ingredient Sayısı | Referans | Durum (OK/DÜZELT) | Düzeltme Notu |
|----|-----|-----------|------------------:|----------|-------------------|---------------|
| 2  | PR-003 | Donut Base Hamuru Reçetesi   | 26 | id=27 Donut       | ☐ | |
| 3  | PR-004 | Cinnaboom Classic Reçetesi   | 15 | hamur+dolgu+glaze | ☐ | |
| 4  | PR-005 | Cinnaboom Brownie Reçetesi   | 15 | hamur+brownie iç  | ☐ | |
| 5  | PR-006 | New York Cookie Reçetesi     | 16 | id=22 Siyah Cookie| ☐ | |
| 6  | PR-007 | Crumble Cookie Reçetesi      | 13 | id=22 türetildi   | ☐ | |
| 7  | PR-008 | Cheesecake Base Reçetesi     | 5  | yarı mamul taban  | ☐ | |
| 8  | PR-009 | Oreo Cheesecake Reçetesi     | 12 | id=15 Lotus       | ☐ | |
| 9  | PR-010 | San Sebastian Reçetesi       | 8  | Bask, tabansız    | ☐ | |
| 10 | PR-011 | Bombty Latte Powder Reçetesi | 7  | içecek harcı      | ☐ | |
| 11 | PR-012 | Chocolate Powder Reçetesi    | 7  | sıcak çikolata    | ☐ | |
| 12 | PR-013 | Creambase Powder Reçetesi    | 8  | krem bazı toz     | ☐ | |

## Detay Görüntüleme

Her reçetenin ingredient listesi şu sorgu ile çekilir:

```sql
SELECT sort_order, name, amount, unit, ingredient_type, ingredient_category
FROM factory_recipe_ingredients
WHERE recipe_id = :id
ORDER BY sort_order;
```

veya `/fabrika/recete-yonetimi/<id>` sayfasında görüntülenir.

## Sema İmza Alanı

Tüm reçeteler kontrol edildi ve onaylandı / düzeltildi:

```
Sema Gıda Mühendisi: ____________________________
Tarih: ____________________________
```

Onay sonrası: `psql $DATABASE_URL -f scripts/pilot/22-sema-recete-gramaj-onay.sql`
