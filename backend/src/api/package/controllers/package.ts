// @ts-nocheck
/**
 * package controller
 *
 * Sobre el core controller sólo añade una cosa: `pricing.vipPrice` es
 * información privada. Se recorta de la respuesta salvo que quien pregunta sea
 * admin, empleado o un cliente VIP (ver src/utils/pricing.ts).
 */
import { factories } from '@strapi/strapi';
import { canSeeVipPrices, stripVipPrices } from '../../../utils/pricing';

export default factories.createCoreController('api::package.package', () => ({
  async find(ctx) {
    const res = await super.find(ctx);
    if (canSeeVipPrices(ctx.state.user)) return res;
    return { ...res, data: stripVipPrices(res.data) };
  },

  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (canSeeVipPrices(ctx.state.user)) return res;
    return { ...res, data: stripVipPrices(res.data) };
  },
}));
