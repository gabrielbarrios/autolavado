import type { Schema, Struct } from '@strapi/strapi';

export interface SharedBusinessHour extends Struct.ComponentSchema {
  collectionName: 'components_shared_business_hours';
  info: {
    description: 'Horario de un d\u00EDa de la semana';
    displayName: 'Business Hour';
    icon: 'clock';
  };
  attributes: {
    close: Schema.Attribute.Time;
    closed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    day: Schema.Attribute.Enumeration<
      [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
    > &
      Schema.Attribute.Required;
    open: Schema.Attribute.Time;
  };
}

export interface SharedClosedDate extends Struct.ComponentSchema {
  collectionName: 'components_shared_closed_dates';
  info: {
    description: 'D\u00EDa cerrado (feriado, evento, mantenimiento, etc.)';
    displayName: 'Closed Date';
    icon: 'calendar-times';
  };
  attributes: {
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    reason: Schema.Attribute.String;
  };
}

export interface SharedContactInfo extends Struct.ComponentSchema {
  collectionName: 'components_shared_contact_infos';
  info: {
    description: 'Informaci\u00F3n de contacto';
    displayName: 'Contact Info';
    icon: 'phone';
  };
  attributes: {
    address: Schema.Attribute.String;
    email: Schema.Attribute.Email;
    facebook: Schema.Attribute.String;
    instagram: Schema.Attribute.String;
    mapUrl: Schema.Attribute.String;
    phone: Schema.Attribute.String;
    tiktok: Schema.Attribute.String;
    whatsapp: Schema.Attribute.String;
  };
}

export interface SharedFaq extends Struct.ComponentSchema {
  collectionName: 'components_shared_faqs';
  info: {
    description: 'Pregunta y respuesta';
    displayName: 'FAQ';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_shared_testimonials';
  info: {
    description: 'Testimonio de cliente';
    displayName: 'Testimonial';
    icon: 'comment';
  };
  attributes: {
    avatar: Schema.Attribute.Media<'images'>;
    message: Schema.Attribute.Text & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    role: Schema.Attribute.String;
  };
}

export interface SharedVehicleTypePrice extends Struct.ComponentSchema {
  collectionName: 'components_shared_vehicle_type_prices';
  info: {
    description: 'Precio del paquete seg\u00FAn el tipo de veh\u00EDculo';
    displayName: 'Vehicle Type Price';
    icon: 'car';
  };
  attributes: {
    price: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    uberTaxiPrice: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    vehicleType: Schema.Attribute.Enumeration<
      ['chico', 'sedan', 'suv', 'camioneta_grande', 'combi', 'uber_taxi']
    > &
      Schema.Attribute.Required;
    vipPrice: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.business-hour': SharedBusinessHour;
      'shared.closed-date': SharedClosedDate;
      'shared.contact-info': SharedContactInfo;
      'shared.faq': SharedFaq;
      'shared.testimonial': SharedTestimonial;
      'shared.vehicle-type-price': SharedVehicleTypePrice;
    }
  }
}
