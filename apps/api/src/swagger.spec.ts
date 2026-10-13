import { Test } from "@nestjs/testing";
import { SwaggerModule } from "@nestjs/swagger";
import { describe, expect, it } from "vitest";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { JobApplicationController } from "./job-application/job-application.controller";
import { JobApplicationService } from "./job-application/job-application.service";
import { SessionService } from "./auth/services/session.service";
import { createSwaggerConfig } from "./swagger.config";

describe("Swagger document", () => {
  it("describes authentication schemes and key request parameters", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, HealthController, JobApplicationController],
      providers: [
        { provide: HealthService, useValue: {} },
        { provide: JobApplicationService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: SessionService, useValue: {} },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const document = SwaggerModule.createDocument(
      app,
      createSwaggerConfig("sid"),
    );
    const securitySchemes = document.components?.securitySchemes;
    const healthParameters = document.paths["/health"]?.get?.parameters || [];
    const applicationParameters =
      document.paths["/job-applications"]?.get?.parameters || [];

    expect(Object.keys(securitySchemes || {})).toEqual(["sessionCookie"]);
    expect(securitySchemes?.sessionCookie).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "sid",
    });
    const tailoringRequestBody =
      document.paths["/job-applications/{id}/tailor"]?.post?.requestBody;
    expect(
      tailoringRequestBody && "required" in tailoringRequestBody
        ? tailoringRequestBody.required
        : false,
    ).toBe(true);
    expect(healthParameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "detailed", required: false }),
      ]),
    );
    expect(
      applicationParameters.map((parameter) =>
        "name" in parameter ? parameter.name : undefined,
      ),
    ).toEqual(
      expect.arrayContaining([
        "page",
        "limit",
        "search",
        "status",
        "stack",
        "sortBy",
      ]),
    );

    await app.close();
  });
});
