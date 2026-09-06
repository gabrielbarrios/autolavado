// @ts-nocheck
/**
 * Etiquetas en español para el panel de Strapi.
 *
 * Strapi no tiene un archivo declarativo para esto: la configuración de vistas
 * del Content Manager vive en la tabla `strapi_core_store_settings`, bajo la
 * clave `plugin_content_manager_configuration_content_types::<uid>` (y
 * `..._components::<uid>` para los campos de un componente), y es lo que
 * escribe el botón "Configure the view" del panel. Por eso se siembra desde el
 * bootstrap (ver applyAdminLabels): así las traducciones viajan con el código y
 * se vuelven a aplicar cuando Strapi regenera la configuración al cambiar un
 * schema.
 *
 * `hidden` saca el campo del formulario de edición (NO borra el dato ni la
 * columna). `readOnly` lo deja a la vista pero sin poder escribirlo, para los
 * campos que llena la aplicación sola.
 */

interface ContentTypeLabels {
  /** Etiqueta por campo. */
  labels: Record<string, string>;
  /** Campos que no se muestran en el formulario de edición. */
  hidden?: string[];
  /** Campos visibles pero no editables (los administra la app). */
  readOnly?: string[];
  /** Columnas de la tabla, en orden. */
  list?: string[];
  /** Campo que representa al registro en los selectores de relación. */
  mainField?: string;
}

export const ADMIN_LABELS: Record<string, ContentTypeLabels> = {
  'api::promotion.promotion': {
    labels: {
      code: 'Código',
      title: 'Título',
      description: 'Descripción',
      kind: 'Tipo de promoción',
      availability: 'Disponibilidad',
      weekdays: 'Días de la semana (0 = domingo)',
      appliesTo: 'Aplica a',
      active: 'Activa',
      discountType: 'Tipo de descuento',
      discountValue: 'Valor del descuento',
      validFrom: 'Válida desde',
      validUntil: 'Válida hasta',
      used: 'Ya se usó',
      usedAt: 'Fecha de uso',
      user: 'Cliente',
      packages: 'Solo en estos paquetes (vacío = todos)',
    },
    // Estos los llena la app sola: `code` lo genera un lifecycle a partir del
    // título (ver index.ts), y used/usedAt/user solo aplican a las de fidelidad,
    // que crea el programa de visitas. En una campaña siempre están vacíos.
    hidden: ['code', 'used', 'usedAt', 'user'],
    // `kind` NO va como solo lectura: es obligatorio, y si se bloquea no se
    // puede crear una promoción desde el panel de Strapi.
    readOnly: [],
    list: ['title', 'kind', 'discountType', 'discountValue', 'availability', 'active', 'used'],
    mainField: 'title',
  },

  'api::service.service': {
    labels: {
      date: 'Fecha',
      startedAt: 'Inició el lavado',
      finishedAt: 'Terminó el lavado',
      notes: 'Notas',
      totalAmount: 'Total cobrado',
      subtotalAmount: 'Subtotal (antes de descuentos)',
      extrasCharge: 'Otros servicios cobrados en caja',
      promotionDiscount: 'Descuento por promoción',
      manualDiscount: 'Descuento manual',
      discountNote: 'Motivo del descuento',
      promotion: 'Promoción aplicada',
      user: 'Cliente',
      performedBy: 'Lo lavó',
      vehicle: 'Auto',
      package: 'Paquete',
      extraServices: 'Servicios extra',
      appointment: 'Reservación de origen',
      isWalkIn: 'Sin cita (walk-in)',
      customerName: 'Nombre del cliente (walk-in)',
      vehicleType: 'Tipo de auto (walk-in)',
      isUberTaxi: 'Uber / Taxi',
      status: 'Estado',
    },
    readOnly: ['subtotalAmount', 'extrasCharge', 'promotionDiscount', 'manualDiscount', 'promotion'],
    list: ['date', 'status', 'customerName', 'totalAmount', 'performedBy'],
  },

  'api::appointment.appointment': {
    labels: {
      date: 'Fecha',
      timeSlot: 'Horario',
      status: 'Estado',
      customerNotes: 'Notas del cliente',
      adminNotes: 'Notas internas',
      user: 'Cliente',
      vehicle: 'Auto',
      package: 'Paquete',
      extraServices: 'Servicios extra',
    },
    list: ['date', 'timeSlot', 'status', 'user', 'package'],
  },

  'api::vehicle-type.vehicle-type': {
    labels: {
      name: 'Nombre',
      slug: 'Slug (lo que se guarda)',
      order: 'Orden',
      active: 'Activo',
    },
    list: ['name', 'slug', 'order', 'active'],
  },

  'api::vehicle.vehicle': {
    labels: {
      brand: 'Marca',
      model: 'Modelo',
      year: 'Año',
      color: 'Color',
      plate: 'Placas',
      notes: 'Notas',
      vehicleType: 'Tipo de auto',
      isUberTaxi: 'Uber / Taxi',
      photo: 'Foto',
      user: 'Dueño',
    },
    list: ['brand', 'model', 'plate', 'vehicleType', 'user'],
  },

  'api::package.package': {
    labels: {
      name: 'Nombre',
      slug: 'Slug (URL)',
      durationMinutes: 'Duración (minutos)',
      description: 'Descripción',
      benefits: 'Qué incluye',
      featured: 'Destacado',
      order: 'Orden',
      image: 'Imagen',
      pricing: 'Precios por tipo de auto',
      uberTaxiPrice: 'Precio Uber/Taxi (obsoleto)',
    },
    hidden: ['uberTaxiPrice'],
    list: ['name', 'durationMinutes', 'featured', 'order'],
    mainField: 'name',
  },

  'api::extra-service.extra-service': {
    labels: {
      name: 'Nombre',
      slug: 'Slug (URL)',
      description: 'Descripción',
      price: 'Precio base (obsoleto)',
      pricing: 'Precios por tipo de auto',
      quoteOnRequest: 'El precio depende del tamaño del auto (cotizar en sucursal)',
      uberTaxiPrice: 'Precio Uber/Taxi (obsoleto)',
      estimatedDuration: 'Duración estimada (minutos)',
      image: 'Imagen',
      featured: 'Destacado',
      order: 'Orden',
      active: 'Activo',
    },
    hidden: ['uberTaxiPrice'],
    list: ['name', 'estimatedDuration', 'active', 'order'],
    mainField: 'name',
  },

  'api::product.product': {
    labels: {
      name: 'Nombre',
      slug: 'Slug (URL)',
      price: 'Precio',
      stock: 'Existencias',
      description: 'Descripción',
      category: 'Categoría',
      active: 'Activo',
      images: 'Imágenes',
    },
    list: ['name', 'price', 'stock', 'active'],
    mainField: 'name',
  },

  'api::snack.snack': {
    labels: {
      name: 'Nombre',
      price: 'Precio',
      category: 'Categoría',
      order: 'Orden',
      active: 'Activo',
    },
    list: ['name', 'price', 'category', 'active'],
    mainField: 'name',
  },

  'api::snack-category.snack-category': {
    labels: {
      name: 'Nombre',
      order: 'Orden',
      active: 'Activa',
      snacks: 'Snacks',
    },
    list: ['name', 'order', 'active'],
    mainField: 'name',
  },

  'api::order.order': {
    labels: {
      status: 'Estado',
      total: 'Total',
      customerNotes: 'Notas del cliente',
      user: 'Cliente',
      items: 'Productos',
    },
    list: ['id', 'status', 'total', 'user'],
  },

  'api::order-item.order-item': {
    labels: {
      quantity: 'Cantidad',
      unitPrice: 'Precio unitario',
      product: 'Producto',
      order: 'Pedido',
    },
    list: ['product', 'quantity', 'unitPrice', 'order'],
  },

  'api::visit.visit': {
    labels: {
      date: 'Fecha',
      notes: 'Notas',
      user: 'Cliente',
      vehicle: 'Auto',
      package: 'Paquete',
      extraServices: 'Servicios extra',
    },
    list: ['date', 'user', 'vehicle', 'package'],
  },

  'api::loyalty-progress.loyalty-progress': {
    labels: {
      currentCount: 'Visitas acumuladas',
      cycleStartedAt: 'Ciclo iniciado el',
      user: 'Cliente',
    },
    list: ['user', 'currentCount', 'cycleStartedAt'],
  },

  'api::site-setting.site-setting': {
    labels: {
      businessName: 'Nombre del negocio',
      tagline: 'Lema',
      description: 'Descripción',
      logo: 'Logo',
      heroVideo: 'Video principal',
      heroImage: 'Imagen principal',
      gallery: 'Galería',
      bookingSlotDuration: 'Duración de cada horario (minutos)',
      maxBookingsPerSlot: 'Máximo de citas por horario',
      visitsForReward: 'Visitas para ganar promoción',
      loyaltyReward: 'Promoción de fidelidad',
      businessHours: 'Horarios de atención',
      closedDates: 'Días cerrados',
      faqs: 'Preguntas frecuentes',
      testimonials: 'Testimonios',
      contactInfo: 'Datos de contacto',
    },
  },
};

/**
 * Etiquetas de los campos DENTRO de un componente. Su configuración vive en
 * otra clave del store (`..._components::<uid>`), por eso va en un diccionario
 * aparte del de content types.
 */
const COMPONENT_LABELS: Record<string, ContentTypeLabels> = {
  'shared.loyalty-reward': {
    labels: {
      active: 'Activar',
      discountType: 'Tipo de descuento',
      discountValue: 'Valor del descuento',
      validDays: 'Días de vigencia de la recompensa',
      packages: 'Paquetes en los que aplica (vacío = todos)',
    },
  },
};

/**
 * Escribe las etiquetas en la configuración del Content Manager.
 *
 * Idempotente y conservador: solo toca `label`, `visible`, `editable`, las
 * columnas de la lista y el `mainField`. Si un campo del diccionario ya no
 * existe en el schema, se ignora — así un rename no rompe el arranque.
 */
export async function applyAdminLabels() {
  const knex = strapi.db.connection;
  const TABLE = 'strapi_core_store_settings';

  const targets = [
    ...Object.entries(ADMIN_LABELS).map(([uid, cfg]) => ({
      uid,
      cfg,
      prefix: 'content_types',
    })),
    ...Object.entries(COMPONENT_LABELS).map(([uid, cfg]) => ({
      uid,
      cfg,
      prefix: 'components',
    })),
  ];

  for (const { uid, cfg, prefix } of targets) {
    // Se lee la fila directamente en vez de usar strapi.store() para no depender
    // de cómo compone la clave: este formato ya está verificado contra la base.
    const storeKey = `plugin_content_manager_configuration_${prefix}::${uid}`;
    const row = await knex(TABLE).where({ key: storeKey }).first();
    if (!row?.value) {
      strapi.log.warn(`[bootstrap] Sin configuración de vistas para ${uid}; se omite`);
      continue;
    }

    let current;
    try {
      current = JSON.parse(row.value);
    } catch {
      strapi.log.warn(`[bootstrap] Configuración de vistas ilegible para ${uid}; se omite`);
      continue;
    }

    const hidden = new Set(cfg.hidden ?? []);
    const readOnly = new Set(cfg.readOnly ?? []);
    let changed = false;

    for (const [field, label] of Object.entries(cfg.labels)) {
      const meta = current.metadatas?.[field];
      if (!meta) continue; // el campo ya no existe en el schema

      if (meta.edit) {
        if (meta.edit.label !== label) { meta.edit.label = label; changed = true; }
        const visible = !hidden.has(field);
        if (meta.edit.visible !== visible) { meta.edit.visible = visible; changed = true; }
        const editable = !readOnly.has(field);
        if (meta.edit.editable !== editable) { meta.edit.editable = editable; changed = true; }
      }
      if (meta.list && meta.list.label !== label) {
        meta.list.label = label;
        changed = true;
      }
    }

    // Los campos ocultos también salen del layout de edición, o Strapi les
    // seguiría reservando su hueco en el formulario.
    if (hidden.size > 0 && Array.isArray(current.layouts?.edit)) {
      const trimmed = current.layouts.edit
        .map((row) => row.filter((cell) => !hidden.has(cell.name)))
        .filter((row) => row.length > 0);
      if (JSON.stringify(trimmed) !== JSON.stringify(current.layouts.edit)) {
        current.layouts.edit = trimmed;
        changed = true;
      }
    }

    if (cfg.list) {
      const valid = cfg.list.filter((f) => f === 'id' || current.metadatas?.[f]);
      if (valid.length > 0 && JSON.stringify(valid) !== JSON.stringify(current.layouts?.list)) {
        current.layouts.list = valid;
        changed = true;
      }
    }

    if (cfg.mainField && current.settings && current.settings.mainField !== cfg.mainField) {
      current.settings.mainField = cfg.mainField;
      changed = true;
    }

    if (changed) {
      await knex(TABLE).where({ key: storeKey }).update({ value: JSON.stringify(current) });
      strapi.log.info(`[bootstrap] Etiquetas en español aplicadas a ${uid}`);
    }
  }
}
