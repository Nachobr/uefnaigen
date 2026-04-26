import pino, { type Logger } from "pino";

export interface LoggerOptions {
  enabled?: boolean;
  level?: string;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return pino(
    {
      enabled: options.enabled ?? Boolean(process.env.FORGEAI_LOG_LEVEL),
      level: options.level ?? process.env.FORGEAI_LOG_LEVEL ?? "info",
    },
    pino.destination(2),
  );
}
