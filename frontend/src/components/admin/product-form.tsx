"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckPill, RadioPill } from "@/components/admin/pills";
import { createProductAction } from "@/actions/catalog";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

const CATEGORY_LABELS: Record<string, string> = {
  limpieza: "Limpieza",
  interior: "Interior",
  exterior: "Exterior",
  accesorios: "Accesorios",
  otros: "Otros",
};

/**
 * Alta de productos de la tienda. Mismo patrón que `PackageForm`, pero aquí el
 * precio es uno solo (no depende del tipo de auto) y hay stock.
 */
export function ProductForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createProductAction(null, fd);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Producto creado");
    formRef.current?.reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo producto
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Shampoo para auto 1L" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" name="stock" type="number" min="0" step="1" defaultValue="0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Qué es y para qué sirve"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Categoría</legend>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((c) => (
                <RadioPill
                  key={c}
                  name="category"
                  value={c}
                  label={CATEGORY_LABELS[c] ?? c}
                  defaultChecked={c === "otros"}
                />
              ))}
            </div>
          </fieldset>

          <CheckPill name="active" label="Activo" defaultChecked />

          <p className="text-xs text-muted-foreground">
            Las imágenes se suben después desde Strapi (Content Manager → Producto).
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear producto
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
