/**
 * loyalty-progress controller
 *
 * `find`/`findOne` con scope por dueño (ver src/utils/owner-scope.ts).
 */
import { factories } from '@strapi/strapi';
import { ownerScopedFind, ownerScopedFindOne } from '../../../utils/owner-scope';

export default factories.createCoreController('api::loyalty-progress.loyalty-progress', () => ({
  find: ownerScopedFind('api::loyalty-progress.loyalty-progress', {
    adminPopulate: { user: true },
    sortable: ['createdAt', 'cycleStartedAt'],
    defaultSort: { createdAt: 'desc' },
  }),
  findOne: ownerScopedFindOne('api::loyalty-progress.loyalty-progress', {
    notFoundMessage: 'Progreso no encontrado',
  }),
}));
