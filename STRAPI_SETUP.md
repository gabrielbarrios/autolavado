# Setup Strapi 5 — guía paso a paso

Esta guía complementa la instalación automática. Después de `npm install` en `backend/`, sigue estos pasos.

## 1. Arrancar Strapi

```bash
docker compose up -d              # postgres en :5432
cd backend
cp .env.example .env              # editar APP_KEYS, JWT_SECRET, etc.
npm run develop                   # abre http://localhost:1337/admin
```

Crea el primer usuario admin en la pantalla inicial.

## 2. Content Types

Ve a **Content-Type Builder** y crea los siguientes:

### Components (primero los componentes)

#### `shared.faq`
- `question` — Text (short)
- `answer` — Text (long)

#### `shared.testimonial`
- `name` — Text (short)
- `role` — Text (short)
- `message` — Text (long)
- `rating` — Number (integer)
- `avatar` — Media (single)

#### `shared.contact-info`
- `address` — Text (short)
- `phone` — Text (short)
- `email` — Email
- `mapUrl` — Text (short)
- `social` — JSON

### Collection Types

#### `vehicle`
- `brand` — Text (short, required)
- `model` — Text (short, required)
- `year` — Integer (required)
- `color` — Text (short, required)
- `plate` — Text (short, required, unique)
- `notes` — Text (long)
- `photo` — Media (single)
- `user` — Relation: belongs to many → User (users-permissions)

#### `package`
- `name` — Text (short, required)
- `slug` — UID (target: name)
- `price` — Decimal (required)
- `durationMinutes` — Integer (required)
- `description` — Rich Text (Markdown)
- `benefits` — JSON
- `image` — Media (single)
- `featured` — Boolean (default false)
- `order` — Integer (default 0)

#### `service`
- `date` — DateTime (required)
- `notes` — Text (long)
- `totalAmount` — Decimal (required)
- `user` — Relation: many to one → User
- `vehicle` — Relation: many to one → Vehicle
- `package` — Relation: many to one → Package

#### `visit`
- `date` — DateTime (required)
- `notes` — Text (long)
- `user` — Relation: many to one → User
- `vehicle` — Relation: many to one → Vehicle
- `package` — Relation: many to one → Package

#### `promotion`
- `code` — UID
- `title` — Text (short, required)
- `description` — Text (long)
- `discountType` — Enumeration (`percent`, `fixed`, `free`)
- `discountValue` — Decimal
- `validFrom` — DateTime
- `validUntil` — DateTime
- `used` — Boolean (default false)
- `usedAt` — DateTime
- `user` — Relation: many to one → User

#### `loyalty-progress`
- `currentCount` — Integer (default 0)
- `cycleStartedAt` — DateTime
- `user` — Relation: one to one → User

#### `appointment`
- `date` — Date (required)
- `timeSlot` — Text (short, required, ej. "10:00")
- `status` — Enumeration (`pending`, `approved`, `cancelled`, `completed`) default `pending`
- `customerNotes` — Text (long)
- `adminNotes` — Text (long)
- `user` — Relation: many to one → User
- `vehicle` — Relation: many to one → Vehicle
- `package` — Relation: many to one → Package

#### `product`
- `name` — Text (short, required)
- `slug` — UID (target: name)
- `price` — Decimal (required)
- `stock` — Integer (required, default 0)
- `description` — Text (long)
- `category` — Enumeration (`limpieza`, `interior`, `exterior`, `accesorios`, `otros`)
- `active` — Boolean (default true)
- `images` — Media (multiple)

#### `order`
- `status` — Enumeration (`pending`, `paid`, `shipped`, `delivered`, `cancelled`) default `pending`
- `total` — Decimal (required)
- `customerNotes` — Text (long)
- `user` — Relation: many to one → User
- `items` — Relation: one to many → Order-Item

#### `order-item`
- `quantity` — Integer (required, default 1)
- `unitPrice` — Decimal (required)
- `product` — Relation: many to one → Product
- `order` — Relation: many to one → Order

### Single Types

#### `site-setting`
- `businessHours` — JSON
- `bookingSlotDuration` — Integer (minutos, default 60)
- `maxBookingsPerSlot` — Integer (default 2)
- `heroVideo` — Media (single)
- `faqs` — Component (repeatable) → `shared.faq`
- `testimonials` — Component (repeatable) → `shared.testimonial`
- `contactInfo` — Component (single) → `shared.contact-info`

### Extender el User de Users & Permissions

Ve a `Content-Type Builder → User (users-permissions)` y agrega los siguientes campos:

- `name` — Text (short)
- `phone` — Text (short)
- `qrToken` — UID (sin target, único)
- `visitCount` — Integer (default 0)
- `avatar` — Media (single)

## 3. Permisos

### Roles → Public
Habilita `find` y `findOne` para: `package`, `product`, `site-setting`. También deja abiertos los endpoints de `auth/*` (ya están por default).

### Roles → Authenticated
Habilita:
- `vehicle`: find, findOne, create, update, delete (todo, el filter por user lo hace el frontend).
- `appointment`: find, findOne, create, update.
- `order`, `order-item`: find, findOne, create.
- `promotion`, `loyalty-progress`, `visit`, `service`: find, findOne.

> **Importante**: para que cada cliente solo vea sus propios recursos, el frontend incluye filtros `filters[user][id][$eq]=<id>`. Para reforzarlo en backend, considera middlewares custom o policies en cada controller.

### Custom Admin role
Crea un rol "Admin" (en `Settings → Users & Permissions Plugin → Roles → Add new role`) con permisos completos (`*`) sobre todos los content types y los endpoints `/api/qr/*`. Asigna este rol manualmente a los usuarios administradores.

## 4. API Token para llamadas privilegiadas

`Settings → API Tokens → Create new API Token`:
- Name: `frontend-admin`
- Token type: `Full access`
- Duration: `Unlimited`

Copia el token al `frontend/.env.local`:
```
STRAPI_ADMIN_API_TOKEN=eyJhbGc...
```

## 5. Lifecycle hooks (custom code)

### Generación automática de `qrToken` al registrar usuario

En `backend/src/extensions/users-permissions/strapi-server.ts`:

```ts
import crypto from "node:crypto";

export default (plugin) => {
  const originalRegister = plugin.controllers.auth.register;
  plugin.controllers.auth.register = async (ctx) => {
    ctx.request.body.qrToken = crypto.randomUUID();
    return originalRegister(ctx);
  };
  return plugin;
};
```

### Auto-promoción cada 3 visitas

`backend/src/api/visit/content-types/visit/lifecycles.ts`:

```ts
import crypto from "node:crypto";

export default {
  async afterCreate(event) {
    const { result } = event;
    if (!result.user) return;
    const userId = result.user.id ?? result.user;

    // Obtener o crear loyalty-progress
    const list = await strapi.entityService.findMany("api::loyalty-progress.loyalty-progress", {
      filters: { user: userId },
      limit: 1,
    });
    let progress = list[0];
    if (!progress) {
      progress = await strapi.entityService.create("api::loyalty-progress.loyalty-progress", {
        data: { user: userId, currentCount: 1, cycleStartedAt: new Date() },
      });
    } else {
      progress = await strapi.entityService.update(
        "api::loyalty-progress.loyalty-progress",
        progress.id,
        { data: { currentCount: progress.currentCount + 1 } },
      );
    }

    // ¿Toca generar promoción?
    if (progress.currentCount >= 3) {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await strapi.entityService.create("api::promotion.promotion", {
        data: {
          code: `PROMO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          title: "10% off por fidelidad",
          description: "Acumulaste 3 visitas. ¡Disfruta este descuento en tu próximo servicio!",
          discountType: "percent",
          discountValue: 10,
          validFrom: now,
          validUntil,
          used: false,
          user: userId,
          publishedAt: now,
        },
      });
      await strapi.entityService.update(
        "api::loyalty-progress.loyalty-progress",
        progress.id,
        { data: { currentCount: 0, cycleStartedAt: now } },
      );
    }
  },
};
```

## 6. Custom routes para QR

Crea estos archivos:

### `backend/src/api/qr/routes/qr.ts`
```ts
export default {
  routes: [
    { method: "POST", path: "/qr/scan", handler: "qr.scan", config: { policies: [], middlewares: [] } },
    { method: "POST", path: "/qr/register-visit", handler: "qr.registerVisit", config: { policies: [], middlewares: [] } },
  ],
};
```

### `backend/src/api/qr/controllers/qr.ts`
```ts
export default {
  async scan(ctx) {
    const { qrToken } = ctx.request.body ?? {};
    if (!qrToken) return ctx.badRequest("qrToken requerido");

    const users = await strapi.entityService.findMany("plugin::users-permissions.user", {
      filters: { qrToken },
      populate: { avatar: true, role: true },
      limit: 1,
    });
    const user = users[0];
    if (!user) return ctx.notFound("Usuario no encontrado");

    const [vehicles, loyaltyArr, activePromotions] = await Promise.all([
      strapi.entityService.findMany("api::vehicle.vehicle", {
        filters: { user: user.id },
        populate: { photo: true },
      }),
      strapi.entityService.findMany("api::loyalty-progress.loyalty-progress", {
        filters: { user: user.id },
        limit: 1,
      }),
      strapi.entityService.findMany("api::promotion.promotion", {
        filters: { user: user.id, used: false },
      }),
    ]);

    ctx.body = {
      user,
      vehicles,
      loyaltyProgress: loyaltyArr[0] ?? null,
      activePromotions,
    };
  },

  async registerVisit(ctx) {
    const { userId, vehicleId, packageId, notes } = ctx.request.body ?? {};
    if (!userId || !vehicleId || !packageId) return ctx.badRequest("Faltan datos");

    const pkg = await strapi.entityService.findOne("api::package.package", packageId);
    if (!pkg) return ctx.notFound("Paquete no encontrado");

    const now = new Date();
    const visit = await strapi.entityService.create("api::visit.visit", {
      data: { date: now, notes, user: userId, vehicle: vehicleId, package: packageId, publishedAt: now },
    });
    const service = await strapi.entityService.create("api::service.service", {
      data: {
        date: now,
        notes,
        totalAmount: pkg.price,
        user: userId,
        vehicle: vehicleId,
        package: packageId,
        publishedAt: now,
      },
    });

    // Releer loyalty + última promo (el lifecycle del visit ya las modificó)
    const [loyaltyArr, latestPromos] = await Promise.all([
      strapi.entityService.findMany("api::loyalty-progress.loyalty-progress", {
        filters: { user: userId },
        limit: 1,
      }),
      strapi.entityService.findMany("api::promotion.promotion", {
        filters: { user: userId },
        sort: { createdAt: "desc" },
        limit: 1,
      }),
    ]);
    const loyalty = loyaltyArr[0];
    const newest = latestPromos[0];
    const justGenerated =
      newest && new Date(newest.createdAt).getTime() > now.getTime() - 5000 ? newest : null;

    ctx.body = {
      visit: { id: visit.id, date: visit.date },
      service: { id: service.id },
      promotionGenerated: justGenerated,
      loyaltyProgress: loyalty,
    };
  },
};
```

(El archivo `services/qr.ts` puede quedar vacío `export default {};`.)

## 7. Reinicia Strapi y prueba

```bash
cd backend
npm run develop
```

Desde el frontend (`cd frontend && npm run dev`):
1. Visita `http://localhost:3000` → landing.
2. `/registro` → crear cliente.
3. `/qr` → ver tu QR.
4. En otra pestaña, loguéate como admin (asignaste el rol) → `/escanear` → escanear QR.
5. Registra 3 visitas → ve a `/promociones` como cliente → debe aparecer la promoción auto-generada.
