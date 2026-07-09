// @ts-nocheck
import crypto from 'node:crypto';
import type { Core } from '@strapi/strapi';

/**
 * Permisos que se aplican automáticamente al arrancar Strapi.
 * Idempotente: si ya existen, no se duplican.
 */
const PUBLIC_PERMISSIONS: Record<string, string[]> = {
  'api::package.package': ['find', 'findOne'],
  'api::product.product': ['find', 'findOne'],
  'api::extra-service.extra-service': ['find', 'findOne'],
  'api::site-setting.site-setting': ['find'],
};

const AUTHENTICATED_PERMISSIONS: Record<string, string[]> = {
  'plugin::users-permissions.user': ['me'],
  'api::package.package': ['find', 'findOne'],
  'api::product.product': ['find', 'findOne'],
  'api::extra-service.extra-service': ['find', 'findOne'],
  'api::site-setting.site-setting': ['find'],
  'api::vehicle.vehicle': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::appointment.appointment': ['find', 'findOne', 'create', 'update', 'availableSlots'],
  'api::order.order': ['find', 'findOne', 'create'],
  'api::order-item.order-item': ['find', 'findOne', 'create'],
  'api::visit.visit': ['find', 'findOne'],
  'api::service.service': ['find', 'findOne'],
  'api::promotion.promotion': ['find', 'findOne', 'update'],
  'api::loyalty-progress.loyalty-progress': ['find', 'findOne'],
};

/**
 * Permisos del rol Admin (dueño del autolavado).
 * CRUD total sobre todo + endpoints QR + lectura de site-setting.
 */
const ADMIN_PERMISSIONS: Record<string, string[]> = {
  // Plugin users-permissions: necesario para /api/users/me y listar clientes
  'plugin::users-permissions.user': ['me', 'find', 'findOne', 'update', 'count'],
  'plugin::users-permissions.role': ['find', 'findOne'],

  'api::package.package': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::product.product': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::extra-service.extra-service': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::site-setting.site-setting': ['find', 'update'],
  'api::vehicle.vehicle': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::appointment.appointment': ['find', 'findOne', 'create', 'update', 'delete', 'availableSlots'],
  'api::order.order': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::order-item.order-item': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::visit.visit': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::service.service': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::promotion.promotion': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::loyalty-progress.loyalty-progress': ['find', 'findOne', 'create', 'update', 'delete'],
  'api::qr.qr': [
    'scan',
    'registerVisit',
    'walkInService',
    'inProgressServices',
    'board',
    'startService',
    'finishService',
    'chargeService',
    'cancelService',
  ],
};

/**
 * Permisos del Super Admin: todo lo del Admin + el panel de empleados
 * (employeeStats) para supervisar a los administradores.
 */
const SUPERADMIN_PERMISSIONS: Record<string, string[]> = {
  ...ADMIN_PERMISSIONS,
  'api::qr.qr': [
    'scan',
    'registerVisit',
    'walkInService',
    'inProgressServices',
    'board',
    'startService',
    'finishService',
    'chargeService',
    'cancelService',
    'employeeStats',
  ],
};

/** Email del dueño que se promueve automáticamente a Super Admin en el arranque. */
const OWNER_EMAIL = 'dark_finder@hotmail.com';

async function ensureRoleExists(type: string, name: string, description: string) {
  const existing = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type },
  });
  if (existing) return existing;

  const created = await strapi.db.query('plugin::users-permissions.role').create({
    data: { name, description, type },
  });
  strapi.log.info(`[bootstrap] Created users-permissions role "${name}"`);
  return created;
}

async function ensureAdminRoleExists() {
  return ensureRoleExists('admin', 'Admin', 'Administrador del autolavado — acceso total');
}

async function ensureSuperAdminRoleExists() {
  return ensureRoleExists(
    'superadmin',
    'Super Admin',
    'Dueño — supervisa a los administradores (empleados) además del acceso total',
  );
}

/**
 * Promueve la cuenta del dueño (OWNER_EMAIL) al rol Super Admin si existe y
 * todavía no lo tiene. Idempotente.
 */
async function promoteOwnerToSuperAdmin() {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'superadmin' },
  });
  if (!role) return;
  const owner = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email: OWNER_EMAIL },
    populate: { role: true },
  });
  if (!owner) {
    strapi.log.info(`[bootstrap] Owner ${OWNER_EMAIL} aún no existe; no se promueve.`);
    return;
  }
  if (owner.role?.id === role.id) return;
  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: owner.id },
    data: { role: role.id },
  });
  strapi.log.info(`[bootstrap] Promoted ${OWNER_EMAIL} to Super Admin`);
}

/**
 * Multiplicadores por tipo de auto sobre el precio base legacy de un extra-service.
 */
const EXTRA_PRICING_MULTIPLIERS: Record<string, number> = {
  chico: 0.85,
  sedan: 1.0,
  suv: 1.25,
  camioneta_grande: 1.4,
  combi: 1.55,
};
const ALL_VEHICLE_TIERS = Object.keys(EXTRA_PRICING_MULTIPLIERS);

/**
 * Normaliza el componente `pricing` de un registro:
 * - Asegura una fila por cada tipo de auto (rellenando faltantes con multiplicadores sobre base).
 * - Si existe una fila legacy con vehicleType="uber_taxi", o un campo top-level `uberTaxiPrice`,
 *   copia ese valor al `uberTaxiPrice` de cada fila (cuando no esté ya definido) y elimina la fila uber_taxi.
 * - Devuelve `{ pricing, changed }` o `null` si nada cambió.
 *
 * `base`: valor para calcular precios faltantes (si hay extras sin price configurado).
 */
function normalizePricingRows(
  existing: any[],
  legacyTopLevelUberPrice: number | null,
  base: number,
  options: { fillMissingTiers: boolean } = { fillMissingTiers: true },
): { pricing: any[]; changed: boolean } | null {
  let changed = false;

  // Encuentra fila legacy uber_taxi (si existe)
  const legacyUberRow = existing.find((p) => p.vehicleType === 'uber_taxi');
  const legacyUberPrice =
    legacyUberRow && legacyUberRow.price != null
      ? Number(legacyUberRow.price)
      : legacyTopLevelUberPrice;

  // Quita la fila uber_taxi del array de salida
  let rows = existing
    .filter((p) => p.vehicleType !== 'uber_taxi')
    .map((p) => ({
      vehicleType: p.vehicleType,
      price: Number(p.price ?? 0),
      uberTaxiPrice: p.uberTaxiPrice != null ? Number(p.uberTaxiPrice) : null,
    }));

  if (legacyUberRow) changed = true;

  // Rellena tipos faltantes (solo si fillMissingTiers)
  if (options.fillMissingTiers) {
    const present = new Set(rows.map((r) => r.vehicleType));
    for (const tier of ALL_VEHICLE_TIERS) {
      if (present.has(tier)) continue;
      const mult = EXTRA_PRICING_MULTIPLIERS[tier] ?? 1;
      rows.push({
        vehicleType: tier,
        price: Math.round(base * mult),
        uberTaxiPrice: null,
      });
      changed = true;
    }
  }

  // Aplica el uberTaxiPrice legacy a las filas que no lo tengan
  if (legacyUberPrice != null) {
    rows = rows.map((r) => {
      if (r.uberTaxiPrice == null) {
        changed = true;
        return { ...r, uberTaxiPrice: legacyUberPrice };
      }
      return r;
    });
  }

  if (!changed) return null;
  return { pricing: rows, changed };
}

async function seedExtraServicePricing() {
  const extras = await strapi.db.query('api::extra-service.extra-service').findMany({
    populate: { pricing: true },
  });

  for (const ex of extras) {
    const existing: any[] = Array.isArray(ex.pricing) ? ex.pricing : [];
    const base = Number(ex.price ?? 0) > 0 ? Number(ex.price) : 200;
    const legacyTopLevel = ex.uberTaxiPrice != null ? Number(ex.uberTaxiPrice) : null;
    const result = normalizePricingRows(existing, legacyTopLevel, base, {
      fillMissingTiers: true,
    });
    if (!result) continue;
    await strapi.entityService.update('api::extra-service.extra-service', ex.id, {
      data: { pricing: result.pricing },
    });
    strapi.log.info(`[bootstrap] Extra-service "${ex.name}": normalized pricing rows`);
  }
}

async function migratePackagePricing() {
  const packages = await strapi.db.query('api::package.package').findMany({
    populate: { pricing: true },
  });

  for (const pkg of packages) {
    const existing: any[] = Array.isArray(pkg.pricing) ? pkg.pricing : [];
    const legacyTopLevel = pkg.uberTaxiPrice != null ? Number(pkg.uberTaxiPrice) : null;
    // Para packages NO rellenamos tipos faltantes (los configura el admin manualmente)
    const result = normalizePricingRows(existing, legacyTopLevel, 0, {
      fillMissingTiers: false,
    });
    if (!result) continue;
    await strapi.entityService.update('api::package.package', pkg.id, {
      data: { pricing: result.pricing },
    });
    strapi.log.info(`[bootstrap] Package "${pkg.name}": normalized pricing rows`);
  }
}

async function ensureRolePermissions(roleType: string, map: Record<string, string[]>) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
    populate: { permissions: true },
  });
  if (!role) return;

  const existing = new Set((role.permissions ?? []).map((p) => p.action));

  for (const [uid, actions] of Object.entries(map)) {
    for (const action of actions) {
      const fullAction = `${uid}.${action}`;
      if (existing.has(fullAction)) continue;
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action: fullAction, role: role.id },
      });
      strapi.log.info(`[bootstrap] Granted ${fullAction} to ${roleType}`);
    }
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    // Lifecycle: genera un qrToken UUID al crear cualquier user
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      beforeCreate(event) {
        if (!event.params.data) event.params.data = {};
        if (!event.params.data.qrToken) {
          event.params.data.qrToken = crypto.randomUUID();
        }
      },
    });

    // Lifecycle: cada Visit creada suma fidelidad.
    // NOTA: se registra aquí (subscribe global) y NO en
    // content-types/visit/lifecycles.ts porque, igual que con el qrToken del user,
    // los lifecycles por-archivo no disparan de forma fiable en este proyecto.
    // Re-consultamos la Visit por id para obtener el user poblado (en afterCreate
    // event.result no trae relaciones).
    strapi.db.lifecycles.subscribe({
      models: ['api::visit.visit'],
      async afterCreate(event) {
        const visitId = event.result?.id;
        if (!visitId) return;

        const visit = await strapi.db.query('api::visit.visit').findOne({
          where: { id: visitId },
          populate: { user: true },
        });
        const userId = visit?.user?.id;
        if (!userId) return;

        const VISITS_FOR_REWARD = 3;
        const now = new Date();

        // Total de visitas de por vida del cliente (lo que ve el admin en Clientes/Dashboard).
        const userRecord = await strapi.entityService.findOne(
          'plugin::users-permissions.user',
          userId,
          { fields: ['visitCount'] },
        );
        await strapi.entityService.update('plugin::users-permissions.user', userId, {
          data: { visitCount: (userRecord?.visitCount ?? 0) + 1 },
        });

        // Progreso del ciclo de fidelidad (se resetea cada VISITS_FOR_REWARD).
        const existing = await strapi.entityService.findMany(
          'api::loyalty-progress.loyalty-progress',
          { filters: { user: userId }, limit: 1 },
        );
        let progress = existing[0];
        if (!progress) {
          progress = await strapi.entityService.create(
            'api::loyalty-progress.loyalty-progress',
            { data: { user: userId, currentCount: 1, cycleStartedAt: now } },
          );
        } else {
          progress = await strapi.entityService.update(
            'api::loyalty-progress.loyalty-progress',
            progress.id,
            { data: { currentCount: (progress.currentCount ?? 0) + 1 } },
          );
        }

        // Al completar el ciclo: genera promoción y reinicia el contador.
        if (progress.currentCount >= VISITS_FOR_REWARD) {
          const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await strapi.entityService.create('api::promotion.promotion', {
            data: {
              code: `PROMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
              title: '10% off por fidelidad',
              description: 'Acumulaste 3 visitas. ¡Disfruta este descuento en tu próximo servicio!',
              discountType: 'percent',
              discountValue: 10,
              validFrom: now,
              validUntil,
              used: false,
              user: userId,
              publishedAt: now,
            },
          });
          await strapi.entityService.update(
            'api::loyalty-progress.loyalty-progress',
            progress.id,
            { data: { currentCount: 0, cycleStartedAt: now } },
          );
        }
      },
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      await ensureAdminRoleExists();
      await ensureSuperAdminRoleExists();
      await ensureRolePermissions('public', PUBLIC_PERMISSIONS);
      await ensureRolePermissions('authenticated', AUTHENTICATED_PERMISSIONS);
      await ensureRolePermissions('admin', ADMIN_PERMISSIONS);
      await ensureRolePermissions('superadmin', SUPERADMIN_PERMISSIONS);
      await promoteOwnerToSuperAdmin();
    } catch (err) {
      strapi.log.error('[bootstrap] Error setting permissions:', err);
    }
    try {
      await seedExtraServicePricing();
      await migratePackagePricing();
    } catch (err) {
      strapi.log.error('[bootstrap] Error seeding/migrating pricing:', err);
    }
    try {
      await backfillServiceStatus();
    } catch (err) {
      strapi.log.error('[bootstrap] Error backfilling service status:', err);
    }
  },
};

/**
 * Para services existentes (creados antes de agregar el campo `status`),
 * marca como "completed" cualquier row con status NULL. Idempotente.
 */
async function backfillServiceStatus() {
  const knex = strapi.db.connection;
  const updated = await knex('services').whereNull('status').update({ status: 'completed' });
  if (updated > 0) {
    strapi.log.info(`[bootstrap] Backfilled status=completed en ${updated} services existentes`);
  }
}
