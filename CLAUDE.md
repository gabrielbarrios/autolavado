# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Next.js 16 warning**: this version has breaking changes from training data. Read `node_modules/next/dist/docs/` before writing Next.js code. Notably: `cookies()` / `headers()` are **async**, and the middleware file is `proxy.ts` at the project root (exporting a `proxy` function), not `middleware.ts`.

## Repo shape

Monorepo with two independent npm projects plus a Postgres container:

- `frontend/` — Next.js 16 (App Router, React 19.2), TS, Tailwind v4, shadcn/ui, React Hook Form + Zod, TanStack Query/Table.
- `backend/` — Strapi 5 (TS) on PostgreSQL 16. Uses `pnpm-workspace.yaml` but the day-to-day tooling is npm.
- `docker-compose.yml` — Postgres only. **Maps host `5433` → container `5432`** (so Strapi connects to `localhost:5433`).

## Common commands

```bash
# Postgres (from repo root)
docker compose up -d
docker compose down

# Backend (Strapi)  — http://localhost:1337/admin
cd backend && npm install && npm run develop      # dev w/ autoReload
cd backend && npm run build && npm start          # production
cd backend && npm run upgrade:dry                 # check for Strapi upgrades

# Frontend (Next.js) — http://localhost:3000
cd frontend && npm install && npm run dev
cd frontend && npm run build
cd frontend && npm run typecheck                  # tsc --noEmit
cd frontend && npm run lint                       # eslint
```

There are **no tests** wired up in either package.

## Architecture

### Auth flow (frontend ↔ Strapi)

Strapi is the source of truth for identity. The frontend never exposes the JWT to the browser:

1. Server Action ([frontend/src/actions/auth.ts](frontend/src/actions/auth.ts)) calls Strapi `/api/auth/local` (or `/local/register`).
2. JWT is stored in an **httpOnly cookie** named `autolavado_session` ([frontend/src/lib/auth/cookies.ts](frontend/src/lib/auth/cookies.ts)).
3. Every server-side Strapi call goes through [`strapiServerFetch`](frontend/src/lib/strapi/server.ts), which reads the cookie and forwards the JWT as `Authorization: Bearer`.
4. Privileged server-only calls use `strapiAdminFetch` with `STRAPI_ADMIN_API_TOKEN` (Strapi "Full access" token).
5. `getSession()` in [frontend/src/lib/auth/session.ts](frontend/src/lib/auth/session.ts) is `cache()`-wrapped per request and re-validates the JWT against Strapi `/users/me`.

[frontend/proxy.ts](frontend/proxy.ts) is the **Next.js middleware** (named `proxy`, not `middleware`). It enforces route-group access by checking the session cookie's existence only — it does not verify the JWT. The real check happens on every Server Component / Server Action via `getSession()`.

### Frontend route groups

`frontend/src/app/` uses App Router route groups to gate sections by role:

- `(marketing)` — public landing, paquetes, tienda, contacto.
- `(auth)` — login, registro, recuperar (redirects logged-in users to `/perfil`).
- `(cliente)` — perfil, autos, reservar, historial, promociones, qr, pedidos, carrito/checkout.
- `(admin)` — dashboard, escanear, walk-in, en-progreso, clientes, paquetes-admin, productos-admin, snacks, promociones-admin, extras-admin, reservaciones, servicios, empleados.

The protected-route lists live in [frontend/proxy.ts](frontend/proxy.ts); update them there when adding new gated routes.

### Roles and who gets which admin page

Five roles, all of them users-permissions roles created idempotently by `bootstrap`: `cliente` (`authenticated`), `vip`, `employee`, `admin`, `superadmin`. `resolveRole` ([frontend/src/lib/auth/session.ts](frontend/src/lib/auth/session.ts)) maps the Strapi role onto that union.

The `(admin)` layout is gated by **`requireStaff()`** — employees, admins and super admins all get in. Which page each one sees is decided **inside the page**:

- Employee-visible pages (dashboard, escanear, walk-in, en-progreso, reservaciones) need no extra guard. The list is `EMPLOYEE_ROUTES` in [frontend/src/lib/constants.ts](frontend/src/lib/constants.ts), and it also drives the sidebar in `AdminShell`.
- Every other `(admin)` page **must call `await requireAdmin()` first** — hiding the nav item is not access control. A new admin page without that call is reachable by an employee who types the URL.
- `requireSuperAdmin()` for the owner-only pages (empleados).

The backend mirror of `EMPLOYEE_ROUTES` is `EMPLOYEE_PERMISSIONS` in [backend/src/index.ts](backend/src/index.ts): the employee gets the whole `qr` counter API plus read-only catalog, but no create/delete on anything the owner administers. Adding an employee screen means touching both lists.

`isAdminLike()` ([backend/src/utils/owner-scope.ts](backend/src/utils/owner-scope.ts)) means "works the counter" and **includes employees** — it is what lets them see other customers' appointments and services. For "may administer the catalog", use `isCatalogAdmin()` instead.

### Vehicle types are data, not an enum

`vehicleType` used to be an `enumeration` in three schemas (`vehicle`, `service`, `shared.vehicle-type-price`). It is now a plain `string` holding the **slug** of an `api::vehicle-type` entry, which the owner creates/edits/deletes in the Strapi Content Manager ("Tipo de auto").

- The stored value is the slug, so **renaming a type's `name` is safe; changing its `slug` orphans** every vehicle, service and pricing row that still points at the old one.
- The schemas no longer validate the value. `validateVehicleTypeSlug` ([backend/src/utils/vehicle-types.ts](backend/src/utils/vehicle-types.ts)) does, and is called from the `vehicle` controller and from `qr.walkInService`.
- The frontend reads the catalog with `listVehicleTypes()` and hands it to client components through `VehicleTypesProvider` / `useVehicleTypes()`, mounted in the three route-group layouts. `FALLBACK_VEHICLE_TYPES` in [frontend/src/lib/pricing.ts](frontend/src/lib/pricing.ts) is only a safety net for when the catalog can't be fetched — it is not the source of truth.
- `bootstrap` seeds the original five types **only when the collection is empty**, so a deleted type never comes back.

### Strapi domain helpers

[frontend/src/lib/strapi/](frontend/src/lib/strapi/) has one file per content type (`vehicles.ts`, `appointments.ts`, `packages.ts`, `orders.ts`, etc.). All HTTP goes through `strapiFetch` / `strapiServerFetch` / `strapiAdminFetch` — do not introduce raw `fetch` calls to Strapi elsewhere. Per-user filtering is done by appending `filters[user][id][$eq]=<id>` from the frontend.

### Strapi backend layout

Standard Strapi 5 structure under [backend/src/api/](backend/src/api/): `appointment`, `vehicle`, `vehicle-type`, `package`, `product`, `snack`, `order`, `order-item`, `service`, `visit`, `promotion`, `loyalty-progress`, `site-setting`, `extra-service`, and a custom `qr` API.

Write endpoints address entries by **numeric id, not `documentId`** — the Strapi 5 default. That is why `promotion`, `vehicle` and `snack` override `update`/`delete` instead of using the core controller: a new collection the frontend has to edit needs the same override (see [backend/src/api/snack/controllers/snack.ts](backend/src/api/snack/controllers/snack.ts)).

[backend/src/index.ts](backend/src/index.ts) does two important things at bootstrap, idempotently:

- **`register`**: subscribes a `beforeCreate` lifecycle on `plugin::users-permissions.user` that auto-generates `qrToken = randomUUID()` for every new user.
- **`bootstrap`**: ensures an `Admin` users-permissions role exists, then grants `PUBLIC_PERMISSIONS`, `AUTHENTICATED_PERMISSIONS`, and `ADMIN_PERMISSIONS` to the respective roles. **Edit the permission maps in `index.ts` — do not rely on configuring permissions through the admin UI**, since the bootstrap will re-apply on next start.

The custom `qr` API exposes `POST /api/qr/scan`, `POST /api/qr/register-visit`, and `POST /api/qr/walk-in-service`. See [STRAPI_SETUP.md](STRAPI_SETUP.md) for the full data model, lifecycle hooks (3-visit loyalty promo), and content-type definitions.

### Environment

Two `.env` files matter:

- Repo root `.env` → variables consumed by `docker-compose.yml` (`DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- `backend/.env` → Strapi secrets + DB connection. **`DATABASE_PORT=5433`** (matches the docker-compose host port mapping).
- `frontend/.env.local` → `STRAPI_API_URL` (server-side), `NEXT_PUBLIC_STRAPI_URL` (for `<Image>` media URLs), `STRAPI_ADMIN_API_TOKEN`, `SESSION_COOKIE_NAME`.
