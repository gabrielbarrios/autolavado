// @ts-nocheck
/**
 * vehicle controller
 *
 * - `create`/`update`/`delete` ignoran el `user` que mande el cliente y lo asignan
 *   desde `ctx.state.user` (JWT). Evita que un cliente registre vehículos a
 *   nombre de otro usuario.
 * - `find`/`findOne` filtran por `user` autenticado, así un cliente solo
 *   puede leer SUS vehículos aunque pase otros filtros.
 */
import { factories } from '@strapi/strapi';
import { validateVehicleTypeSlug } from '../../../utils/vehicle-types';

export default factories.createCoreController('api::vehicle.vehicle', ({ strapi }) => ({
  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const data = ctx.request.body?.data ?? {};
    delete data.user;

    // El schema ya no es un enum: el tipo se valida contra el catálogo.
    const typeError = await validateVehicleTypeSlug(data.vehicleType);
    if (typeError) return ctx.badRequest(typeError);

    const vehicle = await strapi.entityService.create('api::vehicle.vehicle', {
      data: { ...data, user: userId },
      populate: { photo: true },
    });
    return { data: vehicle };
  },

  async update(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const { id } = ctx.params;
    const existing = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id },
      populate: { user: true },
    });
    if (!existing) return ctx.notFound('Vehículo no encontrado');
    if (existing.user?.id !== userId) return ctx.forbidden('No es tu vehículo');

    const data = ctx.request.body?.data ?? {};
    delete data.user;

    const typeError = await validateVehicleTypeSlug(data.vehicleType);
    if (typeError) return ctx.badRequest(typeError);

    const updated = await strapi.entityService.update('api::vehicle.vehicle', id, {
      data,
      populate: { photo: true },
    });
    return { data: updated };
  },

  async delete(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const { id } = ctx.params;
    const existing = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id },
      populate: { user: true },
    });
    if (!existing) return ctx.notFound('Vehículo no encontrado');
    if (existing.user?.id !== userId) return ctx.forbidden('No es tu vehículo');

    await strapi.entityService.delete('api::vehicle.vehicle', id);
    return { data: { id } };
  },

  async find(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const vehicles = await strapi.entityService.findMany('api::vehicle.vehicle', {
      filters: { user: { id: userId } },
      populate: { photo: true },
      sort: { createdAt: 'desc' },
    });
    return { data: vehicles, meta: {} };
  },

  async findOne(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const { id } = ctx.params;
    const v = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id },
      populate: { user: true, photo: true },
    });
    if (!v) return ctx.notFound('Vehículo no encontrado');
    if (v.user?.id !== userId) return ctx.forbidden('No es tu vehículo');

    // Remove user relation from response for cleanliness
    const { user, ...rest } = v;
    return { data: rest };
  },
}));
