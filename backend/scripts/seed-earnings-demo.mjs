#!/usr/bin/env node
/**
 * Datos de prueba para el reporte de ganancias por empleado (/empleados).
 *
 * Crea tres lavadores, un catálogo de servicios extra y una semana de lavados
 * cobrados por el flujo real del mostrador (walk-in → empezar → terminar →
 * cobrar), mezclando formas de pago (efectivo, tarjeta, transferencia),
 * paquetes, tipos de auto, Uber/Taxi, extras con precio, extras a cotizar,
 * una promoción de campaña y descuentos manuales. Al final consulta
 * `/api/qr/employee-earnings` y comprueba que el reporte cuadre con lo que
 * se cobró: es a la vez seed y prueba de casos de uso.
 *
 * Requisitos: Strapi corriendo (npm run develop) y la cuenta de caja
 * `demo.caja@autolavado.test` ya promovida a super admin (la crea y explica
 * cómo promoverla scripts/seed-loyalty-demo.mjs).
 *
 *   node scripts/seed-earnings-demo.mjs            # siembra + verifica
 *   node scripts/seed-earnings-demo.mjs --reset    # borra lo sembrado y vuelve a sembrar
 *   node scripts/seed-earnings-demo.mjs --verify   # solo verifica lo ya sembrado
 *   STRAPI_URL=http://otro:1337 node scripts/seed-earnings-demo.mjs
 *
 * Cuentas (contraseña `Demo1234!`):
 *   demo.caja@autolavado.test      super admin — cobra
 *   demo.lavador@autolavado.test   empleado 1 (Lavador Demo)
 *   demo.marta@autolavado.test     empleado 2 (Marta Demo)
 *   demo.luis@autolavado.test      empleado 3 (Luis Demo)
 */

const BASE = process.env.STRAPI_URL ?? 'http://localhost:1337';
const PASSWORD = 'Demo1234!';
const DOMAIN = 'autolavado.test';
const RESET = process.argv.includes('--reset');
const VERIFY_ONLY = process.argv.includes('--verify');

/** Marca en `notes` para reconocer (y borrar) lo que sembró este script. */
const TAG = 'SEED-EARNINGS';

const STAFF = { username: 'demo.caja', email: `demo.caja@${DOMAIN}`, name: 'Caja Demo' };
const WASHERS = [
  { key: 'lavador', username: 'demo.lavador', email: `demo.lavador@${DOMAIN}`, name: 'Lavador Demo' },
  { key: 'marta', username: 'demo.marta', email: `demo.marta@${DOMAIN}`, name: 'Marta Demo' },
  { key: 'luis', username: 'demo.luis', email: `demo.luis@${DOMAIN}`, name: 'Luis Demo' },
];

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

async function api(path, { method = 'GET', body, jwt } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.raw ?? res.statusText;
    const err = new Error(`${method} ${path} → ${res.status} ${msg}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function login(email) {
  const res = await api('/api/auth/local', {
    method: 'POST',
    body: { identifier: email, password: PASSWORD },
  });
  return { jwt: res.jwt, user: res.user };
}

/** Registra la cuenta si no existe y devuelve sesión. */
async function ensureAccount({ username, email, name }) {
  try {
    const res = await api('/api/auth/local/register', {
      method: 'POST',
      body: { username, email, password: PASSWORD, name },
    });
    console.log(`  + cuenta creada ${email}`);
    return { jwt: res.jwt, user: res.user, created: true };
  } catch (err) {
    if (err.status !== 400) throw err;
    const session = await login(email);
    return { ...session, created: false };
  }
}

async function me(jwt) {
  return api('/api/users/me?populate[role]=true', { jwt });
}

/* ------------------------------------------------------------------ */
/* Personal                                                            */
/* ------------------------------------------------------------------ */

async function ensureStaff() {
  const session = await ensureAccount(STAFF);
  const profile = await me(session.jwt);
  const role = profile.role?.type;
  if (role !== 'superadmin') {
    console.error(`
✖ ${STAFF.email} tiene rol "${role ?? 'sin rol'}" y este reporte es solo del super admin. Promuévelo una vez:

  docker exec autolavado-postgres psql -U autolavado -d autolavado -c "
    UPDATE up_users_role_lnk SET role_id = (SELECT id FROM up_roles WHERE type = 'superadmin')
    WHERE user_id = (SELECT id FROM up_users WHERE email = '${STAFF.email}');"

y vuelve a correr el script.`);
    process.exit(1);
  }
  return { ...session, user: profile };
}

async function ensureWasher(staffJwt, def) {
  const session = await ensureAccount(def);
  const profile = await me(session.jwt);
  if (profile.role?.type === 'employee') return profile;

  const roles = await api('/api/users-permissions/roles', { jwt: staffJwt });
  const employee = (roles.roles ?? []).find((r) => r.type === 'employee');
  if (!employee) throw new Error('No existe el rol employee (¿corrió el bootstrap?)');
  await api(`/api/users/${profile.id}`, {
    method: 'PUT',
    jwt: staffJwt,
    body: { role: employee.id },
  });
  console.log(`  + ${def.email} ahora es empleado`);
  return { ...profile, role: { type: 'employee' } };
}

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

async function vehicleTypes() {
  const types = (await api('/api/vehicle-types?sort=order&pagination[pageSize]=50')).data ?? [];
  if (types.length === 0) throw new Error('No hay tipos de auto; arranca Strapi para que los siembre.');
  return types.map((t) => t.slug);
}

async function ensurePackages(staffJwt, types) {
  const existing = (await api('/api/packages?pagination[pageSize]=50', { jwt: staffJwt })).data ?? [];
  if (existing.length > 0) {
    console.log(`  = ${existing.length} paquete(s) ya existen`);
    return existing;
  }
  const pricing = (base, step) =>
    types.map((slug, i) => ({
      vehicleType: slug,
      price: base + i * step,
      uberTaxiPrice: Math.round((base + i * step) * 0.9),
    }));
  const defs = [
    { name: 'Lavado básico', slug: 'lavado-basico', durationMinutes: 30, pricing: pricing(120, 20), order: 1 },
    { name: 'Paquete completo', slug: 'paquete-completo', durationMinutes: 60, pricing: pricing(250, 40), featured: true, order: 2 },
  ];
  const created = [];
  for (const def of defs) {
    const res = await api('/api/packages?status=published', { method: 'POST', jwt: staffJwt, body: { data: def } });
    created.push(res.data);
    console.log(`  + paquete "${def.name}"`);
  }
  return created;
}

/**
 * Extras del escenario. Los precios son por tipo de auto para que el reporte
 * tenga que resolverlos igual que la caja (incluido Uber/Taxi).
 */
function extraDefs(types) {
  const perType = (base, step, uberFactor = 0.9) =>
    types.map((slug, i) => ({
      vehicleType: slug,
      price: base + i * step,
      uberTaxiPrice: Math.round((base + i * step) * uberFactor),
    }));
  return [
    { name: 'Encerado', slug: 'seed-encerado', pricing: perType(150, 50), estimatedDuration: 20, order: 10 },
    { name: 'Aromatizante', slug: 'seed-aromatizante', pricing: types.map((slug) => ({ vehicleType: slug, price: 40 })), estimatedDuration: 2, order: 11 },
    { name: 'Limpieza de motor', slug: 'seed-limpieza-motor', pricing: perType(200, 30, 1), estimatedDuration: 30, order: 12 },
    // Sin precio de catálogo: la caja captura el monto al cobrar.
    { name: 'Pulido de faros', slug: 'seed-pulido-faros', quoteOnRequest: true, estimatedDuration: 25, order: 13 },
  ];
}

async function ensureExtras(staffJwt, types) {
  const list = () => api('/api/extra-services?pagination[pageSize]=100&populate[pricing]=true', { jwt: staffJwt });
  let existing = (await list()).data ?? [];
  let created = false;
  for (const def of extraDefs(types)) {
    if (existing.some((e) => e.slug === def.slug)) continue;
    await api('/api/extra-services?status=published', {
      method: 'POST',
      jwt: staffJwt,
      body: { data: { ...def, active: true } },
    });
    created = true;
    console.log(`  + extra "${def.name}"${def.quoteOnRequest ? ' (a cotizar)' : ''}`);
  }
  // Se relee con `pricing` poblado: la respuesta del POST no trae el componente
  // y el precio esperado de cada extra se calcula desde aquí.
  if (created) existing = (await list()).data ?? [];
  const out = {};
  for (const def of extraDefs(types)) {
    const extra = existing.find((e) => e.slug === def.slug);
    if (!extra) throw new Error(`No se pudo leer el extra "${def.name}"`);
    out[def.slug] = extra;
  }
  return out;
}

/** Campaña siempre activa del 10 %: la aplica la caja en algunos tickets. */
async function ensureCampaign(staffJwt) {
  const existing = (await api('/api/promotions?filters[code][$eq]=SEED10&pagination[pageSize]=5', { jwt: staffJwt })).data ?? [];
  if (existing.length > 0) return existing[0];
  const res = await api('/api/promotions', {
    method: 'POST',
    jwt: staffJwt,
    body: {
      data: {
        code: 'SEED10',
        title: '10 % cliente frecuente',
        kind: 'campaign',
        availability: 'always',
        appliesTo: 'all',
        discountType: 'percent',
        discountValue: 10,
        active: true,
        isPrivate: true,
      },
    },
  });
  console.log('  + campaña "10 % cliente frecuente"');
  return res.data;
}

/* ------------------------------------------------------------------ */
/* Precio esperado de un extra (réplica de utils/pricing.ts)           */
/* ------------------------------------------------------------------ */

function expectedExtraPrice(extra, { vehicleType, isUberTaxi }) {
  if (extra.quoteOnRequest) return 0;
  const pricing = extra.pricing ?? [];
  const row = pricing.find((p) => p.vehicleType === vehicleType);
  if (row) {
    if (isUberTaxi && row.uberTaxiPrice != null) return Number(row.uberTaxiPrice);
    if (row.price != null) return Number(row.price);
  }
  const normal = pricing.filter((p) => p.vehicleType !== 'uber_taxi');
  if (normal.length > 0) {
    return Math.min(...normal.map((r) => (isUberTaxi && r.uberTaxiPrice != null ? Number(r.uberTaxiPrice) : Number(r.price ?? 0))));
  }
  return Number(extra.price ?? 0);
}

/* ------------------------------------------------------------------ */
/* Escenarios                                                          */
/* ------------------------------------------------------------------ */

/**
 * Una semana de lavados. `daysAgo` reparte los tickets para que la gráfica
 * por día tenga forma; `hour` es la hora local del cobro.
 *
 *  washer   índice en WASHERS
 *  pkg      índice en packages (null = solo extras)
 *  extras   slugs de extraDefs
 *  quoted   monto capturado en caja por los extras a cotizar del ticket
 *  pay      cash | card | transfer
 *  promo    true → aplica la campaña SEED10
 *  manual   descuento manual en pesos (solo admin/super admin)
 */
function buildScenarios(types) {
  const [chico, sedan, suv, pickup] = [types[0], types[1] ?? types[0], types[2] ?? types[0], types[3] ?? types[0]];
  return [
    // --- Hoy ---
    { daysAgo: 0, hour: 9, washer: 0, customer: 'Rodrigo Pérez', type: sedan, pkg: 0, extras: ['seed-aromatizante'], pay: 'cash' },
    { daysAgo: 0, hour: 10, washer: 1, customer: 'Lucía Méndez', type: suv, pkg: 1, extras: ['seed-encerado', 'seed-aromatizante'], pay: 'card' },
    { daysAgo: 0, hour: 11, washer: 2, customer: 'Taxi 4521', type: sedan, uber: true, pkg: 0, extras: ['seed-encerado'], pay: 'transfer' },
    { daysAgo: 0, hour: 12, washer: 0, customer: 'Sandra Ruiz', type: pickup, pkg: 1, extras: ['seed-limpieza-motor', 'seed-pulido-faros'], quoted: 350, pay: 'transfer' },
    // --- Ayer ---
    { daysAgo: 1, hour: 9, washer: 1, customer: 'Jorge Ortiz', type: chico, pkg: 0, extras: [], pay: 'cash' },
    { daysAgo: 1, hour: 10, washer: 1, customer: 'Uber 88-A', type: chico, uber: true, pkg: 0, extras: ['seed-aromatizante'], pay: 'cash' },
    { daysAgo: 1, hour: 12, washer: 2, customer: 'Mariana Solís', type: suv, pkg: 1, extras: ['seed-encerado'], pay: 'card', promo: true },
    { daysAgo: 1, hour: 16, washer: 0, customer: 'Solo faros', type: sedan, pkg: null, extras: ['seed-pulido-faros'], quoted: 280, pay: 'cash' },
    // --- Hace 2 días ---
    { daysAgo: 2, hour: 10, washer: 2, customer: 'Pablo Nava', type: sedan, pkg: 1, extras: ['seed-encerado', 'seed-limpieza-motor'], pay: 'transfer' },
    { daysAgo: 2, hour: 11, washer: 0, customer: 'Gaby Torres', type: suv, pkg: 0, extras: [], pay: 'card', manual: 30 },
    { daysAgo: 2, hour: 13, washer: 1, customer: 'Taxi 1203', type: sedan, uber: true, pkg: 1, extras: ['seed-aromatizante'], pay: 'cash' },
    // --- Hace 3 días ---
    { daysAgo: 3, hour: 9, washer: 0, customer: 'Ernesto Lara', type: pickup, pkg: 1, extras: ['seed-encerado', 'seed-aromatizante', 'seed-pulido-faros'], quoted: 400, pay: 'card' },
    { daysAgo: 3, hour: 11, washer: 2, customer: 'Iván Castro', type: chico, pkg: 0, extras: [], pay: 'cash', promo: true },
    { daysAgo: 3, hour: 15, washer: 2, customer: 'Rosa Gil', type: sedan, pkg: 0, extras: ['seed-limpieza-motor'], pay: 'transfer' },
    // --- Hace 4 días ---
    { daysAgo: 4, hour: 10, washer: 1, customer: 'Carmen Vela', type: suv, pkg: 1, extras: ['seed-encerado'], pay: 'card' },
    { daysAgo: 4, hour: 12, washer: 0, customer: 'Uber 17-Z', type: sedan, uber: true, pkg: 0, extras: [], pay: 'cash' },
    { daysAgo: 4, hour: 17, washer: 1, customer: 'Óscar Peña', type: sedan, pkg: 0, extras: ['seed-aromatizante', 'seed-encerado'], pay: 'cash', manual: 50 },
    // --- Hace 5 días ---
    { daysAgo: 5, hour: 9, washer: 2, customer: 'Beatriz Mora', type: pickup, pkg: 0, extras: ['seed-limpieza-motor'], pay: 'transfer', promo: true },
    { daysAgo: 5, hour: 13, washer: 0, customer: 'Hugo Ramos', type: chico, pkg: 1, extras: [], pay: 'card' },
    // --- Hace 6 días ---
    { daysAgo: 6, hour: 10, washer: 1, customer: 'Nora Díaz', type: sedan, pkg: 1, extras: ['seed-encerado', 'seed-pulido-faros'], quoted: 300, pay: 'cash' },
    { daysAgo: 6, hour: 12, washer: 2, customer: 'Taxi 7760', type: sedan, uber: true, pkg: 0, extras: ['seed-aromatizante'], pay: 'transfer' },
    { daysAgo: 6, hour: 14, washer: 0, customer: 'Silvia Cano', type: suv, pkg: 1, extras: [], pay: 'card' },
  ];
}

/** Hora local de hace `daysAgo` días a las `hour`. */
function localDate(daysAgo, hour) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ------------------------------------------------------------------ */
/* Siembra                                                             */
/* ------------------------------------------------------------------ */

/** Un ticket completo por el flujo del mostrador. Devuelve el cobro. */
async function runScenario(staffJwt, sc, { packages, extras, washers, campaign }) {
  const reg = await api('/api/qr/walk-in-service', {
    method: 'POST',
    jwt: staffJwt,
    body: {
      customerName: sc.customer,
      vehicleType: sc.type,
      isUberTaxi: sc.uber === true,
      packageId: sc.pkg === null ? undefined : packages[sc.pkg].id,
      extraServiceIds: sc.extras.map((slug) => extras[slug].id),
      notes: `${TAG} ${sc.customer}`,
    },
  });
  const serviceId = reg.service.id;
  await api('/api/qr/start-service', {
    method: 'POST',
    jwt: staffJwt,
    body: { serviceId, performedByAdminId: washers[sc.washer].id },
  });
  await api('/api/qr/finish-service', { method: 'POST', jwt: staffJwt, body: { serviceId } });
  const charge = await api('/api/qr/charge-service', {
    method: 'POST',
    jwt: staffJwt,
    body: {
      serviceId,
      paymentMethod: sc.pay,
      promotionId: sc.promo ? campaign.id : undefined,
      manualDiscount: sc.manual,
      discountNote: sc.manual ? 'Cortesía (seed)' : undefined,
      extrasCharge: sc.quoted,
    },
  });

  // El cobro fue "ahora"; se mueve al día del escenario para que el reporte
  // por día tenga datos. Se edita por documentId (core controller Strapi 5).
  const chargedAt = localDate(sc.daysAgo, sc.hour);
  const doc = (await api(`/api/services?filters[id][$eq]=${serviceId}&fields[0]=documentId`, { jwt: staffJwt })).data?.[0];
  if (!doc?.documentId) throw new Error(`No se encontró el documentId del servicio ${serviceId}`);
  await api(`/api/services/${doc.documentId}`, {
    method: 'PUT',
    jwt: staffJwt,
    body: {
      data: {
        date: chargedAt.toISOString(),
        startedAt: new Date(chargedAt.getTime() - 45 * 60 * 1000).toISOString(),
        finishedAt: new Date(chargedAt.getTime() - 5 * 60 * 1000).toISOString(),
      },
    },
  });
  return charge.service;
}

async function wipeSeeded(staffJwt) {
  const list = (await api(`/api/services?filters[notes][$startsWith]=${TAG}&pagination[pageSize]=500&fields[0]=documentId`, { jwt: staffJwt })).data ?? [];
  for (const s of list) {
    await api(`/api/services/${s.documentId}`, { method: 'DELETE', jwt: staffJwt });
  }
  console.log(`  - borrados ${list.length} servicios sembrados`);
}

async function seededCount(staffJwt) {
  const res = await api(`/api/services?filters[notes][$startsWith]=${TAG}&pagination[pageSize]=1&pagination[withCount]=true`, { jwt: staffJwt });
  return res.meta?.pagination?.total ?? (res.data ?? []).length;
}

/* ------------------------------------------------------------------ */
/* Verificación                                                        */
/* ------------------------------------------------------------------ */

const r2 = (n) => Math.round(n * 100) / 100;

/** Lo que el reporte debería decir, calculado desde los escenarios y los cobros. */
function expectedReport(scenarios, charges, { extras, washers }) {
  const emptyPay = () => ({ cash: 0, card: 0, transfer: 0 });
  const exp = {
    washes: 0,
    earnings: 0,
    byPayment: emptyPay(),
    byEmployee: washers.map((w) => ({ id: w.id, name: w.name, washes: 0, earnings: 0, byPayment: emptyPay() })),
    extras: { count: 0, earnings: 0, byEmployee: washers.map((w) => ({ id: w.id, count: 0, earnings: 0, items: {} })) },
  };
  scenarios.forEach((sc, i) => {
    const amount = Number(charges[i].totalAmount);
    exp.washes += 1;
    exp.earnings += amount;
    exp.byPayment[sc.pay] += amount;
    const emp = exp.byEmployee[sc.washer];
    emp.washes += 1;
    emp.earnings += amount;
    emp.byPayment[sc.pay] += amount;

    const quotedSlugs = sc.extras.filter((slug) => extras[slug].quoteOnRequest);
    const share = quotedSlugs.length > 0 ? Number(sc.quoted ?? 0) / quotedSlugs.length : 0;
    const ex = exp.extras.byEmployee[sc.washer];
    for (const slug of sc.extras) {
      const extra = extras[slug];
      const price = extra.quoteOnRequest ? share : expectedExtraPrice(extra, { vehicleType: sc.type, isUberTaxi: sc.uber === true });
      exp.extras.count += 1;
      exp.extras.earnings += price;
      ex.count += 1;
      ex.earnings += price;
      ex.items[extra.name] = ex.items[extra.name] ?? { count: 0, earnings: 0 };
      ex.items[extra.name].count += 1;
      ex.items[extra.name].earnings += price;
    }
  });
  return exp;
}

function verify(report, exp, washers) {
  let failed = 0;
  const check = (label, got, want) => {
    const ok = typeof want === 'number' ? Math.abs(Number(got) - want) < 0.01 : got === want;
    console.log(`  ${ok ? '✓' : '✗'} ${label}: ${got}${ok ? '' : `  (esperado ${want})`}`);
    if (!ok) failed += 1;
  };

  console.log('\n▸ Totales');
  check('lavados cobrados', report.totals.washes, exp.washes);
  check('ganancias', report.totals.earnings, r2(exp.earnings));
  for (const k of ['cash', 'card', 'transfer']) {
    check(`  ${k}`, report.totals.byPayment[k].earnings, r2(exp.byPayment[k]));
  }
  check('  sin registrar', report.totals.byPayment.unknown.washes, 0);
  const paySum = ['cash', 'card', 'transfer', 'unknown'].reduce((a, k) => a + report.totals.byPayment[k].earnings, 0);
  check('formas de pago suman las ganancias', r2(paySum), report.totals.earnings);

  console.log('\n▸ Por empleado');
  for (const e of exp.byEmployee) {
    const row = report.byEmployee.find((r) => r.id === e.id);
    if (!row) {
      console.log(`  ✗ ${e.name}: no aparece en el reporte`);
      failed += 1;
      continue;
    }
    check(`${e.name} · lavados`, row.washes, e.washes);
    check(`${e.name} · ganancias`, row.earnings, r2(e.earnings));
    check(`${e.name} · rol`, row.role, 'employee');
    for (const k of ['cash', 'card', 'transfer']) {
      check(`${e.name} · ${k}`, row.byPayment[k].earnings, r2(e.byPayment[k]));
    }
  }
  check('empleados en el reporte', report.byEmployee.filter((r) => r.id !== null).length, washers.length);

  console.log('\n▸ Servicios extras');
  check('extras hechos', report.extras.totals.count, exp.extras.count);
  check('extras generados', report.extras.totals.earnings, r2(exp.extras.earnings));
  for (const e of exp.extras.byEmployee) {
    const w = washers.find((x) => x.id === e.id);
    const row = report.extras.byEmployee.find((r) => r.id === e.id);
    if (!row) {
      console.log(`  ✗ ${w.name}: sin extras en el reporte`);
      failed += 1;
      continue;
    }
    check(`${w.name} · extras`, row.count, e.count);
    check(`${w.name} · generado por extras`, row.earnings, r2(e.earnings));
    for (const [name, it] of Object.entries(e.items)) {
      const item = row.items.find((x) => x.name === name);
      check(`${w.name} · ${name} ×${it.count}`, item ? item.earnings : null, r2(it.earnings));
      if (item) check(`${w.name} · ${name} cantidad`, item.count, it.count);
    }
  }

  console.log('\n▸ Por día');
  const daysWithData = report.series.filter((b) => b.washes > 0).length;
  check('días con lavados', daysWithData, 7);
  const seriesSum = r2(report.series.reduce((a, b) => a + b.earnings, 0));
  check('la serie suma las ganancias', seriesSum, report.totals.earnings);
  const seriesExtras = report.series.reduce((a, b) => a + b.extras.count, 0);
  check('la serie suma los extras', seriesExtras, report.extras.totals.count);

  return failed;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`Seed de ganancias por empleado → ${BASE}\n`);

  console.log('Personal');
  const staff = await ensureStaff();
  const washers = [];
  for (const def of WASHERS) washers.push(await ensureWasher(staff.jwt, def));

  console.log('\nCatálogo');
  const types = await vehicleTypes();
  const packages = await ensurePackages(staff.jwt, types);
  const extras = await ensureExtras(staff.jwt, types);
  const campaign = await ensureCampaign(staff.jwt);
  const scenarios = buildScenarios(types);

  let charges = null;
  if (!VERIFY_ONLY) {
    console.log('\nLavados');
    const already = await seededCount(staff.jwt);
    if (already > 0 && !RESET) {
      console.log(`  = ya hay ${already} servicios sembrados; usa --reset para rehacerlos o --verify para solo comprobar`);
    } else {
      if (already > 0) await wipeSeeded(staff.jwt);
      charges = [];
      for (const sc of scenarios) {
        const charged = await runScenario(staff.jwt, sc, { packages, extras, washers, campaign });
        charges.push(charged);
        const when = sc.daysAgo === 0 ? 'hoy' : sc.daysAgo === 1 ? 'ayer' : `hace ${sc.daysAgo} días`;
        console.log(
          `  + ${when.padEnd(12)} ${washers[sc.washer].name.padEnd(13)} ${sc.customer.padEnd(16)} $${String(charged.totalAmount).padStart(6)} ${sc.pay.padEnd(8)}` +
            `${sc.extras.length ? ` +${sc.extras.length} extra(s)` : ''}${sc.promo ? ' promo' : ''}${sc.manual ? ` −$${sc.manual}` : ''}`,
        );
      }
    }
  }

  console.log('\nVerificación del reporte');
  const from = new Date(startOfToday().getTime() - 6 * 24 * 60 * 60 * 1000);
  const to = new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000);
  const qs = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    granularity: 'day',
    tzOffset: String(new Date().getTimezoneOffset()),
  });
  const report = await api(`/api/qr/employee-earnings?${qs}`, { jwt: staff.jwt });

  if (!charges) {
    // Sin cobros en esta corrida: se reconstruyen desde los servicios sembrados,
    // emparejados por la nota (el endpoint no permite ordenar por id).
    const seeded = (await api(`/api/services?filters[notes][$startsWith]=${TAG}&pagination[pageSize]=500`, { jwt: staff.jwt })).data ?? [];
    if (seeded.length !== scenarios.length) {
      console.log(`  ! hay ${seeded.length} servicios sembrados y ${scenarios.length} escenarios: corre con --reset para alinear`);
      process.exit(1);
    }
    charges = scenarios.map((sc) => {
      const s = seeded.find((x) => x.notes === `${TAG} ${sc.customer}`);
      if (!s) throw new Error(`No se encontró el servicio sembrado de "${sc.customer}"; corre con --reset`);
      return { totalAmount: s.totalAmount };
    });
  }

  const exp = expectedReport(scenarios, charges, { extras, washers });
  const failed = verify(report, exp, washers);

  console.log(
    `\n${failed === 0 ? '✓ Todo cuadra' : `✗ ${failed} comprobación(es) fallaron`}: ${report.totals.washes} lavados, ${report.extras.totals.count} extras, ` +
      `${report.byEmployee.filter((r) => r.id !== null).length} empleados. Entra a /empleados como ${STAFF.email} (${PASSWORD}) y elige "Últimos 7 días".`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  if (err.body?.error?.details && Object.keys(err.body.error.details).length) {
    console.error(JSON.stringify(err.body.error.details, null, 2));
  }
  process.exit(1);
});
