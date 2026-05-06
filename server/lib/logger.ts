/**
 * DOSPRESSO Structured Logger (Sprint 10 P-8)
 * 
 * Kaynak:
 *   - Audit Security 4.3: 1804 console.error silent failure pattern
 *   - Pilot ilk ay: structured log gerekli (debug + post-mortem)
 *   - Post-pilot: Pino veya Sentry'a geçiş (bu API uyumlu)
 * 
 * Özellikler:
 *   - Zero dependencies (stdlib only) — npm install gerekmez
 *   - Production: JSON line (Pino/Sentry/Datadog/CloudWatch uyumlu)
 *   - Development: Human-readable (renkli, kısa)
 *   - LOG_LEVEL env (debug, info, warn, error, fatal)
 *   - Console.* override (geriye uyumlu — 3241 mevcut çağrı otomatik geçiş)
 *   - Error stack trace + context preservation
 * 
 * Kullanım (yeni kod):
 *   import { logger } from '@/server/lib/logger';
 *   logger.info('User logged in', { userId, branchId });
 *   logger.error('Payroll calc failed', error, { userId, year, month });
 * 
 * Kullanım (eski kod):
 *   console.error('Error:', err)  →  otomatik structured log üretir
 *   console.warn('Warning')       →  otomatik structured log üretir
 * 
 * Post-pilot Pino geçişi (1 dosya değişikliği):
 *   import pino from 'pino';
 *   export const logger = pino({...});
 *   // Tüm logger.info/error/warn çağrıları aynı API ile çalışır
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  // Process metadata
  pid?: number;
  hostname?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

// Env'den minimum log level (default: info)
const MIN_LEVEL = ((process.env.LOG_LEVEL || 'info').toLowerCase()) as LogLevel;
const MIN_LEVEL_NUM = LOG_LEVELS[MIN_LEVEL] ?? LOG_LEVELS.info;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEV = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// ANSI renk kodları (sadece dev)
const COLORS = {
  debug: '\x1b[90m',  // gray
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
  fatal: '\x1b[35m',  // magenta
  reset: '\x1b[0m',
};

/**
 * Bir log entry'sini stdout/stderr'a yazılabilir hale getirir.
 */
function format(entry: LogEntry): string {
  if (IS_DEV) {
    // Development: human-readable, renkli
    const color = COLORS[entry.level] || '';
    const reset = COLORS.reset;
    const time = entry.timestamp.split('T')[1]?.replace('Z', '') || entry.timestamp;
    const levelTag = `${color}${entry.level.toUpperCase().padEnd(5)}${reset}`;
    const contextStr = entry.context && Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : '';
    const errorStr = entry.error
      ? `\n  ${COLORS.error}${entry.error.stack || `${entry.error.name}: ${entry.error.message}`}${reset}`
      : '';
    return `[${time}] ${levelTag} ${entry.msg}${contextStr}${errorStr}`;
  }

  // Production: JSON line (Pino-uyumlu format)
  return JSON.stringify({
    level: entry.level,
    time: entry.timestamp,
    msg: entry.msg,
    ...(entry.context || {}),
    ...(entry.error ? { err: entry.error } : {}),
    pid: entry.pid,
    hostname: entry.hostname,
  });
}

/**
 * Internal log fonksiyonu — log level kontrolü + formatlama + output.
 */
function log(
  level: LogLevel,
  msg: string,
  context?: Record<string, unknown>,
  error?: Error | unknown
): void {
  // Level kontrolü
  if (LOG_LEVELS[level] < MIN_LEVEL_NUM) return;

  // Error normalize
  let errorObj: LogEntry['error'];
  if (error instanceof Error) {
    errorObj = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  } else if (error !== undefined && error !== null) {
    // Non-Error throw'lar için
    errorObj = {
      name: 'NonError',
      message: typeof error === 'string' ? error : JSON.stringify(error),
    };
  }

  const entry: LogEntry = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
    ...(errorObj ? { error: errorObj } : {}),
    ...(IS_PRODUCTION ? { pid: process.pid } : {}),
  };

  const line = format(entry);

  // warn+ → stderr, info- → stdout (production log aggregator'lar buna göre ayrıştırır)
  if (LOG_LEVELS[level] >= LOG_LEVELS.warn) {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

/**
 * Public logger API — Pino-compatible signature.
 * 
 * @example
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('DB query failed', error, { query: 'SELECT ...' });
 */
export const logger = {
  debug: (msg: string, context?: Record<string, unknown>): void =>
    log('debug', msg, context),

  info: (msg: string, context?: Record<string, unknown>): void =>
    log('info', msg, context),

  warn: (msg: string, context?: Record<string, unknown>): void =>
    log('warn', msg, context),

  error: (msg: string, error?: Error | unknown, context?: Record<string, unknown>): void =>
    log('error', msg, context, error),

  fatal: (msg: string, error?: Error | unknown, context?: Record<string, unknown>): void =>
    log('fatal', msg, context, error),

  /**
   * Child logger — context'i pre-bind eder, sonraki çağrılarda da içerir.
   * 
   * @example
   *   const userLogger = logger.child({ userId: '123', branchId: 5 });
   *   userLogger.info('Action taken');  // userId + branchId otomatik dahil
   */
  child: (defaultContext: Record<string, unknown>) => ({
    debug: (msg: string, context?: Record<string, unknown>): void =>
      log('debug', msg, { ...defaultContext, ...context }),
    info: (msg: string, context?: Record<string, unknown>): void =>
      log('info', msg, { ...defaultContext, ...context }),
    warn: (msg: string, context?: Record<string, unknown>): void =>
      log('warn', msg, { ...defaultContext, ...context }),
    error: (msg: string, error?: Error | unknown, context?: Record<string, unknown>): void =>
      log('error', msg, { ...defaultContext, ...context }, error),
    fatal: (msg: string, error?: Error | unknown, context?: Record<string, unknown>): void =>
      log('fatal', msg, { ...defaultContext, ...context }, error),
  }),
};

// ───────────────────────────────────────────────────────────────────────────
// CONSOLE.* OVERRIDE (geriye uyumlu — 3241 mevcut çağrı otomatik geçiş)
// ───────────────────────────────────────────────────────────────────────────

const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

let consoleOverridden = false;

/**
 * console.* metodlarını logger'a yönlendirir.
 * server/index.ts'te BIR KEZ çağrılır (process başlangıcında).
 * 
 * Etki:
 *   console.error('foo:', err)  →  logger.error('foo:', err)  →  structured JSON log
 *   console.warn('bar')          →  logger.warn('bar')         →  structured JSON log
 *   console.log('debug info')    →  logger.info('debug info')  →  structured JSON log
 * 
 * Geri al: restoreConsole()
 */
export function installConsoleOverride(): void {
  if (consoleOverridden) return;
  consoleOverridden = true;

  const stringify = (args: unknown[]): { msg: string; error?: Error } => {
    const errors = args.filter((a): a is Error => a instanceof Error);
    const error = errors[0]; // İlk Error'u "error" alanına yerleştir
    const nonErrors = args.filter((a) => !(a instanceof Error));
    const msg = nonErrors
      .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' ');
    return { msg: msg || (error ? error.message : ''), error };
  };

  console.log = (...args: unknown[]) => {
    const { msg } = stringify(args);
    log('info', msg);
  };

  console.error = (...args: unknown[]) => {
    const { msg, error } = stringify(args);
    log('error', msg, undefined, error);
  };

  console.warn = (...args: unknown[]) => {
    const { msg, error } = stringify(args);
    log('warn', msg, undefined, error);
  };

  console.info = (...args: unknown[]) => {
    const { msg } = stringify(args);
    log('info', msg);
  };

  console.debug = (...args: unknown[]) => {
    const { msg } = stringify(args);
    log('debug', msg);
  };

  logger.info('Console override installed', { logLevel: MIN_LEVEL });
}

/**
 * Console override'u geri alır (test'lerde lazım olabilir).
 */
export function restoreConsole(): void {
  if (!consoleOverridden) return;
  consoleOverridden = false;

  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}
