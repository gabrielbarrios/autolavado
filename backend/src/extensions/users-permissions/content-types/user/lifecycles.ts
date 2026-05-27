// @ts-nocheck
import crypto from 'node:crypto';

/**
 * Genera un `qrToken` único automáticamente cuando se crea un user.
 * Funciona sin importar por dónde se cree (register, admin, etc.).
 */
export default {
  beforeCreate(event) {
    if (!event.params.data) event.params.data = {};
    if (!event.params.data.qrToken) {
      event.params.data.qrToken = crypto.randomUUID();
    }
  },
};
