/**
 * Structured Logging Service - January 2026
 *
 * Production-ready logging with:
 * - Structured JSON output for Vercel logs
 * - Log levels (debug, info, warn, error)
 * - Context propagation (request ID, user ID)
 * - Performance timing
 * - Error tracking integration
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  circleId?: string;
  memberId?: string;
  route?: string;
  method?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level from environment
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

class Logger {
  private context: LogContext = {};

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Set context that will be included in all log entries
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear current context
   */
  clearContext(): void {
    this.context = {};
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (Object.keys(this.context).length > 0) {
      entry.context = this.context;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    // In production, output structured JSON
    // In development, use more readable format
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(entry));
    } else {
      const levelColors: Record<LogLevel, string> = {
        debug: "\x1b[36m", // cyan
        info: "\x1b[32m", // green
        warn: "\x1b[33m", // yellow
        error: "\x1b[31m", // red
      };
      const reset = "\x1b[0m";
      const color = levelColors[entry.level];

      let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

      if (entry.context?.requestId) {
        output += ` (req: ${entry.context.requestId.slice(0, 8)})`;
      }

      if (entry.duration_ms) {
        output += ` [${entry.duration_ms}ms]`;
      }

      console.log(output);

      if (entry.metadata) {
        console.log("  Metadata:", JSON.stringify(entry.metadata, null, 2));
      }

      if (entry.error) {
        console.error("  Error:", entry.error.message);
        if (entry.error.stack && entry.level === "error") {
          console.error("  Stack:", entry.error.stack);
        }
      }
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog("debug")) return;
    this.output(this.formatEntry("debug", message, metadata));
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog("info")) return;
    this.output(this.formatEntry("info", message, metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog("warn")) return;
    this.output(this.formatEntry("warn", message, metadata));
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog("error")) return;

    const err = error instanceof Error ? error : undefined;
    const entry = this.formatEntry("error", message, metadata, err);

    // If error is not an Error instance, include it in metadata
    if (error && !(error instanceof Error)) {
      entry.metadata = { ...entry.metadata, errorValue: error };
    }

    this.output(entry);

    // Report to error tracking service in production
    if (process.env.NODE_ENV === "production" && err) {
      this.reportError(err, entry);
    }
  }

  /**
   * Time an async operation
   */
  async time<T>(
    label: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = Math.round(performance.now() - start);

      this.info(label, { ...metadata, duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.error(`${label} failed`, error, { ...metadata, duration_ms: duration });
      throw error;
    }
  }

  /**
   * Report error to external service
   */
  private async reportError(error: Error, entry: LogEntry): Promise<void> {
    // Integration point for error tracking services
    // Sentry, LogRocket, etc.
    //
    // Example Sentry integration:
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(error, {
    //     extra: entry.metadata,
    //     tags: entry.context,
    //   });
    // }

    // For now, just log that we would report
    // In production, integrate with your error tracking service
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: (message: string, metadata?: Record<string, unknown>) => logger.debug(message, metadata),
  info: (message: string, metadata?: Record<string, unknown>) => logger.info(message, metadata),
  warn: (message: string, metadata?: Record<string, unknown>) => logger.warn(message, metadata),
  error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) =>
    logger.error(message, error, metadata),
  time: <T>(label: string, operation: () => Promise<T>, metadata?: Record<string, unknown>) =>
    logger.time(label, operation, metadata),
  child: (context: LogContext) => logger.child(context),
};

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(request: Request): Logger {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);

  return logger.child({
    requestId,
    route: url.pathname,
    method: request.method,
  });
}

/**
 * Performance tracking utility
 */
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) return 0;

    const duration = Math.round(performance.now() - start);
    logger.debug(`Performance: ${name}`, { duration_ms: duration, from: startMark });
    return duration;
  }

  elapsed(startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) return 0;
    return Math.round(performance.now() - start);
  }
}

export default logger;
