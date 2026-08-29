// @ts-nocheck
/**
 * "Ahora" en la zona horaria del negocio, para decidir qué horarios de HOY
 * siguen siendo reservables. No se usa la hora del servidor: en Docker y en
 * producción corre en UTC, y con eso los horarios de la tarde de México
 * desaparecían (o aparecían) a la hora equivocada.
 */
import { BUSINESS_TIMEZONE } from './promotions';

/**
 * Margen mínimo entre "ahora" y el primer horario que se ofrece. Si son las
 * 13:58 y el margen es 30, el primer horario reservable es el siguiente a las
 * 14:28 — con slots de 30 min, las 14:30.
 */
export const BOOKING_LEAD_MINUTES = Number(process.env.BOOKING_LEAD_MINUTES ?? 30);

/**
 * Fecha (YYYY-MM-DD) y minutos desde medianoche, ambos en la zona del negocio.
 * Si la zona configurada fuera inválida, cae a la hora del servidor: es
 * preferible un margen mal calculado a dejar la agenda sin horarios.
 */
export function businessNow(now = new Date(), timeZone = BUSINESS_TIMEZONE) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = Number(get('hour'));
    const minute = Number(get('minute'));
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new Error('Intl devolvió partes incompletas');
    }
    return { date: `${year}-${month}-${day}`, minutes: hour * 60 + minute };
  } catch {
    const pad = (n) => String(n).padStart(2, '0');
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      minutes: now.getHours() * 60 + now.getMinutes(),
    };
  }
}
