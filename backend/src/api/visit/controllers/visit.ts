/**
 * visit controller
 *
 * `find`/`findOne` con scope por dueño (ver src/utils/owner-scope.ts).
 */
import { factories } from '@strapi/strapi';
import { ownerScopedFind, ownerScopedFindOne } from '../../../utils/owner-scope';

const CLIENT_POPULATE = { package: true, vehicle: true, extraServices: true };

export default factories.createCoreController('api::visit.visit', () => ({
  find: ownerScopedFind('api::visit.visit', {
    populate: CLIENT_POPULATE,
    adminPopulate: { user: true },
    sortable: ['date', 'createdAt'],
    defaultSort: { date: 'desc' },
  }),
  findOne: ownerScopedFindOne('api::visit.visit', {
    populate: CLIENT_POPULATE,
    notFoundMessage: 'Visita no encontrada',
  }),
}));
