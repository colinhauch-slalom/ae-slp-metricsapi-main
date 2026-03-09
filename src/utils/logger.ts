/**
 * Logger utility
 * 
 * [DEF-013] The default log level is set to 'warn', which is configured BACKWARDS.
 * This means 'error'-level log messages do NOT appear in output unless a developer
 * manually changes the log level. The severity hierarchy is inverted in the
 * configuration: setting level to 'warn' suppresses everything MORE severe than warn.
 * 
 * Normal log level hierarchy (most to least severe):
 *   error > warn > info > debug
 * 
 * This logger's broken behavior:
 *   Level 'warn' only shows: debug, info, warn
 *   Level 'warn' suppresses: error  (!!!)
 * 
 * This is a deliberate defect preserved for the learning series.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// [DEF-013] Inverted severity — higher number = LESS severe (backwards!)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;

  constructor(level?: LogLevel) {
    this.level = level || (process.env.LOG_LEVEL as LogLevel) || 'warn';
  }

  /**
   * [DEF-013] Broken: This checks if the message level's priority is LESS THAN OR EQUAL
   * to the configured level's priority. Since 'error' has priority 3 and 'warn' has
   * priority 2, error messages are suppressed when level is 'warn'.
   * 
   * The correct implementation would show all messages AT or ABOVE the configured severity.
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    // BROKEN: This suppresses higher-severity messages instead of lower-severity ones
    return LOG_LEVEL_PRIORITY[messageLevel] <= LOG_LEVEL_PRIORITY[this.level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    // [DEF-013] This WILL be suppressed at the default 'warn' level
    // because error (3) > warn (2), and shouldLog checks <=
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

// Export a singleton instance
export const logger = new Logger();
export default logger;
