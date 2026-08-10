// @ts-nocheck
/**
 * Scope por dueño para los content types que consulta el cliente.
 *
 * POR QUÉ EXISTE: Strapi 5 valida la query contra los permisos del rol. El rol
 * `authenticated` solo tiene `me` sobre `plugin::users-permissions.user`, así que
 * la relación `user` NO es una clave legible para un cliente y cualquier
 * `?filters[user][id][$eq]=N` responde:
 *
 *   400 ValidationError — "Invalid key user"
 *
 * La salida fácil sería darle a los clientes `find`/`findOne` sobre los usuarios,
 * pero eso expondría email, teléfono y sobre todo `qrToken` (con el token de otro
 * cliente cualquiera podría hacerse pasar por él en el mostrador). Así que el
 * filtro por dueño se aplica acá, tomando el id del JWT y nunca de la query.
 *
 * Es el mismo patrón que ya usaban `vehicle` y `appointment` — los dos únicos
 * endpoints del cliente que no estaban rotos.
 */

type PopulateMap = Record<string, unknown>;
type OrderByMap = Record<string, 'asc' | 'desc'>;

interface OwnerScopedFindOptions {
  /** Relaciones que se pueblan para todos. */
  populate?: PopulateMap;
  /** Relaciones extra que solo ve un admin (nunca datos de otros usuarios al cliente). */
  adminPopulate?: PopulateMap;
  /** Campos que el frontend puede pedir en `sort[0]`. */
  sortable?: string[];
  defaultSort?: OrderByMap;
  limit?: number;
}

interface OwnerScopedFindOneOptions {
  populate?: PopulateMap;
  notFoundMessage?: string;
}

/** ¿El usuario del JWT es admin o super admin? */
export function isAdminLike(user) {
  const role = user?.role?.type ?? user?.role?.name?.toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

/**
 * Los filtros llegan siempre como string ("false", "12"). `strapi.db.query` los
 * pasa como parámetro tipado a Postgres, que no compara boolean contra texto,
 * así que hay que devolverles su tipo antes de armar el `where`.
 */
function normalizeFilterValues(value) {
  if (Array.isArray(value)) return value.map(normalizeFilterValues);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeFilterValues(v)]),
    );
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * `sort[0]=campo:dir` → `{ campo: dir }`. Solo se aceptan los campos de
 * `sortable`: un nombre libre acabaría como columna inexistente en el SQL.
 */
function parseSort(sort, sortable, fallback) {
  const raw = Array.isArray(sort) ? sort[0] : sort;
  if (typeof raw !== 'string') return fallback;
  const [field, dir] = raw.split(':');
  if (!sortable.includes(field)) return fallback;
  return { [field]: dir === 'asc' ? 'asc' : 'desc' };
}

/**
 * Construye un `find` que exige sesión, fuerza `user = <id del JWT>` para los
 * clientes (el admin sigue viendo todo) y solo puebla la relación `user` cuando
 * quien pregunta es admin.
 */
export function ownerScopedFind(
  uid: string,
  {
    populate = {},
    adminPopulate = {},
    sortable = ['createdAt'],
    defaultSort = { createdAt: 'desc' },
    limit = 300,
  }: OwnerScopedFindOptions = {},
) {
  return async function find(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');
    const isAdmin = isAdminLike(ctx.state.user);

    const incoming = ctx.query?.filters;
    const where =
      incoming && typeof incoming === 'object' ? normalizeFilterValues(incoming) : {};
    // El cliente no decide de quién son los registros que lee.
    if (!isAdmin) where.user = { id: userId };

    const items = await strapi.db.query(uid).findMany({
      where,
      populate: { ...populate, ...(isAdmin ? adminPopulate : {}) },
      orderBy: parseSort(ctx.query?.sort, sortable, defaultSort),
      limit,
    });
    return { data: items, meta: {} };
  };
}

/**
 * `findOne` equivalente: un cliente solo puede leer un registro propio. Sin
 * esto, el `findOne` por defecto deja que cualquier cliente lea el de otro
 * pasando el id a mano.
 */
export function ownerScopedFindOne(
  uid: string,
  { populate = {}, notFoundMessage = 'No encontrado' }: OwnerScopedFindOneOptions = {},
) {
  return async function findOne(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('Sesión requerida');

    const item = await strapi.db.query(uid).findOne({
      where: { id: ctx.params.id },
      populate: { ...populate, user: true },
    });
    if (!item) return ctx.notFound(notFoundMessage);
    if (!isAdminLike(ctx.state.user) && item.user?.id !== userId) {
      return ctx.forbidden('No es tuyo');
    }

    const { user, ...rest } = item;
    return { data: isAdminLike(ctx.state.user) ? item : rest };
  };
}
