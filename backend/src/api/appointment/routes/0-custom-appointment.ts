/**
 * Rutas custom para appointment (además de las CRUD que crea factories.createCoreRouter).
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/appointments/available-slots',
      handler: 'appointment.availableSlots',
      config: { policies: [], middlewares: [] },
    },
  ],
};
