// @ts-nocheck
/**
 * snack-category controller
 *
 * Las categorías las crea el dueño desde /snacks-admin. Mismo trato que el
 * `snack`: ids numéricos (el core usa `documentId`) y validación en un solo
 * sitio.
 *
 * Borrar una categoría NO borra sus snacks: la relación queda en null y esos
 * snacks caen en el grupo "Sin categoría". Es a propósito — la lista de precios
 * no debe perderse por reorganizar el menú.
 */
import { factories } from '@strapi/strapi';

const UID = 'api::snack-category.snack-category';

function sanitize(data, { partial = false } = {}) {
  const out = {};
  if (!partial || data.name !== undefined) {
    out.name = String(data.name ?? '').trim().slice(0, 60);
  }
  if (!partial || data.order !== undefined) {
    const order = Number(data.order);
    out.order = Number.isFinite(order) ? Math.trunc(order) : 0;
  }
  if (!partial || data.active !== undefined) {
    out.active = data.active !== false;
  }
  return out;
}

export default factories.createCoreController(UID, () => ({
  async create(ctx) {
    const data = sanitize(ctx.request.body?.data ?? {});
    if (!data.name) return ctx.badRequest('La categoría necesita un nombre');

    const dup = await strapi.db.query(UID).findOne({ where: { name: data.name } });
    if (dup) return ctx.badRequest('Ya existe una categoría con ese nombre');

    const created = await strapi.entityService.create(UID, { data });
    return { data: created };
  },

  async update(ctx) {
    const existing = await strapi.db.query(UID).findOne({ where: { id: ctx.params.id } });
    if (!existing) return ctx.notFound('Categoría no encontrada');

    const data = sanitize(ctx.request.body?.data ?? {}, { partial: true });
    if ('name' in data) {
      if (!data.name) return ctx.badRequest('La categoría necesita un nombre');
      const dup = await strapi.db.query(UID).findOne({ where: { name: data.name } });
      if (dup && dup.id !== existing.id) {
        return ctx.badRequest('Ya existe una categoría con ese nombre');
      }
    }

    const updated = await strapi.entityService.update(UID, existing.id, { data });
    return { data: updated };
  },

  async delete(ctx) {
    const existing = await strapi.db.query(UID).findOne({ where: { id: ctx.params.id } });
    if (!existing) return ctx.notFound('Categoría no encontrada');

    // Los snacks sobreviven sin categoría; Strapi limpia la relación al borrar.
    await strapi.entityService.delete(UID, existing.id);
    return { data: { id: existing.id } };
  },
}));
