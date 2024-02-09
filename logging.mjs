import winston from "winston";
import morgan from "morgan";

const { combine, timestamp, json } = winston.format;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new winston.transports.File({ filename: "var/logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "var/logs/combined.log" }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "var/logs/exception.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'var/logs/rejections.log' }),
  ],
});

const httpLogger = winston.createLogger({
  level: "http",
  format: combine(
    timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A",
    }),
    json()
  ),
  transports: [new winston.transports.Console()],
});

const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  {
    stream: {
      // Configure Morgan to use our custom logger with the http severity
      write: (message) => httpLogger.http(message.trim()),
    },
  }
);

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  const consoleTransport = new winston.transports.Console({
    format: winston.format.simple(),
  });
  logger.add(
    consoleTransport
  );
  logger.exceptions.handle(
    consoleTransport
  );
}

export { logger, httpLogger, morganMiddleware };