const IBAN_REGEX = /\bTR\s*\d[\d\s]{10,30}\d\b/gi;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PHONE_REGEX = /(?:\+90[\s.-]?)?0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g;

const TCKN_REGEX = /(?<!\d)\d{11}(?!\d)/g;

const CARD_REGEX = /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}(?!\d)/g;

export function redactPII(text: string): string {
  if (!text) return text;

  let result = text;
  result = result.replace(IBAN_REGEX, '[IBAN]');
  result = result.replace(EMAIL_REGEX, '[EMAIL]');
  result = result.replace(PHONE_REGEX, '[PHONE]');
  result = result.replace(TCKN_REGEX, '[TCKN]');
  result = result.replace(CARD_REGEX, '[CARD]');

  return result;
}

export function redactLogFields<T extends { inputSummary?: string | null; outputSummary?: string | null }>(obj: T): T {
  const result = { ...obj };
  if (result.inputSummary) {
    result.inputSummary = redactPII(result.inputSummary);
  }
  if (result.outputSummary) {
    result.outputSummary = redactPII(result.outputSummary);
  }
  return result;
}
