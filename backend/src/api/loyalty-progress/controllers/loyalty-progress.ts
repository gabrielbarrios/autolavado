/**
 * loyalty-progress controller
 *
 * `find`/`findOne` con scope por dueño (ver src/utils/owner-scope.ts).
 *
 * Hay un registro por auto del cliente (ver src/utils/loyalty.ts).
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
    // Un contador por auto: el frontend pinta una barra por cada uno.
    populate: { vehicle: true },
    sortable: ['createdAt', 'cycleStartedAt'],
    defaultSort: { createdAt: 'desc' },
  }),
  findOne: ownerScopedFindOne('api::loyalty-progress.loyalty-progress', {
    populate: { vehicle: true },
    notFoundMessage: 'Progreso no encontrado',
  }),
}));
