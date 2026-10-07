# Tailored CV — Web Frontend (`@tailored-cv/web`)

Modern, high-performance web interface built with **Next.js 15** (App Router & Turbopack), **React 19**, and strict TypeScript. Incorporates a **Dark Luxury** design system and an integrated **BFF (Backend For Frontend)** reverse proxy.

---

## 🏛️ Application Architecture & Routes

The application leverages the Next.js App Router for server and client orchestration:

| Route            | Type          | Description                                                                                                    |
| :--------------- | :------------ | :------------------------------------------------------------------------------------------------------------- |
| `/`              | Page          | Central Dashboard displaying summary metrics, application statuses, and recent tailoring activities            |
| `/applications`  | Page          | Job application list, new opportunity creation dialog, requirement matching score, and tailored CV inspection  |
| `/profile`       | Page          | Master Profile management interface for editing bio, contact info, and categorized technical competencies      |
| `/login`         | Page          | Secure credentials authentication screen                                                                       |
| `/api/[...path]` | Route Handler | **BFF Reverse Proxy** forwarding client requests to the NestJS API with automatic cookie and header forwarding |

---

## 🔄 BFF (Backend For Frontend) Proxy Pattern

All frontend API calls from the browser route to `/api/*` on port `3000`. The catch-all route handler located at `app/api/[...path]/route.ts` securely forwards requests to the upstream NestJS service:

```
[Browser]
    │ (calls /api/job-applications with session cookie)
    ▼
[Next.js BFF — apps/web/app/api/[...path]]
    │ (forwards payload, headers & cookies privately)
    ▼
[NestJS API — apps/api (internal network)]
```

This pattern ensures:

- **Zero CORS issues** in browser environments.
- **Strict cookie security**: `HttpOnly` session cookies remain on the same origin.
- **Network isolation**: In production Docker deployments, the NestJS API does not need to expose port `3001` to the public internet.

---

## 🎨 UI/UX & Design System

- **Styling:** Modular SCSS (`*.module.scss`) backed by central design variables and mixins (`styles/variables.scss`, `styles/mixins.scss`).
- **Aesthetic:** Dark Luxury palette with subtle borders, glassmorphic surfaces, and responsive micro-animations.
- **Forms & Validation:** `react-hook-form` powered by strict Zod schemas via `@hookform/resolvers/zod`.
- **State Management:** Decoupled atomic stores utilizing `zustand`.
- **Feedback & Icons:** `sonner` for non-intrusive toast notifications and `lucide-react` for iconography.

---

## ⚙️ Environment Variables

Configuration is loaded from root `.env`:

```env
# URL for the browser client (BFF proxy path or origin)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Internal API destination used by the BFF route handler to contact NestJS
INTERNAL_API_URL=http://localhost:3001
```

In production containerized setups, `INTERNAL_API_URL` points directly to the container service name: `http://api:3001`.

---

## 🚀 Development & Scripts

All commands can be executed from the monorepo root:

```bash
# Start Next.js development server with Turborepo on port 3000
pnpm --filter web dev

# Create optimized production build
pnpm --filter web build

# Start production server
pnpm --filter web start

# Lint files with ESLint
pnpm --filter web lint

# Verify type consistency with TypeScript compiler
pnpm --filter web typecheck
```
