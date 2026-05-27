# Autolavado — Sistema de Gestión Full-Stack

Monorepo con frontend Next.js 16 + backend Strapi 5 + PostgreSQL.

## Stack

- **Frontend**: Next.js 16 (App Router, React 19.2), TypeScript, Tailwind v4, shadcn/ui, React Hook Form, Zod, TanStack Query/Table
- **Backend**: Strapi 5 (TypeScript) con PostgreSQL
- **Auth**: JWT nativo de Strapi consumido vía cookies httpOnly desde Next.js
- **DB**: PostgreSQL 16 vía Docker Compose

## Estructura

```
autolavado/
├── frontend/              # Next.js 16
├── backend/               # Strapi 5
├── docker-compose.yml     # PostgreSQL
├── .env.example
└── README.md
```

## Setup inicial

### 1. PostgreSQL

```bash
cp .env.example .env
docker compose up -d
```

Verifica que esté corriendo:
```bash
docker compose ps
```

### 2. Backend (Strapi)

```bash
cd backend
cp .env.example .env
npm install
npm run develop
```

Abre `http://localhost:1337/admin` y crea el primer usuario admin.

Después en la UI:
1. **Content-Type Builder** → crear los content types listados en `backend/CONTENT_TYPES.md`.
2. **Settings → API Tokens** → crear un token "Full access", copiarlo a `frontend/.env.local` como `STRAPI_ADMIN_API_TOKEN`.
3. **Settings → Users & Permissions → Roles** → configurar permisos `Public` y `Authenticated`.

### 3. Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Scripts

| Comando | Descripción |
|---|---|
| `docker compose up -d` | Levantar PostgreSQL |
| `docker compose down` | Detener PostgreSQL |
| `cd backend && npm run develop` | Strapi en modo dev |
| `cd backend && npm run build && npm start` | Strapi producción |
| `cd frontend && npm run dev` | Next.js dev (puerto 3000) |
| `cd frontend && npm run build` | Build producción Next.js |
| `cd frontend && npm run typecheck` | Verificar tipos TS |

## Flujo de desarrollo

1. PostgreSQL levantado en Docker
2. Strapi corriendo en `:1337` (con sus content types y permisos configurados)
3. Next.js corriendo en `:3000`, consumiendo Strapi vía cookies httpOnly
# autolavado
