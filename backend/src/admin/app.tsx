import type { StrapiApp } from '@strapi/strapi/admin';

/**
 * Panel de Strapi en español.
 *
 * `locales: ['es']` deja el panel solo con español, así que la interfaz arranca
 * en ese idioma sin tener que elegirlo en el perfil de cada usuario. (El inglés
 * siempre está incluido por Strapi y no se puede quitar de la lista.)
 *
 * Ojo: esto traduce la interfaz de Strapi. Los nombres de las colecciones vienen
 * de `info.displayName` en cada schema.json, y las etiquetas de los campos se
 * siembran desde el bootstrap — ver src/utils/admin-labels.ts.
 */
export default {
  config: {
    locales: ['es'],
    translations: {
      es: {
        'app.components.LeftMenu.navbrand.title': 'Autolavado',
        'app.components.LeftMenu.navbrand.workplace': 'Panel de administración',
      },
    },
  },
  bootstrap() {},
};
