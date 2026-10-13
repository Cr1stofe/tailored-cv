import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";

export const ObservabilityLoggerModule = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || "info",
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() || randomUUID(),
    customProps: (request) => ({
      requestId: request.id,
    }),
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
        "req.body",
        "res.headers['set-cookie']",
      ],
      censor: "[REDACTED]",
    },
  },
});
