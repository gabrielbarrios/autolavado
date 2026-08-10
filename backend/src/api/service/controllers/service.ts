/**
 * service controller
 *
 * `find`/`findOne` van con scope por dueño: el cliente no puede mandar
 * `filters[user]` (Strapi lo rechaza con 400 "Invalid key user"), así que el
 * filtro se aplica con el id del JWT. Ver src/utils/owner-scope.ts.
 */
import { factories } from '@strapi/strapi';
import { ownerScopedFind, ownerScopedFindOne } from '../../../utils/owner-scope';

const CLIENT_POPULATE = { package: true, vehicle: true, extraServices: true };

export default factories.createCoreController('api::service.service', () => ({
  find: ownerScopedFind('api::service.service', {
    populate: CLIENT_POPULATE,
    adminPopulate: { user: true, performedBy: true, appointment: true },
    sortable: ['date', 'createdAt', 'startedAt', 'finishedAt'],
    defaultSort: { date: 'desc' },
  }),
  findOne: ownerScopedFindOne('api::service.service', {
    populate: CLIENT_POPULATE,
    notFoundMessage: 'Servicio no encontrado',
  }),
}));
