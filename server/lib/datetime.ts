/**
 * TR Timezone Datetime Yardımcıları (Sprint D - 19.04.2026)
 *
 * Bağlam: B.1 consistency-check missing_pdks_record bulgusu — UTC date string'leri
 * Türkiye saat sınırını (UTC+3) aşan check-in'lerde shift_date ile uyuşmuyordu.
 * Örnek: Basri Şen 29.03.2026 21:13 UTC = 30.03.2026 00:13 TR. Eski kod
 * `now.toISOString().split('T')[0]` ile '2026-03-30' veriyordu, ama shift.shift_date
 * '2026-03-29' idi → JOIN eşleşmiyordu, B.1 "missing" sayıyordu.
 *
 * Bu helper'lar Europe/Istanbul saat dilimine sabit DATE/TIME string üretir.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Istanbul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Verilen Date'i Europe/Istanbul saat dilimine göre 'YYYY-MM-DD' string olarak döner.
 * pdks_records.record_date kolonu için kullanılır (DATE tipinde).
 */
export function trDateString(date: Date = new Date()): string {
  return DATE_FORMATTER.format(date); // en-CA → '2026-03-30'
}

/**
 * Verilen Date'i Europe/Istanbul saat dilimine göre 'HH:MM:SS' string olarak döner.
 * pdks_records.record_time kolonu için kullanılır (TIME tipinde).
 */
export function trTimeString(date: Date = new Date()): string {
  // en-GB '24:00:00' bug'ı için saat 0'a normalize et
  return TIME_FORMATTER.format(date).replace(/^24:/, '00:');
}

/**
 * Verilen Date'i Europe/Istanbul saat dilimine göre 'HH:MM' string olarak döner.
 * Bazı handler'lar 5-karakter time bekliyordu — uyumluluk için.
 */
export function trTimeStringShort(date: Date = new Date()): string {
  return trTimeString(date).substring(0, 5);
}
