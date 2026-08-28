/**
 * Rutas custom del catálogo de promociones.
 *
 * El archivo se llama `01-` a propósito: los routers se cargan por orden
 * alfabético y `/promotions/available` (y `/promotions/campaigns`) tienen que
 * declararse ANTES que el `/promotions/:id` del core router, o Strapi los
 * tomaría como un findOne con id="available".
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/promotions/available',
      handler: 'promotion.available',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/promotions/campaigns',
      handler: 'promotion.campaigns',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
