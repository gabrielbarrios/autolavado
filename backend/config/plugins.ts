import type { Core } from '@strapi/strapi';

// Resize a un máximo de 1920x1080 (solo reduce, nunca agranda, conserva aspecto)
// + compresión automática. Cloudinary aplica esto al INGESTAR, antes de guardar,
// así que el asset almacenado y servido ya viene optimizado.
const imageTransformation = [
  { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good' },
];

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
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {
          folder: 'autolavadopatyz',
          transformation: imageTransformation,
        },
        uploadStream: {
          folder: 'autolavadopatyz',
          transformation: imageTransformation,
        },
        delete: {},
      },
      // Rechaza archivos de más de 10MB antes de enviarlos a Cloudinary.
      sizeLimit: 10 * 1024 * 1024,
    },
  },
});

export default config;
