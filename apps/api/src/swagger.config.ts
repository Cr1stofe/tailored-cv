import { DocumentBuilder } from "@nestjs/swagger";

export function createSwaggerConfig(cookieName: string) {
  return new DocumentBuilder()
    .setTitle("Tailored CV API")
    .setDescription(
      "API for analyzing job opportunities and generating faithful, tailored resumes.",
    )
    .setVersion("1.0")
    .addCookieAuth(
      cookieName,
      { type: "apiKey", in: "cookie" },
      "sessionCookie",
    )
    .build();
}
