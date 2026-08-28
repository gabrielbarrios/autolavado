// @ts-nocheck
/**
 * El tipo de auto dejó de ser un enum del schema: ahora es el `slug` de una
 * entrada de `api::vehicle-type`, que el dueño administra desde el Content
 * Manager. Como el schema ya no valida nada, la comprobación de que el slug
 * existe vive acá y la usan los controllers que aceptan un tipo de auto.
 */

/** Slugs del catálogo, incluidos los inactivos (un auto viejo puede apuntar a uno). */
export async function knownVehicleTypeSlugs(): Promise<string[]> {
  const types = await strapi.db.query('api::vehicle-type.vehicle-type').findMany({
    select: ['slug'],
    limit: 500,
  });
  return types.map((t) => t.slug);
}

/**
 * Devuelve un mensaje de error si el tipo no existe en el catálogo, o `null` si
 * está bien. Un valor vacío se considera válido: el campo es opcional en
 * services (walk-in sin tipo) y el schema ya exige el de `vehicle`.
 *
 * Si el catálogo está vacío (instalación nueva antes del seed) no se bloquea
 * nada: es preferible aceptar el dato a dejar al cajero sin poder registrar.
 */
export async function validateVehicleTypeSlug(slug: unknown): Promise<string | null> {
  if (slug === undefined || slug === null || slug === '') return null;
  const known = await knownVehicleTypeSlugs();
  if (known.length === 0) return null;
  if (!known.includes(String(slug))) {
    return `El tipo de auto "${slug}" no existe en el catálogo`;
  }
  return null;
}
