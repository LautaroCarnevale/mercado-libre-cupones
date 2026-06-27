import type { LogLevel } from '../types';

// Estructura de entrada de log
interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

// Nivel numérico para comparación
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

// Actualizar nivel global
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

// Crear logger con namespace
export function createLogger(module: string) {
  function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
  }

  function formatEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
  ): LogEntry {
    return {
      level,
      module,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  function log(level: LogLevel, message: string, data?: unknown): void {
    if (!shouldLog(level)) return;

    const entry = formatEntry(level, message, data);
    const prefix = `[Mercado Libre Cupones][${module}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
    }

    // Guardar en storage para la UI de logs
    persistLog(entry);
  }

  return {
    debug: (msg: string, data?: unknown) => log('debug', msg, data),
    info: (msg: string, data?: unknown) => log('info', msg, data),
    warn: (msg: string, data?: unknown) => log('warn', msg, data),
    error: (msg: string, data?: unknown) => log('error', msg, data),
  };
}

// Buffer de logs para no escribir en storage por cada entrada
let logBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function persistLog(entry: LogEntry): void {
  logBuffer.push(entry);

  if (!flushTimer) {
    flushTimer = setTimeout(flushLogs, 2000);
  }
}

async function flushLogs(): Promise<void> {
  flushTimer = null;
  if (logBuffer.length === 0) return;

  const toFlush = [...logBuffer];
  logBuffer = [];

  try {
    const api =
      typeof chrome !== 'undefined'
        ? chrome
        : (browser as unknown as typeof chrome);
    const result = await api.storage.local.get('ml_cupones_logs');
    const existing: LogEntry[] = result.ml_cupones_logs ?? [];
    const merged = [...existing, ...toFlush].slice(-1000);
    await api.storage.local.set({ ml_cupones_logs: merged });
  } catch {
    // Silenciar si no hay acceso a storage
  }
}
