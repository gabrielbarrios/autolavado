/**
 * promotion controller
 *
 * `find`/`findOne` con scope por dueño (ver src/utils/owner-scope.ts).
 */
import { factories } from '@strapi/strapi';
import { ownerScopedFind, ownerScopedFindOne } from '../../../utils/owner-scope';

export default factories.createCoreController('api::promotion.promotion', () => ({
  find: ownerScopedFind('api::promotion.promotion', {
    adminPopulate: { user: true },
    sortable: ['validUntil', 'validFrom', 'createdAt'],
    defaultSort: { validUntil: 'asc' },
  }),
  findOne: ownerScopedFindOne('api::promotion.promotion', {
    notFoundMessage: 'Promoción no encontrada',
  }),
}));
