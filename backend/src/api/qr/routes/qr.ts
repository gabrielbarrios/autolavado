export default {
  routes: [
    {
      method: 'POST',
      path: '/qr/scan',
      handler: 'qr.scan',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/register-visit',
      handler: 'qr.registerVisit',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/walk-in-service',
      handler: 'qr.walkInService',
      config: { policies: [], middlewares: [] },
    },
  ],
};
