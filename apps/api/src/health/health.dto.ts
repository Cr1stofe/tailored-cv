import type { AIHealthStatus } from "@tailored-cv/types";

export interface HealthResponseDto {
  status: "ok" | "error";
  service: string;
  timestamp?: string;
  database?: "connected" | "disconnected";
  ai?: AIHealthStatus;
}
