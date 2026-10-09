# Tailored CV — Backend API (`@tailored-cv/api`)

A modular, enterprise-grade RESTful API built with **NestJS 11**, **TypeScript**, and **Prisma ORM 7** (with native PostgreSQL adapter). Powers the core authentication, resume tailoring logic, and Gemini AI integrations.

---

## 🏛️ Architecture & Modules

The API follows NestJS standard modular design patterns with separation of concerns:

| Module              | Location               | Description                                                                                                                      |
| :------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**            | `src/auth/`            | Session management, password hashing via Scrypt + Pepper, and secure `HttpOnly` cookie distribution                              |
| **Profile**         | `src/profile/`         | Master Profile CRUD, automatic initialization, atomic transactions, and custom data-loader utility                               |
| **Job Application** | `src/job-application/` | Job description intake, keyword extraction, match score calculation, and CV restructuring                                        |
| **AI**              | `src/ai/`              | Provider abstraction layer (`AIProvider`) with Gemini integration (`GeminiProvider`) and deterministic fallback (`MockProvider`) |
| **Health**          | `src/health/`          | Health check endpoint with PostgreSQL connection readiness probe                                                                 |
| **Prisma**          | `src/prisma/`          | Singleton `PrismaService` configured with `@prisma/adapter-pg` driver adapter and connection pooling                             |
| **Common**          | `src/common/`          | Global HTTP exception filters, auth guards, interceptors, and custom parameter decorators                                        |

---

## 📡 API Endpoints

### Authentication

- `POST /auth/login` — Sign in with credentials, sets secure `HttpOnly` session cookie (`__Secure-sid` or `sid`)
- `DELETE /auth/logout` — Invalidate current session and clear cookie
- `GET /auth/session` — Retrieve currently authenticated user and session metadata

### Master Profile

- `GET /profile` — Retrieve the Master Profile (auto-seeded if database is unpopulated)
- `PUT /profile` — Update profile data (validated with Zod schemas)
- `POST /profile/reset-seed` — Reset profile back to standard seed defaults

### Job Applications & Tailoring

- `GET /job-applications` — List all job applications
- `POST /job-applications` — Create a new job application
- `GET /job-applications/:id` — Get detailed view including requirements and match results
- `DELETE /job-applications/:id` — Delete an application
- `PATCH /job-applications/:id/status` — Update application status (`DRAFT`, `ANALYZED`, `TAILORED`, `APPLIED`, etc.)
- `POST /job-applications/:id/analyze` — Run AI analysis to extract skills, keywords, and match score
- `POST /job-applications/:id/tailor` — Generate tailored resume reframing experience without fabricating details
- `GET /job-applications/:id/tailored-resume` — Fetch the generated tailored resume

### Diagnostics

- `GET /health` — Simple ping endpoint
- `GET /health/ready` — Readiness probe that verifies PostgreSQL connectivity
- `GET /health?detailed=true` — Deep probe including database latency check

---

## ⚙️ Environment Variables

The backend reads configuration from the monorepo root `.env` file (loaded via `@nestjs/config` and `dotenv-cli`):

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/tailored_cv?schema=public

# Security & Authentication
PEPPER=your_32_byte_hex_pepper
INITIAL_USER_EMAIL=admin@example.com
INITIAL_USER_PASSWORD=YourPassword123!
INITIAL_USER_NAME=Admin
INITIAL_USER_USERNAME=admin

# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Networking
API_PORT=3001
CORS_ORIGIN=http://localhost:3000
DB_POOL_MAX=10
RUN_MIGRATIONS=true
```

---

## 🗄️ Database Workflow (Prisma 7)

Prisma 7 uses a driver adapter pattern with `pg.Pool` without hardcoding database URLs into `schema.prisma`.

```bash
# Generate Prisma Client
pnpm --filter api prisma:generate

# Create or apply database migrations
pnpm --filter api prisma:migrate

# Deploy migrations in production / CI
pnpm --filter api prisma:migrate:deploy

# Execute TypeScript database seeder
pnpm --filter api seed
```

---

## 🚀 Development & Scripts

All commands can be executed from the monorepo root:

```bash
# Start API in development watch mode
pnpm --filter api dev

# Compile TypeScript production build into dist/
pnpm --filter api build

# Run unit and integration tests with Vitest
pnpm --filter api test

# Type-check without emitting files
pnpm --filter api typecheck

# Lint files with ESLint 9
pnpm --filter api lint
```
