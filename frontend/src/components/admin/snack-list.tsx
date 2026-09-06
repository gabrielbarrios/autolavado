"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/utils";
import {
  createSnackAction,
  updateSnackAction,
  toggleSnackAction,
  deleteSnackAction,
} from "@/actions/snacks";
import type { Snack } from "@/types/models";

/**
 * La lista de snacks completa: alta arriba, y cada renglón se edita en su sitio.
 * Es una lista corta que se retoca seguido (sube un refresco, se acaban las
 * papas), así que no vale la pena mandar al dueño a otra pantalla por cada
 * cambio de precio.
 */
export function SnackList({ snacks }: { snacks: Snack[] }) {
  return (
    <div className="space-y-6">
      <NewSnackForm />

      <Card>
        <CardContent className="p-0">
          {snacks.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Todavía no hay snacks. Agrega el primero con el formulario de arriba.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {snacks.map((snack) => (
                <SnackRow key={snack.id} snack={snack} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewSnackForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createSnackAction(null, fd);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Snack agregado");
    formRef.current?.reset();
    // El foco vuelve al nombre para encadenar altas sin tocar el mouse.
    formRef.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="snack-name">Nombre</Label>
            <Input id="snack-name" name="name" placeholder="Coca-Cola 600 ml" required />
          </div>
          <div className="space-y-2 sm:w-40">
            <Label htmlFor="snack-price">Precio</Label>
            <Input
              id="snack-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="25"
              required
            />
          </div>
          <Button type="submit" disabled={pending} className="sm:mb-0">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SnackRow({ snack }: { snack: Snack }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState(snack.name);
  const [price, setPrice] = React.useState(String(snack.price));
  const active = snack.active !== false;

  function cancelEdit() {
    setName(snack.name);
    setPrice(String(snack.price));
    setEditing(false);
  }

  async function onSave() {
    setBusy(true);
    const res = await updateSnackAction(snack.id, { name, price: Number(price) });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Snack actualizado");
    setEditing(false);
    router.refresh();
  }

  async function onToggle(next: boolean) {
    setBusy(true);
    const res = await toggleSnackAction(snack.id, next);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(next ? "A la venta" : "Fuera de la lista");
    router.refresh();
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar "${snack.name}"? No se puede deshacer.`)) return;
    setBusy(true);
    const res = await deleteSnackAction(snack.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Snack eliminado");
    router.refresh();
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre"
          className="flex-1"
        />
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          aria-label="Precio"
          className="sm:w-32"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </Button>
          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={busy}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-3 p-4 ${active ? "" : "opacity-60"}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{snack.name}</p>
        {!active && <p className="text-xs text-muted-foreground">Fuera de la lista</p>}
      </div>
      <span className="shrink-0 font-mono text-lg font-semibold">{formatPrice(snack.price)}</span>
      <div className="flex shrink-0 items-center gap-1">
        <Switch
          checked={active}
          onCheckedChange={onToggle}
          disabled={busy}
          aria-label={active ? "Quitar de la lista" : "Poner a la venta"}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          disabled={busy}
          aria-label={`Editar ${snack.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Eliminar ${snack.name}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </li>
  );
}
