import { DocumentBuilder } from "@nestjs/swagger";

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle("Tailored CV API")
    .setDescription(
      "API for analyzing job opportunities and generating faithful, tailored resumes.",
    )
    .setVersion("1.0")
    .addCookieAuth("sid", { type: "apiKey", in: "cookie" }, "sid")
    .addCookieAuth(
      "__Secure-sid",
      { type: "apiKey", in: "cookie" },
      "__Secure-sid",
    )
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "opaque" },
      "sessionToken",
    )
    .build();
}
