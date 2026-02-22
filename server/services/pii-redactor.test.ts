import { describe, it, expect } from 'vitest';
import { redactPII, redactLogFields } from '../services/pii-redactor';

describe('redactPII', () => {
  describe('Email redaction', () => {
    it('should redact email addresses', () => {
      expect(redactPII('test@example.com')).toBe('[EMAIL]');
      expect(redactPII('user.name+tag@domain.co.uk')).toBe('[EMAIL]');
      expect(redactPII('Contact me at hello@world.org please')).toBe('Contact me at [EMAIL] please');
    });
  });

  describe('Phone redaction', () => {
    it('should redact +90 prefixed numbers', () => {
      expect(redactPII('+905551234567')).toBe('[PHONE]');
      expect(redactPII('+90 555 123 45 67')).toBe('[PHONE]');
    });

    it('should redact 0-prefixed mobile numbers', () => {
      expect(redactPII('05551234567')).toBe('[PHONE]');
      expect(redactPII('0555 123 45 67')).toBe('[PHONE]');
      expect(redactPII('0555-123-45-67')).toBe('[PHONE]');
    });

    it('should redact phone in context', () => {
      expect(redactPII('Ara: 0532 456 78 90')).toBe('Ara: [PHONE]');
    });
  });

  describe('TCKN redaction', () => {
    it('should redact standalone 11-digit numbers', () => {
      expect(redactPII('12345678901')).toBe('[TCKN]');
      expect(redactPII('TC: 12345678901 bitti')).toBe('TC: [TCKN] bitti');
    });

    it('should not redact numbers inside longer numbers', () => {
      expect(redactPII('123456789012')).not.toBe('[TCKN]2');
    });
  });

  describe('IBAN redaction', () => {
    it('should redact Turkish IBAN numbers', () => {
      expect(redactPII('TR12 3456 7890 1234 5678 9012 34')).toBe('[IBAN]');
      expect(redactPII('TR1234567890123456789012')).toBe('[IBAN]');
    });

    it('should redact IBAN in context', () => {
      expect(redactPII('IBAN: TR12 3456 7890 1234 5678 9012 34 hesap')).toBe('IBAN: [IBAN] hesap');
    });
  });

  describe('Credit card redaction', () => {
    it('should redact card-like numbers with spaces', () => {
      expect(redactPII('4532 1234 5678 9012')).toBe('[CARD]');
    });

    it('should redact card-like numbers with dashes', () => {
      expect(redactPII('4532-1234-5678-9012')).toBe('[CARD]');
    });

    it('should redact continuous card numbers', () => {
      expect(redactPII('4532123456789012')).toBe('[CARD]');
    });
  });

  describe('Mixed text', () => {
    it('should redact multiple PII types in one string', () => {
      const input = 'Email: test@example.com, Tel: 05551234567, IBAN: TR1234567890123456789012';
      const result = redactPII(input);
      expect(result).toContain('[EMAIL]');
      expect(result).toContain('[PHONE]');
      expect(result).toContain('[IBAN]');
      expect(result).not.toContain('test@example.com');
      expect(result).not.toContain('05551234567');
    });
  });

  describe('No false positives', () => {
    it('should not redact normal text', () => {
      expect(redactPII('Hello world')).toBe('Hello world');
    });

    it('should not redact short numbers', () => {
      expect(redactPII('Order #12345')).toBe('Order #12345');
      expect(redactPII('Score: 85')).toBe('Score: 85');
    });

    it('should not redact typical IDs', () => {
      expect(redactPII('userId: abc123')).toBe('userId: abc123');
      expect(redactPII('branch 42')).toBe('branch 42');
    });
  });

  describe('Null and empty handling', () => {
    it('should handle empty string', () => {
      expect(redactPII('')).toBe('');
    });

    it('should handle null-like values gracefully', () => {
      expect(redactPII(null as any)).toBe(null);
      expect(redactPII(undefined as any)).toBe(undefined);
    });
  });
});

describe('redactLogFields', () => {
  it('should redact both inputSummary and outputSummary', () => {
    const obj = {
      inputSummary: '{"email":"test@example.com"}',
      outputSummary: '{"phone":"05551234567"}',
    };
    const result = redactLogFields(obj);
    expect(result.inputSummary).toContain('[EMAIL]');
    expect(result.outputSummary).toContain('[PHONE]');
  });

  it('should handle null fields', () => {
    const obj = { inputSummary: null, outputSummary: null };
    const result = redactLogFields(obj);
    expect(result.inputSummary).toBeNull();
    expect(result.outputSummary).toBeNull();
  });

  it('should handle missing fields', () => {
    const obj = {};
    const result = redactLogFields(obj);
    expect(result.inputSummary).toBeUndefined();
    expect(result.outputSummary).toBeUndefined();
  });
});
