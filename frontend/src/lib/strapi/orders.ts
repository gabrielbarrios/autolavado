import { strapiServerFetch } from "./server";
import type { Order } from "@/types/models";
import type { StrapiCollectionResponse, StrapiSingleResponse } from "@/types/strapi";

export interface CreateOrderPayload {
  user: number;
  total: number;
  customerNotes?: string;
  items: { product: number; quantity: number; unitPrice: number }[];
}

export async function createOrder(payload: CreateOrderPayload) {
  // Crea la order y luego sus order-items (Strapi 5 maneja relaciones inline si la api lo permite).
  const order = await strapiServerFetch<StrapiSingleResponse<Order>>("/api/orders", {
    method: "POST",
    body: {
      data: {
        user: payload.user,
        total: payload.total,
        customerNotes: payload.customerNotes,
        status: "pending",
      },
    },
  });
  const orderId = order.data?.id;
  if (orderId) {
    await Promise.all(
      payload.items.map((item) =>
        strapiServerFetch("/api/order-items", {
          method: "POST",
          body: { data: { ...item, order: orderId } },
        }),
      ),
    );
  }
  return order;
}

export async function listMyOrders(userId: number): Promise<Order[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Order>>("/api/orders", {
    query: {
      "filters[user][id][$eq]": userId,
      "populate[items][populate]": "product",
      "sort[0]": "createdAt:desc",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}

export async function listAllOrders(): Promise<Order[]> {
  const res = await strapiServerFetch<StrapiCollectionResponse<Order>>("/api/orders", {
    query: {
      "populate[user]": "true",
      "populate[items][populate]": "product",
      "sort[0]": "createdAt:desc",
      "pagination[pageSize]": "200",
    },
    cache: "no-store",
  });
  return res.data ?? [];
}
