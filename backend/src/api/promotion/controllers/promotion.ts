// @ts-nocheck
/**
 * promotion controller
 *
 * - `find`/`findOne`: scope por dueño, pero con un matiz — las campañas no
 *   tienen dueño, así que un cliente debe ver SUS promos personales *y* las
 *   campañas. Por eso `find` no usa `ownerScopedFind` tal cual.
 * - `available`: el catálogo de lo que el cliente puede usar hoy, ya filtrado
 *   por las reglas de disponibilidad.
 */
import { factories } from '@strapi/strapi';
import { isAdminLike, ownerScopedFindOne } from '../../../utils/owner-scope';
import {
  isPromotionAvailable,
  describeDiscount,
  slugCode,
  generatePromotionCode,
} from '../../../utils/promotions';

export default factories.createCoreController('api::promotion.promotion', () => ({
  async find(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');
    const isAdmin = isAdminLike(ctx.state.user);

    const where = {};
    const incoming = ctx.query?.filters;
    if (incoming && typeof incoming === 'object') {
      // `used` llega como string y Postgres no compara boolean contra texto.
      for (const [k, v] of Object.entries(incoming)) {
        if (k === 'user') continue;
        where[k] = normalize(v);
      }
    }
    if (!isAdmin) {
      // Las suyas + las campañas (que son de todos).
      where.$or = [{ user: { id: userId } }, { user: null }];
    }

    const items = await strapi.db.query('api::promotion.promotion').findMany({
      where,
      populate: isAdmin ? { user: true, packages: true } : { packages: true },
      orderBy: [{ validUntil: 'asc' }],
      limit: 300,
    });
    return { data: items, meta: {} };
  },

  findOne: ownerScopedFindOne('api::promotion.promotion', {
    notFoundMessage: 'Promoción no encontrada',
  }),

  /**
   * Crear una campaña. Solo admin: es el catálogo de ofertas del negocio.
   * Se usan ids numéricos (no documentId) para ir parejo con el resto de la app.
   */
  async create(ctx) {
    if (!ctx.state.user?.id) return ctx.unauthorized('Sesión requerida');
    if (!isAdminLike(ctx.state.user)) return ctx.forbidden('Solo un administrador');

    const data = ctx.request.body?.data ?? {};
    const clean = sanitizeCampaign(data);
    if (!clean.title) return ctx.badRequest('El título es obligatorio');
    if (!clean.code) return ctx.badRequest('El código es obligatorio');

    const dup = await strapi.db
      .query('api::promotion.promotion')
      .findOne({ where: { code: clean.code } });
    if (dup) return ctx.badRequest('Ya existe una promoción con ese código');

    const created = await strapi.entityService.create('api::promotion.promotion', {
      data: { ...clean, used: false, user: null, publishedAt: new Date() },
    });
    return { data: created };
  },

  /**
   * Un admin edita cualquier promoción. Un cliente solo puede tocar la SUYA y
   * únicamente para marcarla como usada — antes podía marcar la de cualquiera.
   */
  async update(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const existing = await strapi.db.query('api::promotion.promotion').findOne({
      where: { id: ctx.params.id },
      populate: { user: true },
    });
    if (!existing) return ctx.notFound('Promoción no encontrada');

    const body = ctx.request.body?.data ?? {};
    let data;
    if (isAdminLike(ctx.state.user)) {
      data = sanitizeCampaign({ ...existing, ...body });
    } else {
      if (existing.user?.id !== userId) return ctx.forbidden('No es tu promoción');
      data = { used: !!body.used, usedAt: body.usedAt ?? new Date() };
    }

    const updated = await strapi.entityService.update('api::promotion.promotion', existing.id, {
      data,
    });
    return { data: updated };
  },

  async delete(ctx) {
    if (!ctx.state.user?.id) return ctx.unauthorized('Sesión requerida');
    if (!isAdminLike(ctx.state.user)) return ctx.forbidden('Solo un administrador');

    const existing = await strapi.db
      .query('api::promotion.promotion')
      .findOne({ where: { id: ctx.params.id } });
    if (!existing) return ctx.notFound('Promoción no encontrada');

    await strapi.entityService.delete('api::promotion.promotion', existing.id);
    return { data: { id: existing.id } };
  },

  /**
   * GET /api/promotions/available
   * Lo que el cliente puede usar hoy: sus promos personales sin gastar más las
   * campañas vigentes. La evaluación de disponibilidad se hace acá y no en el
   * frontend para que el cajero y el cliente vean exactamente lo mismo.
   */
  async available(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const promos = await strapi.db.query('api::promotion.promotion').findMany({
      where: { $or: [{ user: { id: userId } }, { user: null }] },
      populate: { packages: true },
      orderBy: [{ validUntil: 'asc' }],
      limit: 300,
    });

    const now = new Date();
    const data = promos
      .filter((p) => isPromotionAvailable(p, now))
      .map((p) => ({
        ...p,
        discountLabel: describeDiscount(p),
        // Nombres planos: el cliente solo necesita saber dónde puede usarla.
        packages: (p.packages ?? []).map((pkg) => pkg?.name).filter(Boolean),
      }));

    ctx.body = { data, meta: {} };
  },

  /**
   * GET /api/promotions/campaigns  — público (la ruta va con `auth: false`).
   *
   * El escaparate de la web: TODAS las campañas encendidas, aunque hoy no sea
   * su día ni estemos dentro de su rango de fechas. A diferencia de
   * `/available` (lo que el cajero puede aplicar AHORA), esto es publicidad:
   * cada tarjeta lleva su vigencia escrita para que el cliente sepa cuándo
   * volver. Apagar una campaña (`active: false`) es lo que la quita de aquí.
   *
   * Nunca salen promociones personales, y se devuelve un objeto recortado a
   * mano en vez de la entrada entera porque esto lo ve cualquiera: fuera
   * `code` (se menciona en caja, no hace falta publicarlo) y fuera cualquier
   * dato del dueño.
   */
  async campaigns(ctx) {
    const promos = await strapi.db.query('api::promotion.promotion').findMany({
      where: { kind: 'campaign', user: null },
      populate: { packages: true },
      orderBy: [{ validUntil: 'asc' }],
      limit: 100,
    });

    const data = promos
      .filter((p) => p.active !== false)
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        kind: p.kind,
        appliesTo: p.appliesTo,
        availability: p.availability,
        weekdays: p.weekdays,
        discountType: p.discountType,
        discountValue: p.discountValue,
        validFrom: p.validFrom,
        validUntil: p.validUntil,
        discountLabel: describeDiscount(p),
        packages: (p.packages ?? []).map((pkg) => pkg?.name).filter(Boolean),
      }));

    ctx.body = { data, meta: {} };
  },
}));

const AVAILABILITY = ['always', 'weekdays', 'dateRange'];
const APPLIES_TO = ['all', 'package', 'extras'];
const DISCOUNT_TYPES = ['percent', 'fixed', 'free'];

/**
 * Normaliza lo que manda el formulario del admin. Se limpia acá y no en el
 * cliente porque de esto depende cuánto dinero se descuenta.
 */
function sanitizeCampaign(data) {
  const availability = AVAILABILITY.includes(data.availability) ? data.availability : 'always';
  const discountType = DISCOUNT_TYPES.includes(data.discountType) ? data.discountType : 'percent';

  let discountValue = Number(data.discountValue ?? 0);
  if (!isFinite(discountValue) || discountValue < 0) discountValue = 0;
  // Un "120%" descontaría más que el ticket; el cálculo lo topa igual, pero
  // guardarlo así solo confunde al que lea el catálogo.
  if (discountType === 'percent') discountValue = Math.min(discountValue, 100);
  if (discountType === 'free') discountValue = 0;

  const weekdays =
    availability === 'weekdays'
      ? [...new Set((Array.isArray(data.weekdays) ? data.weekdays : []).map(Number))]
          .filter((n) => n >= 0 && n <= 6)
          .sort()
      : null;

  const title = String(data.title ?? '').trim();
  // Si no mandan código se deriva del título, con sufijo para que sea único.
  const code = slugCode(data.code) || generatePromotionCode(title);

  return {
    title,
    description: data.description ? String(data.description).trim() : null,
    code,
    kind: 'campaign',
    availability,
    weekdays,
    appliesTo: APPLIES_TO.includes(data.appliesTo) ? data.appliesTo : 'all',
    discountType,
    discountValue,
    // Las fechas solo significan algo si la disponibilidad las usa.
    validFrom: availability === 'always' ? null : (data.validFrom || null),
    validUntil: availability === 'always' ? null : (data.validUntil || null),
    active: data.active !== false,
  };
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}
