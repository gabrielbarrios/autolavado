/**
 * order controller
 *
 * `find`/`findOne` con scope por dueño (ver src/utils/owner-scope.ts).
 */
import { factories } from '@strapi/strapi';
import { ownerScopedFind, ownerScopedFindOne } from '../../../utils/owner-scope';

const CLIENT_POPULATE = { items: { populate: { product: true } } };

export default factories.createCoreController('api::order.order', () => ({
  find: ownerScopedFind('api::order.order', {
    populate: CLIENT_POPULATE,
    adminPopulate: { user: true },
    sortable: ['createdAt', 'updatedAt'],
    defaultSort: { createdAt: 'desc' },
  }),
  findOne: ownerScopedFindOne('api::order.order', {
    populate: CLIENT_POPULATE,
    notFoundMessage: 'Pedido no encontrado',
  }),
}));
