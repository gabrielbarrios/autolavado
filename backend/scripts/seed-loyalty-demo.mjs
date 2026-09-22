#!/usr/bin/env node
/**
 * Datos de prueba para el programa de fidelidad POR AUTO (solo local).
 *
 * Crea clientes demo con varios autos cada uno y les registra lavados usando
 * el flujo REAL del mostrador (register-visit → start → finish → charge), así
 * el lifecycle de Visit es el que acumula visitas y regala promociones. Deja
 * además autos con servicios pendientes en el tablero (en espera, trabajando,
 * por cobrar) para probar el cobro con y sin promo.
 *
 * Uso (con Strapi corriendo en http://localhost:1337):
 *
 *   node scripts/seed-loyalty-demo.mjs            # crea / completa la demo
 *   node scripts/seed-loyalty-demo.mjs --reset    # borra los datos demo y los vuelve a crear
 *   STRAPI_URL=http://otro:1337 node scripts/seed-loyalty-demo.mjs
 *
 * Cuentas (todas con contraseña `Demo1234!`):
 *   demo.caja@autolavado.test      super admin — cobra en el tablero
 *   demo.lavador@autolavado.test   empleado — aparece en "¿Quién lo lava?"
 *   demo.<nombre>@autolavado.test  clientes (ana, bruno, carla, diego, elena, fer)
 *
 * La primera vez hay que promover a demo.caja a super admin a mano (el rol no
 * se puede cambiar sin una sesión de admin). El script imprime el SQL exacto.
 */

const BASE = process.env.STRAPI_URL ?? 'http://localhost:1337';
const PASSWORD = 'Demo1234!';
const DOMAIN = 'autolavado.test';
const RESET = process.argv.includes('--reset');

const STAFF = { username: 'demo.caja', email: `demo.caja@${DOMAIN}`, name: 'Caja Demo' };
const WASHER = { username: 'demo.lavador', email: `demo.lavador@${DOMAIN}`, name: 'Lavador Demo' };

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
async function ensureAccount({ username, email, name, phone }) {
  try {
    const res = await api('/api/auth/local/register', {
      method: 'POST',
      body: { username, email, password: PASSWORD, name, phone },
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
/* Personal: caja (super admin) y lavador (empleado)                    */
/* ------------------------------------------------------------------ */

async function ensureStaff() {
  const session = await ensureAccount(STAFF);
  const profile = await me(session.jwt);
  const role = profile.role?.type;
  if (role !== 'superadmin' && role !== 'admin') {
    console.error(`
✖ ${STAFF.email} existe pero tiene rol "${role ?? 'sin rol'}". Promuévelo una vez a super admin:

  docker exec autolavado-postgres psql -U autolavado -d autolavado -c "
    UPDATE up_users_role_lnk SET role_id = (SELECT id FROM up_roles WHERE type = 'superadmin')
    WHERE user_id = (SELECT id FROM up_users WHERE email = '${STAFF.email}');"

y vuelve a correr el script.`);
    process.exit(1);
  }
  return { ...session, user: profile };
}

async function ensureWasher(staffJwt) {
  const session = await ensureAccount(WASHER);
  const profile = await me(session.jwt);
  if (profile.role?.type === 'employee') return profile;

  const roles = await api('/api/users-permissions/roles', { jwt: staffJwt });
  const employee = (roles.roles ?? []).find((r) => r.type === 'employee');
  if (!employee) throw new Error('No existe el rol employee (¿corrió el bootstrap?)');
  try {
    await api(`/api/users/${profile.id}`, {
      method: 'PUT',
      jwt: staffJwt,
      body: { role: employee.id },
    });
    console.log(`  + ${WASHER.email} ahora es empleado`);
  } catch (err) {
    console.warn(`  ! No se pudo cambiar el rol por API (${err.message}). Hazlo a mano:
  docker exec autolavado-postgres psql -U autolavado -d autolavado -c "
    UPDATE up_users_role_lnk SET role_id = (SELECT id FROM up_roles WHERE type = 'employee')
    WHERE user_id = ${profile.id};"`);
  }
  return profile;
}

/* ------------------------------------------------------------------ */
/* Catálogo mínimo: configuración de fidelidad y paquetes              */
/* ------------------------------------------------------------------ */

const DEFAULT_THRESHOLDS = { normal: 5, uber: 10 };

async function ensureSiteSetting(staffJwt) {
  try {
    const res = await api('/api/site-setting?populate[loyaltyReward]=true', { jwt: staffJwt });
    const s = res.data;
    const normal = Number(s.visitsForReward) > 0 ? Number(s.visitsForReward) : 3;
    const uber = Number(s.visitsForRewardUber) > 0 ? Number(s.visitsForRewardUber) : normal;
    console.log(`  = configuración existente: ${normal} visitas normal / ${uber} Uber-Taxi`);
    return { normal, uber };
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  await api('/api/site-setting?status=published', {
    method: 'PUT',
    jwt: staffJwt,
    body: {
      data: {
        businessName: 'Autolavado Demo',
        tagline: 'Datos de prueba del programa de fidelidad',
        visitsForReward: DEFAULT_THRESHOLDS.normal,
        visitsForRewardUber: DEFAULT_THRESHOLDS.uber,
        // El ejemplo del negocio: al cerrar el ciclo, el siguiente lavado es gratis.
        loyaltyReward: { active: true, discountType: 'free', discountValue: 0, validDays: 30 },
      },
    },
  });
  console.log(
    `  + configuración creada: ${DEFAULT_THRESHOLDS.normal} visitas normal / ${DEFAULT_THRESHOLDS.uber} Uber-Taxi, recompensa = lavado gratis`,
  );
  return { ...DEFAULT_THRESHOLDS };
}

async function ensurePackages(staffJwt) {
  const existing = await api('/api/packages?pagination[pageSize]=50', { jwt: staffJwt });
  if ((existing.data ?? []).length > 0) {
    console.log(`  = ${existing.data.length} paquete(s) ya existen`);
    return existing.data;
  }
  const types = (await api('/api/vehicle-types?sort=order&pagination[pageSize]=50')).data ?? [];
  if (types.length === 0) throw new Error('No hay tipos de auto; arranca Strapi para que los siembre.');

  const pricing = (base, step) =>
    types.map((t, i) => ({
      vehicleType: t.slug,
      price: base + i * step,
      uberTaxiPrice: Math.round((base + i * step) * 0.9),
    }));

  const defs = [
    {
      name: 'Lavado básico',
      slug: 'lavado-basico',
      durationMinutes: 30,
      description: 'Exterior y aspirado.',
      pricing: pricing(120, 20),
      order: 1,
    },
    {
      name: 'Paquete completo',
      slug: 'paquete-completo',
      durationMinutes: 60,
      description: 'Exterior, interior, llantas y encerado.',
      pricing: pricing(250, 40),
      featured: true,
      order: 2,
    },
  ];
  const created = [];
  for (const def of defs) {
    const res = await api('/api/packages?status=published', {
      method: 'POST',
      jwt: staffJwt,
      body: { data: def },
    });
    created.push(res.data);
    console.log(`  + paquete "${def.name}"`);
  }
  return created;
}

/* ------------------------------------------------------------------ */
/* Clientes demo                                                        */
/* ------------------------------------------------------------------ */

/**
 * `visits` = lavados YA cobrados (cuentan fidelidad). Se expresa en función
 * de los umbrales para que el escenario sea el mismo con cualquier config.
 * `pending` = servicio que se deja en el tablero sin cobrar.
 */
function buildScenarios({ normal, uber }) {
  return [
    {
      key: 'ana',
      name: 'Ana Demo',
      phone: '5550000001',
      note: 'Aveo a UNA visita de la promo (al cobrarlo en el tablero se genera). Versa Uber apenas empieza.',
      vehicles: [
        { brand: 'Chevrolet', model: 'Aveo', year: 2019, color: 'Rojo', plate: 'DEMO-ANA1', type: 'sedan', visits: normal - 1, pending: 'to_pay' },
        { brand: 'Nissan', model: 'Versa', year: 2021, color: 'Blanco', plate: 'DEMO-ANA2', type: 'sedan', uber: true, visits: Math.min(2, uber - 1) },
      ],
    },
    {
      key: 'bruno',
      name: 'Bruno Demo',
      phone: '5550000002',
      note: 'Civic ya cerró su ciclo: tiene promo de fidelidad y está por cobrar (aplícala en caja). Hilux lleva 1.',
      vehicles: [
        { brand: 'Honda', model: 'Civic', year: 2020, color: 'Gris', plate: 'DEMO-BRU1', type: 'sedan', visits: normal, pending: 'to_pay' },
        { brand: 'Toyota', model: 'Hilux', year: 2018, color: 'Negro', plate: 'DEMO-BRU2', type: 'camioneta_grande', visits: 1 },
      ],
    },
    {
      key: 'carla',
      name: 'Carla Demo',
      phone: '5550000003',
      note: 'Rio Uber cerró el ciclo Uber (umbral largo): tiene promo. Mazda 2 normal en 0, en espera en el tablero.',
      vehicles: [
        { brand: 'Kia', model: 'Rio', year: 2022, color: 'Azul', plate: 'DEMO-CAR1', type: 'sedan', uber: true, visits: uber },
        { brand: 'Mazda', model: '2', year: 2017, color: 'Blanco', plate: 'DEMO-CAR2', type: 'chico', visits: 0, pending: 'waiting' },
      ],
    },
    {
      key: 'diego',
      name: 'Diego Demo',
      phone: '5550000004',
      note: 'Un solo auto con 1 visita; ahora mismo lo están lavando.',
      vehicles: [
        { brand: 'Volkswagen', model: 'Jetta', year: 2016, color: 'Plata', plate: 'DEMO-DIE1', type: 'sedan', visits: 1, pending: 'in_progress' },
      ],
    },
    {
      key: 'elena',
      name: 'Elena Demo',
      phone: '5550000005',
      note: 'Mazda 3 ganó la promo; el Accent Uber está por cobrar → en caja la promo sale marcada "la ganó otro auto".',
      vehicles: [
        { brand: 'Mazda', model: '3', year: 2021, color: 'Rojo', plate: 'DEMO-ELE1', type: 'sedan', visits: normal },
        { brand: 'Hyundai', model: 'Accent', year: 2020, color: 'Blanco', plate: 'DEMO-ELE2', type: 'sedan', uber: true, visits: 1, pending: 'to_pay' },
      ],
    },
    {
      key: 'fer',
      name: 'Fer Demo',
      phone: '5550000006',
      note: 'Explorer cerró un ciclo (tiene promo) y ya lleva 1 del siguiente. Sin nada pendiente.',
      vehicles: [
        { brand: 'Ford', model: 'Explorer', year: 2019, color: 'Negro', plate: 'DEMO-FER1', type: 'suv', visits: normal + 1 },
      ],
    },
  ];
}

async function ensureVehicles(clientJwt, defs) {
  const mine = (await api('/api/vehicles?scope=mine', { jwt: clientJwt })).data ?? [];
  const out = [];
  for (const def of defs) {
    let vehicle = mine.find((v) => v.plate === def.plate);
    if (!vehicle) {
      const res = await api('/api/vehicles', {
        method: 'POST',
        jwt: clientJwt,
        body: {
          data: {
            brand: def.brand,
            model: def.model,
            year: def.year,
            color: def.color,
            plate: def.plate,
            vehicleType: def.type,
            isUberTaxi: def.uber === true,
          },
        },
      });
      vehicle = res.data;
      console.log(`    + auto ${def.brand} ${def.model} (${def.plate})${def.uber ? ' Uber/Taxi' : ''}`);
    }
    out.push({ def, vehicle });
  }
  return out;
}

/** Un lavado completo por el flujo del mostrador. Devuelve la respuesta del cobro. */
async function washAndCharge(staffJwt, { userId, vehicleId, packageId, washerId, notes }) {
  const reg = await api('/api/qr/register-visit', {
    method: 'POST',
    jwt: staffJwt,
    body: { userId, vehicleId, packageId, notes },
  });
  const serviceId = reg.service.id;
  await api('/api/qr/start-service', {
    method: 'POST',
    jwt: staffJwt,
    body: { serviceId, performedByAdminId: washerId },
  });
  await api('/api/qr/finish-service', { method: 'POST', jwt: staffJwt, body: { serviceId } });
  return api('/api/qr/charge-service', { method: 'POST', jwt: staffJwt, body: { serviceId } });
}

/** Deja un servicio en el tablero en el estado pedido, sin cobrarlo. */
async function leavePending(staffJwt, status, { userId, vehicleId, packageId, washerId }) {
  const reg = await api('/api/qr/register-visit', {
    method: 'POST',
    jwt: staffJwt,
    body: { userId, vehicleId, packageId, notes: 'Servicio demo pendiente' },
  });
  const serviceId = reg.service.id;
  if (status === 'waiting') return serviceId;
  await api('/api/qr/start-service', {
    method: 'POST',
    jwt: staffJwt,
    body: { serviceId, performedByAdminId: washerId },
  });
  if (status === 'in_progress') return serviceId;
  await api('/api/qr/finish-service', { method: 'POST', jwt: staffJwt, body: { serviceId } });
  return serviceId;
}

/** Visitas ya registradas de ese auto (para no duplicar al re-correr). */
function visitsOfVehicle(visits, vehicleId) {
  return visits.filter((v) => v.vehicle?.id === vehicleId).length;
}

/* ------------------------------------------------------------------ */
/* Reset                                                               */
/* ------------------------------------------------------------------ */

async function wipeClient(staffJwt, clientJwt, clientUser) {
  const uid = clientUser.id;
  const del = async (path) => {
    try {
      await api(path, { method: 'DELETE', jwt: staffJwt });
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  };
  const services = (await api(`/api/services?filters[user][id][$eq]=${uid}`, { jwt: staffJwt })).data ?? [];
  for (const s of services) await del(`/api/services/${s.id}`);
  const visits = (await api(`/api/visits?filters[user][id][$eq]=${uid}`, { jwt: staffJwt })).data ?? [];
  for (const v of visits) await del(`/api/visits/${v.id}`);
  const promos = (await api(`/api/promotions?filters[user][id][$eq]=${uid}`, { jwt: staffJwt })).data ?? [];
  for (const p of promos) await del(`/api/promotions/${p.id}`);
  // El progreso solo lo lista su dueño (alwaysOwn); se borra con la sesión de caja.
  const progress = (await api('/api/loyalty-progresses', { jwt: clientJwt })).data ?? [];
  for (const p of progress) await del(`/api/loyalty-progresses/${p.id}`);
  const vehicles = (await api('/api/vehicles?scope=mine', { jwt: clientJwt })).data ?? [];
  for (const v of vehicles) {
    await api(`/api/vehicles/${v.id}`, { method: 'DELETE', jwt: clientJwt });
  }
  await api(`/api/users/${uid}`, { method: 'PUT', jwt: staffJwt, body: { visitCount: 0 } });
  console.log(
    `    - borrados ${services.length} servicios, ${visits.length} visitas, ${promos.length} promos, ${progress.length} contadores, ${vehicles.length} autos`,
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`Strapi: ${BASE}${RESET ? '  (modo --reset)' : ''}\n`);

  console.log('Personal');
  const staff = await ensureStaff();
  const washer = await ensureWasher(staff.jwt);

  console.log('\nCatálogo');
  const thresholds = await ensureSiteSetting(staff.jwt);
  const packages = await ensurePackages(staff.jwt);
  const fullPackage = packages.find((p) => p.slug === 'paquete-completo') ?? packages[0];

  const scenarios = buildScenarios(thresholds);
  const summary = [];

  for (const scenario of scenarios) {
    console.log(`\nCliente ${scenario.name}`);
    const client = await ensureAccount({
      username: `demo.${scenario.key}`,
      email: `demo.${scenario.key}@${DOMAIN}`,
      name: scenario.name,
      phone: scenario.phone,
    });
    if (RESET) await wipeClient(staff.jwt, client.jwt, client.user);

    const vehicles = await ensureVehicles(client.jwt, scenario.vehicles);
    const existingVisits = (await api('/api/visits?scope=mine', { jwt: client.jwt })).data ?? [];
    const board = await api('/api/qr/board', { jwt: staff.jwt });
    const pendingOnBoard = [...board.board.waiting, ...board.board.in_progress, ...board.board.to_pay];

    for (const { def, vehicle } of vehicles) {
      const already = visitsOfVehicle(existingVisits, vehicle.id);
      const missing = Math.max(0, def.visits - already);
      for (let i = 0; i < missing; i++) {
        const res = await washAndCharge(staff.jwt, {
          userId: client.user.id,
          vehicleId: vehicle.id,
          packageId: fullPackage.id,
          washerId: washer.id,
          notes: `Lavado demo ${already + i + 1}`,
        });
        if (res.promotionGenerated) {
          console.log(`    ★ ${def.brand} ${def.model}: promo generada "${res.promotionGenerated.title}"`);
        }
      }
      if (missing > 0) console.log(`    · ${def.brand} ${def.model}: ${missing} lavado(s) cobrados`);

      if (def.pending && !pendingOnBoard.some((s) => s.vehicle?.id === vehicle.id)) {
        await leavePending(staff.jwt, def.pending, {
          userId: client.user.id,
          vehicleId: vehicle.id,
          packageId: fullPackage.id,
          washerId: washer.id,
        });
        console.log(`    ⏳ ${def.brand} ${def.model}: dejado en "${def.pending}"`);
      }
    }

    // Estado final tal como lo ve el escáner.
    const profile = await me(client.jwt);
    const scan = await api('/api/qr/scan', {
      method: 'POST',
      jwt: staff.jwt,
      body: { qrToken: profile.qrToken },
    });
    summary.push({ scenario, scan });
  }

  console.log('\n══════════════════════ RESUMEN ══════════════════════');
  console.log(`Umbrales: ${thresholds.normal} visitas (normal) / ${thresholds.uber} visitas (Uber/Taxi)\n`);
  for (const { scenario, scan } of summary) {
    console.log(`${scenario.name}  <demo.${scenario.key}@${DOMAIN}>`);
    console.log(`  ${scenario.note}`);
    for (const row of scan.loyalty) {
      const def = scenario.vehicles.find((v) => row.vehicleLabel.includes(v.plate));
      const pending = def?.pending ? `  → en tablero: ${def.pending}` : '';
      console.log(
        `  - ${row.vehicleLabel.padEnd(34)} ${String(row.currentCount).padStart(2)} / ${row.visitsRequired}${row.isUberTaxi ? ' (Uber)' : ''}${pending}`,
      );
    }
    for (const promo of scan.activePromotions) {
      const car = promo.vehicle ? ` [${promo.vehicle.brand} ${promo.vehicle.model}]` : '';
      console.log(`  ★ promo: ${promo.title}${car} · código ${promo.code}`);
    }
    console.log('');
  }
  console.log(`Entra como caja: ${STAFF.email} / ${PASSWORD}  → /en-progreso para cobrar los pendientes`);
  console.log(`Entra como cliente: demo.<nombre>@${DOMAIN} / ${PASSWORD}  → /perfil para ver las barras por auto`);
}

main().catch((err) => {
  console.error('\n✖', err.message);
  if (err.body && !err.body.raw) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
