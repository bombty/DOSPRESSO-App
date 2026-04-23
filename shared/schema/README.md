# Schema dosyaları arasında tek-yönlü import kuralı

Bu dizindeki `schema-*.ts` dosyaları büyük bir Drizzle şemasının parçalarıdır.
Daha önce dosyalar arasında çift yönlü importlar (örn. `schema-02 ↔ schema-03`)
"X is not defined" tarzında çalışma zamanı hataları doğuruyordu (bkz. Task #147).

Bu sorunu kalıcı olarak önlemek için aşağıdaki kural geçerlidir:

## Kural

> Bir `schema-NN[-suffix].ts` dosyası **yalnızca daha düşük numaralı**
> `schema-MM[-suffix].ts` dosyalarından (yani `MM < NN` olacak şekilde) import
> yapabilir. Aynı veya daha yüksek numaralı dosyalardan import yapamaz.

- `schema-01.ts` hiçbir başka şema dosyasından import yapmaz (taban katman).
- `schema-14-relations.ts` tüm tabloları birleştiren ilişki katmanıdır ve
  daha düşük numaralı tüm dosyalardan import yapabilir.
- Numaralar dosya adının başındaki ilk sayıdan alınır (`schema-22-factory-recipes.ts`
  → `22`).

## Çapraz tablo FK'leri ne olacak?

Daha düşük numaralı bir dosyadaki bir kolon, daha yüksek numaralı bir
dosyadaki tabloya FK olmak istiyorsa **inline `.references(() => x.id)`
kullanılamaz** (çünkü import gerekir). Bunun yerine:

1. Kolonu sade bir `integer(...)` (veya uygun tip) olarak tanımlayın ve
   yorum satırında hangi tabloya referans verdiğini belirtin.
2. Drizzle relation tanımını `schema-14-relations.ts` içine ekleyin (sorgu
   join'leri için).
3. Veritabanı seviyesindeki `FOREIGN KEY` constraint'ini migration / drift
   düzeltme script'leri ile uygulayın (bkz. "Schema'da tanımlı 47 foreign
   key'i veritabanına ekle" task'i).

## Otomatik kontrol

`scripts/check-schema-import-direction.ts` script'i bu kuralı doğrular ve
ihlal bulursa non-zero exit code ile çıkar. Doğrudan çalıştırmak için:

```bash
npx tsx scripts/check-schema-import-direction.ts
```

Bu komut projede **`schema-imports`** adlı validation step'i olarak
kayıtlıdır (Replit validation skill'i üzerinden). Her PR / değişiklik
sonrası `startValidationRun({ commandIds: ["schema-imports"] })` ile
çalıştırılır; ihlal varsa run FAILED döner.

> Yorum satırları script tarafından atlanır, dolayısıyla şema dosyalarındaki
> "NOTE:" tarzı açıklamalar (örn. "şu tabloya FK") kontrolü tetiklemez.

Yeni bir şema dosyası eklerken yeterince yüksek bir numara seçin ki ihtiyaç
duyduğunuz tüm bağımlılıklar daha düşük numaralı dosyalarda kalsın.
