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
      method: 'GET',
      path: '/qr/board',
      handler: 'qr.board',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/appointment-to-board',
      handler: 'qr.appointmentToBoard',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/start-service',
      handler: 'qr.startService',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/finish-service',
      handler: 'qr.finishService',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/charge-service',
      handler: 'qr.chargeService',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/qr/cancel-service',
      handler: 'qr.cancelService',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/qr/employee-stats',
      handler: 'qr.employeeStats',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/qr/employee-times',
      handler: 'qr.employeeTimes',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/qr/available-promotions',
      handler: 'qr.availablePromotions',
      config: { policies: [], middlewares: [] },
    },
  ],
};
