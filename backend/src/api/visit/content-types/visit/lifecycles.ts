// @ts-nocheck
/**
 * La lógica de fidelidad al crear una Visit (incrementar user.visitCount,
 * avanzar el LoyaltyProgress y generar la promoción cada 3 visitas) NO vive aquí.
 *
 * Motivo: en este proyecto los lifecycles por-archivo (content-types/.../lifecycles.ts)
 * no disparan de forma fiable —el mismo problema que con el qrToken del user—, así que
 * se registra vía `strapi.db.lifecycles.subscribe({ models: ['api::visit.visit'] })`
 * en `src/index.ts` (register). Ver ahí.
 *
 * Este archivo se deja vacío a propósito para evitar doble conteo si algún día
 * el lifecycle por-archivo llegara a ejecutarse.
 */
export default {};
