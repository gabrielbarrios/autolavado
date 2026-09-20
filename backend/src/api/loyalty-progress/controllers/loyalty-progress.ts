/**
 * loyalty-progress controller
 *
 * `find`/`findOne` con scope por dueño (ver src/utils/owner-scope.ts).
 *
 * `alwaysOwn`: el progreso es "el mío" para cualquier rol. El staff también
 * usa /perfil y /mis-promociones como cliente; si el admin viera la lista
 * completa, el frontend pintaría el progreso de otro cliente como suyo. Quien
 * necesita el de un cliente concreto (el escáner) lo lee por el qr API.
 */
import { factories } from '@strapi/strapi';
import { ownerScopedFind, ownerScopedFindOne } from '../../../utils/owner-scope';

export default factories.createCoreController('api::loyalty-progress.loyalty-progress', () => ({
  find: ownerScopedFind('api::loyalty-progress.loyalty-progress', {
    alwaysOwn: true,
    sortable: ['createdAt', 'cycleStartedAt'],
    defaultSort: { createdAt: 'desc' },
  }),
  findOne: ownerScopedFindOne('api::loyalty-progress.loyalty-progress', {
    notFoundMessage: 'Progreso no encontrado',
  }),
}));
