// @ts-nocheck
/**
 * Copia este archivo a: backend/src/api/visit/content-types/visit/lifecycles.ts
 * (DESPUÉS de crear el content type `visit` en el Content-Type Builder).
 *
 * Lógica:
 * - Cada vez que se crea una Visit, incrementa el contador del LoyaltyProgress del user.
 * - Si llega a 3, genera una Promotion automática (10% off) y resetea el contador.
 */
import crypto from 'node:crypto';

export default {
  async afterCreate(event) {
    const { result } = event;
    if (!result?.user) return;
    const userId = typeof result.user === 'object' ? result.user.id : result.user;
    if (!userId) return;

    const VISITS_FOR_REWARD = 3;

    const existing = await strapi.entityService.findMany('api::loyalty-progress.loyalty-progress', {
      filters: { user: userId },
      limit: 1,
    });

    let progress = existing[0];
    const now = new Date();

    if (!progress) {
      progress = await strapi.entityService.create('api::loyalty-progress.loyalty-progress', {
        data: { user: userId, currentCount: 1, cycleStartedAt: now, publishedAt: now },
      });
    } else {
      progress = await strapi.entityService.update(
        'api::loyalty-progress.loyalty-progress',
        progress.id,
        { data: { currentCount: (progress.currentCount ?? 0) + 1 } },
      );
    }

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
};
