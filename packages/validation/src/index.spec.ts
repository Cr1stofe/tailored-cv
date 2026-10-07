import { describe, it, expect } from "vitest";
import { healthCheckSchema } from "./index";

describe("Validation Schemas", () => {
  it("should validate valid health check data", () => {
    const validData = {
      status: "ok",
      service: "tailored-cv-api",
    };

    const result = healthCheckSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should fail on invalid health check status", () => {
    const invalidData = {
      status: "invalid_status",
      service: "tailored-cv-api",
    };

    const result = healthCheckSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
