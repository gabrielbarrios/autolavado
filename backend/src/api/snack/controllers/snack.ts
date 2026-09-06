// @ts-nocheck
/**
 * snack controller
 *
 * Catálogo plano (nombre + precio) que el dueño mantiene desde el dashboard
 * (/snacks), no desde el panel de Strapi. `find` y `findOne` son los del core;
 * las escrituras se sobreescriben por dos motivos:
 *
 *   1. Ids numéricos, como el resto de la app (el core usa `documentId`).
 *   2. Un solo lugar donde se valida el nombre y el precio, venga de donde venga.
 */
import { factories } from '@strapi/strapi';

const UID = 'api::snack.snack';

/** Deja solo los campos escribibles y con un valor usable. */
function sanitize(data, { partial = false } = {}) {
  const out = {};

  if (!partial || data.name !== undefined) {
    out.name = String(data.name ?? '').trim().slice(0, 80);
  }
  if (!partial || data.price !== undefined) {
    const price = Number(data.price);
    out.price = Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : 0;
  }
  if (!partial || data.order !== undefined) {
    const order = Number(data.order);
    out.order = Number.isFinite(order) ? Math.trunc(order) : 0;
  }
  if (!partial || data.active !== undefined) {
    out.active = data.active !== false;
  }
  // `null` es un valor válido: así se saca un snack de su categoría. Por eso se
  // distingue "no vino en el body" de "vino vacío".
  if (data.category !== undefined) {
    const id = Number(data.category);
    out.category = Number.isFinite(id) && id > 0 ? id : null;
  }
  return out;
}

/** ¿Existe esa categoría? Un id inventado dejaría el snack sin agrupar y sin aviso. */
async function categoryExists(id) {
  if (id == null) return true;
  const found = await strapi.db
    .query('api::snack-category.snack-category')
    .findOne({ where: { id } });
  return !!found;
}

export default factories.createCoreController(UID, () => ({
  async create(ctx) {
    const data = sanitize(ctx.request.body?.data ?? {});
    if (!data.name) return ctx.badRequest('El snack necesita un nombre');
    if (!(data.price > 0)) return ctx.badRequest('El precio debe ser mayor a cero');

    if (!(await categoryExists(data.category))) return ctx.badRequest('Esa categoría no existe');

    const created = await strapi.entityService.create(UID, {
      data,
      populate: { category: true },
    });
    return { data: created };
  },

  async update(ctx) {
    const existing = await strapi.db.query(UID).findOne({ where: { id: ctx.params.id } });
    if (!existing) return ctx.notFound('Snack no encontrado');

    const data = sanitize(ctx.request.body?.data ?? {}, { partial: true });
    if ('name' in data && !data.name) return ctx.badRequest('El snack necesita un nombre');
    if ('price' in data && !(data.price > 0)) {
      return ctx.badRequest('El precio debe ser mayor a cero');
    }

    if ('category' in data && !(await categoryExists(data.category))) {
      return ctx.badRequest('Esa categoría no existe');
    }

    const updated = await strapi.entityService.update(UID, existing.id, {
      data,
      populate: { category: true },
    });
    return { data: updated };
  },

  async delete(ctx) {
    const existing = await strapi.db.query(UID).findOne({ where: { id: ctx.params.id } });
    if (!existing) return ctx.notFound('Snack no encontrado');

    await strapi.entityService.delete(UID, existing.id);
    return { data: { id: existing.id } };
  },
}));
