"use client";

import * as React from "react";

const STORAGE_KEY = "autolavado_cart";

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:update"));
}

export function useCart() {
  const [items, setItems] = React.useState<CartItem[]>([]);

  React.useEffect(() => {
    setItems(readStorage());
    const onUpdate = () => setItems(readStorage());
    window.addEventListener("cart:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("cart:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const add = React.useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    const current = readStorage();
    const existing = current.find((i) => i.productId === item.productId);
    let next: CartItem[];
    if (existing) {
      next = current.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      next = [...current, { ...item, quantity: qty }];
    }
    writeStorage(next);
  }, []);

  const remove = React.useCallback((productId: number) => {
    writeStorage(readStorage().filter((i) => i.productId !== productId));
  }, []);

  const setQty = React.useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      writeStorage(readStorage().filter((i) => i.productId !== productId));
      return;
    }
    writeStorage(readStorage().map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  }, []);

  const clear = React.useCallback(() => writeStorage([]), []);

  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  return { items, add, remove, setQty, clear, total, count };
}
