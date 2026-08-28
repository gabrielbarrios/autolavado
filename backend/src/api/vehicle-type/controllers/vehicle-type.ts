/**
 * vehicle-type controller
 *
 * Catálogo plano: el core controller basta. Lo interesante está en el schema
 * (el `slug` es la clave que se guarda en autos, servicios y filas de precio).
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::vehicle-type.vehicle-type');
