"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createOrder } from "@/lib/strapi/orders";
import { StrapiError } from "@/lib/strapi/client";
import type { ActionResult } from "./auth";

export interface CheckoutItem {
  productId: number;
  unitPrice: number;
  quantity: number;
}

export async function checkoutAction(
  items: CheckoutItem[],
  customerNotes?: string,
): Promise<ActionResult<{ orderId: number | null }>> {
  const { user } = await requireUser();
  if (items.length === 0) return { ok: false, error: "Carrito vacío" };
  const total = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  try {
    const order = await createOrder({
      user: user.id,
      total,
      customerNotes,
      items: items.map((i) => ({ product: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
    revalidatePath("/pedidos");
    return { ok: true, data: { orderId: order.data?.id ?? null } };
  } catch (err) {
    return { ok: false, error: err instanceof StrapiError ? err.message : "No se pudo crear el pedido" };
  }
}
