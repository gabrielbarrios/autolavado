// @ts-nocheck
/**
 * extra-service controller
 *
 * Igual que el de package: recorta `pricing.vipPrice` para quien no sea admin,
 * empleado o cliente VIP (ver src/utils/pricing.ts).
 */
import { factories } from '@strapi/strapi';
import { canSeeVipPrices, stripVipPrices } from '../../../utils/pricing';

export default factories.createCoreController('api::extra-service.extra-service', () => ({
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
