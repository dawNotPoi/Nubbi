import "dotenv/config";
import winston from "winston";

const level =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, ...meta }) => {
              const metaStr =
                Object.keys(meta).length > 0
                  ? ` ${JSON.stringify(meta)}`
                  : "";
              return `${timestamp} ${level}: ${message}${metaStr}`;
            },
          ),
        ),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
