/**
 * Cláusulas del servicio. Viven en código y no en Strapi a propósito: son el
 * aviso legal del negocio, se muestran igual en el home y en /clausulas, y
 * deben decir exactamente lo mismo en los dos lados.
 */
export const CLAUSES: string[] = [
  "Antes de salir revisa tu auto, no aceptamos reclamaciones posteriores.",
  "No nos hacemos responsables por objetos olvidados, no aceptamos reclamaciones posteriores.",
  "El servicio de lavado de motor se realiza bajo responsabilidad y autorización del propietario del vehículo. NO NOS HACEMOS RESPONSABLES por fallas eléctricas, encendido de testigos, sensores o cualquier desperfecto posterior al servicio.",
  "No nos hacemos responsables por robo, daños o cualquier incidente si el vehículo permanece más tiempo del indicado después del servicio del lavado u otro servicio.",
];

/** "Cláusulas en Autolavado Patyz" — el nombre sale de site-setting. */
export function clausesTitle(businessName?: string | null): string {
  return `Cláusulas en ${businessName?.trim() || "AutoLavado"}`;
}
