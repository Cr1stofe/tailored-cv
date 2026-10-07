# Tailored CV

> **Never invent. Only reframe.**

A high-performance full-stack web application designed for precise, ATS-friendly resume tailoring using the Google Gemini API, strict schema validation, and zero hallucinations.

The core principle guarantees that experience, technologies, metrics, job titles, companies, and qualifications are **never invented** — only restructured, prioritized, and aligned with the target job keywords and requirements.

---

## 🏛️ Architecture & Tech Stack

- **Monorepo:** [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) workspaces
- **Runtime:** Node.js 24 LTS (`v24.21.0`)
- **Frontend (`apps/web`):** Next.js 15 (App Router / React 19), SCSS Modules (Dark Luxury aesthetic), TypeScript strict, Lucide React, Sonner (toasts), React Hook Form + Zod, Zustand, BFF reverse proxy
- **Backend (`apps/api`):** NestJS 11 (Modular architecture, DTOs, Pipes, Exception Filters, Guards, Interceptors), TypeScript strict
- **Database & ORM:** PostgreSQL 17 + Prisma ORM 7 (Native `@prisma/adapter-pg` driver adapter with `pg.Pool`)
- **AI & Provider Abstraction:** `@google/genai` (Gemini API with provider abstraction and deterministic fallbacks)
- **Validation & Typing:** Zod (`packages/validation`), Strict TypeScript without `any` (`packages/types`)
- **Containerization:** Multi-stage Docker + Docker Compose (optimized for Linux VPS / Oracle Cloud / ARM & x86)

---

## 📂 Monorepo Structure

```text
tailored-cv/
├── apps/
│   ├── web/                     # Next.js 15 frontend (App Router & BFF)
│   │   ├── app/
│   │   │   ├── api/[...path]/   # BFF route handler forwarding to NestJS
│   │   │   ├── applications/    # Job application listing, creation, and tailored CV view
│   │   │   ├── login/           # Authentication UI
│   │   │   ├── profile/         # Master Profile management
│   │   │   ├── globals.scss
│   │   │   ├── layout.tsx       # Navbar + global Toaster
│   │   │   └── page.tsx         # Dashboard with metrics and history
│   │   ├── components/          # Reusable UI components
│   │   ├── services/            # Typed HTTP API client
│   │   ├── styles/              # SCSS design tokens and mixins
│   │   ├── Dockerfile           # Standalone multi-stage build
│   │   └── README.md            # Frontend-specific documentation
│   │
│   └── api/                     # NestJS 11 REST API
│       ├── prisma/              # Relational schema, migrations, and seed.ts
│       ├── src/
│       │   ├── ai/              # AI abstraction (AIProvider, GeminiProvider, MockProvider)
│       │   ├── auth/            # Session-based auth with secure cookies & Argon2id/Scrypt
│       │   ├── common/          # Global Filters, Guards, Interceptors, Pipes
│       │   ├── config/          # Typed environment configuration
│       │   ├── health/          # GET /health & PostgreSQL readiness probes
│       │   ├── job-application/ # Job CRUD, requirement extraction, and CV tailoring
│       │   ├── prisma/          # PrismaService with native driver adapter
│       │   ├── profile/         # Master Profile CRUD, caching, and seed loader
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── prisma.config.ts     # Central Prisma 7 configuration
│       ├── Dockerfile           # Multi-stage build with turbo prune
│       └── README.md            # Backend-specific documentation
│
├── packages/
│   ├── config/                  # Shared constants and configurations
│   ├── types/                   # Shared TypeScript models and interfaces
│   └── validation/              # Shared Zod schemas (single source of truth)
│
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.yml           # Production stack (isolated private networks)
├── docker-compose.dev.yml       # Development stack (binds 127.0.0.1:5432 to host)
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** `>= 24.0.0`
- **pnpm:** `>= 12.0.0`
- **Docker & Docker Compose**

---

### 1. Environment Configuration

Copy the example file to `.env`:

```bash
cp .env.example .env
```

Set the security, database, and API keys inside `.env`:

```env
# Password Encryption (Scrypt + Pepper)
# Generate a secure 32-byte hash (64 hex characters):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PEPPER=your_high_entropy_secret_pepper_here

# Initial Admin User (Auto-created during seed/initialization)
INITIAL_USER_EMAIL=user@example.com
INITIAL_USER_PASSWORD=YourStrongPassword123!
INITIAL_USER_NAME=Your Name
INITIAL_USER_USERNAME=your_username

# AI Provider (Google Gemini API)
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Security Note:** Secrets and credentials should never be committed to Git. The root `.gitignore` enforces exclusion of `.env` files.

---

### 2. Local Development (Hot-Reload Mode)

Recommended workflow for feature development, local debugging, and tests:

```bash
# 1. Install all monorepo dependencies
pnpm install

# 2. Start PostgreSQL container (bound to 127.0.0.1:5432 on host)
pnpm docker:db

# 3. Generate Prisma client, apply migrations, and run the official seed
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed

# 4. Start Frontend and Backend in watch mode via Turborepo
pnpm dev
```

Local access:

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API Health:** [http://localhost:3001/health](http://localhost:3001/health)
- **API Profile:** [http://localhost:3001/profile](http://localhost:3001/profile)
- **API Job Applications:** [http://localhost:3001/job-applications](http://localhost:3001/job-applications)

---

### 3. Containerized Execution (Production Standard)

In production mode, **only port 3000 (Frontend)** is exposed to the host. The API (`3001`) and PostgreSQL (`5432`) communicate privately over the internal bridge network (`tailored-cv-net`). The database seed executes automatically on the API container's initial boot.

```bash
# Build and run the entire stack in detached mode
pnpm docker:prod
# or: docker compose up --build -d
```

Check container status and logs:

```bash
docker compose ps
docker compose logs -f
```

---

## 📦 Applications & Packages

- **[`apps/web`](apps/web/README.md)** — Next.js 15 frontend application (App Router, React 19, Dark Luxury design system, and BFF reverse proxy).
- **[`apps/api`](apps/api/README.md)** — NestJS 11 backend service (Prisma 7, Scrypt + Pepper authentication, Gemini AI provider, and REST endpoints).
- **`packages/validation`** — Shared Zod schemas ensuring end-to-end type safety and anti-hallucination contracts.
- **`packages/types`** — Shared TypeScript models and interfaces.
- **`packages/config`** — Shared cross-application configuration constants.

---

## 🛠️ Monorepo Scripts

| Command                | Description                                                                  |
| :--------------------- | :--------------------------------------------------------------------------- |
| `pnpm dev`             | Starts Frontend and Backend in watch mode via Turborepo                      |
| `pnpm build`           | Compiles all applications and shared packages (`apps/*`, `packages/*`)       |
| `pnpm lint`            | Runs ESLint across all projects with zero tolerance for warnings             |
| `pnpm format`          | Formats code with Prettier                                                   |
| `pnpm format:check`    | Checks formatting compliance without writing files                           |
| `pnpm typecheck`       | Strict TypeScript type-checking without `any`                                |
| `pnpm test`            | Runs the automated test suite with Vitest                                    |
| `pnpm docker:db`       | Boots PostgreSQL for local development with `127.0.0.1:5432` exposed to host |
| `pnpm docker:dev`      | Starts full containerized development stack                                  |
| `pnpm docker:prod`     | Starts full containerized production stack with strict private networking    |
| `pnpm docker:seed`     | Triggers database seeding inside the running API container                   |
| `pnpm docker:down`     | Shuts down and cleans up project containers                                  |
| `pnpm prisma:generate` | Generates typed Prisma Client 7                                              |
| `pnpm prisma:migrate`  | Applies Prisma migrations                                                    |
| `pnpm prisma:seed`     | Runs TypeScript seed script (`prisma/seed.ts`)                               |
| `pnpm prisma:studio`   | Opens Prisma Studio GUI for database inspection                              |

---

## 🛡️ Anti-Hallucination Framework (Never invent. Only reframe)

Tailored CV strictly enforces data integrity when interacting with LLMs:

1. **Master Profile is the Single Source of Truth:** External URLs (LinkedIn, GitHub, Portfolio) function purely as contact links, not as sources to fabricate unverified experience.
2. **Permitted Transformations:** Chronological and thematic restructuring, highlighting relevant accomplishments, aligning terminology with job descriptions, and refining summaries based on existing facts.
3. **Strictly Forbidden:** Inventing technologies or programming languages, synthesizing arbitrary metrics, inflating job titles or seniority levels, and fabricating non-existent employers.
4. **Schema Enforcement:** Every AI response is structured and validated against shared Zod schemas (`packages/validation`) before reaching storage or the client.
