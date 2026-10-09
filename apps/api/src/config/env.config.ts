export interface EnvironmentVariables {
  NODE_ENV: "development" | "test" | "production";
  API_PORT: number;
  DATABASE_URL: string;
  CORS_ORIGIN?: string;
  GEMINI_API_KEY?: string;
  PEPPER?: string;
  INITIAL_USER_EMAIL?: string;
  INITIAL_USER_PASSWORD?: string;
  INITIAL_USER_NAME?: string;
  INITIAL_USER_USERNAME?: string;
  DB_POOL_MAX?: number;
}

export const envConfig = (): EnvironmentVariables => ({
  NODE_ENV:
    (process.env["NODE_ENV"] as EnvironmentVariables["NODE_ENV"]) ||
    "development",
  API_PORT: parseInt(process.env["API_PORT"] || "3001", 10),
  DATABASE_URL: process.env["DATABASE_URL"] || "",
  CORS_ORIGIN: process.env["CORS_ORIGIN"] || "http://localhost:3000",
  GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
  PEPPER: process.env["PEPPER"],
  INITIAL_USER_EMAIL: process.env["INITIAL_USER_EMAIL"],
  INITIAL_USER_PASSWORD: process.env["INITIAL_USER_PASSWORD"],
  INITIAL_USER_NAME: process.env["INITIAL_USER_NAME"],
  INITIAL_USER_USERNAME: process.env["INITIAL_USER_USERNAME"],
  DB_POOL_MAX: parseInt(process.env["DB_POOL_MAX"] || "10", 10),
});
