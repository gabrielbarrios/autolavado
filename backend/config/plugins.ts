import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET'),
      register: {
        // Campos adicionales permitidos al registrarse vía /api/auth/local/register.
        // Sin esto, Strapi rechaza con "Invalid parameters: name, phone".
        allowedFields: ['name', 'phone'],
      },
    },
  },
});

export default config;
