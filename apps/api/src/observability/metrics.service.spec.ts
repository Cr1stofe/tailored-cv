import { describe, expect, it } from "vitest";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  it("exposes HTTP and AI metrics without request payloads", async () => {
    const metrics = new MetricsService();

    metrics.startRequest();
    metrics.finishRequest("POST", "/job-applications/:id/tailor", 201, 1250);
    metrics.recordAIRequest("tailor_resume", "gemini", "success", 1000);

    const output = await metrics.getMetrics();

    expect(output).toContain("tailored_cv_http_requests_total");
    expect(output).toContain("tailored_cv_ai_requests_total");
    expect(output).toContain('operation="tailor_resume"');
    expect(output).not.toContain("currículo");
  });
});
