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
    {
      method: 'GET',
      path: '/qr/in-progress-services',
      handler: 'qr.inProgressServices',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/complete-service',
      handler: 'qr.completeService',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/qr/employee-stats',
      handler: 'qr.employeeStats',
      config: { policies: [], middlewares: [] },
    },
  ],
};
