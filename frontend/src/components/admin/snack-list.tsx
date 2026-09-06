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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import {
  createSnackAction,
  updateSnackAction,
  toggleSnackAction,
  deleteSnackAction,
  createSnackCategoryAction,
  renameSnackCategoryAction,
  deleteSnackCategoryAction,
} from "@/actions/snacks";
import type { Snack, SnackCategory } from "@/types/models";

/**
 * Radix no admite un `SelectItem` con value vacío, así que "sin categoría"
 * viaja con este centinela y se traduce a `null` al guardar.
 */
const NO_CATEGORY = "none";

const NO_CATEGORY_LABEL = "Sin categoría";

function toCategoryId(value: string): number | null {
  return value === NO_CATEGORY ? null : Number(value);
}

function toSelectValue(id: number | null | undefined): string {
  return id ? String(id) : NO_CATEGORY;
}

/**
 * La lista de snacks completa, agrupada por categoría: alta arriba, y cada
 * renglón se edita en su sitio. Es una lista corta que se retoca seguido (sube
 * un refresco, se acaban las papas), así que no vale la pena mandar al dueño a
 * otra pantalla por cada cambio de precio.
 */
export function SnackList({
  snacks,
  categories,
}: {
  snacks: Snack[];
  categories: SnackCategory[];
}) {
  // Un grupo por categoría existente, en su orden, y al final los sueltos: así
  // una categoría recién creada se ve aunque todavía no tenga nada dentro.
  const groups = [
    ...categories.map((category) => ({
      key: String(category.id),
      title: category.name,
      items: snacks.filter((s) => s.category?.id === category.id),
    })),
    {
      key: NO_CATEGORY,
      title: NO_CATEGORY_LABEL,
      items: snacks.filter((s) => !s.category),
    },
  ].filter((g) => g.items.length > 0 || g.key !== NO_CATEGORY);

  return (
    <div className="space-y-6">
      <CategoryManager categories={categories} snacks={snacks} />
      <NewSnackForm categories={categories} />

      {snacks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Todavía no hay snacks. Agrega el primero con el formulario de arriba.
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title} ({group.items.length})
            </h2>
            <Card>
              <CardContent className="p-0">
                {group.items.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Sin snacks en esta categoría.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {group.items.map((snack) => (
                      <SnackRow key={snack.id} snack={snack} categories={categories} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Categorías                                                          */
/* ------------------------------------------------------------------ */

function CategoryManager({
  categories,
  snacks,
}: {
  categories: SnackCategory[];
  snacks: Snack[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createSnackCategoryAction(null, fd);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Categoría creada");
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Categorías</h2>
          <p className="text-sm text-muted-foreground">
            Cómo se agrupa la lista para el cliente: gusgueritas, postres, comida… Borrar una
            categoría no borra sus snacks, quedan sin agrupar.
          </p>
        </div>

        {categories.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                category={category}
                count={snacks.filter((s) => s.category?.id === category.id).length}
              />
            ))}
          </ul>
        )}

        <form ref={formRef} onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor="category-name">Nueva categoría</Label>
            <Input id="category-name" name="name" placeholder="Gusgueritas" required />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CategoryChip({ category, count }: { category: SnackCategory; count: number }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(category.name);
  const [busy, setBusy] = React.useState(false);

  async function onRename() {
    setBusy(true);
    const res = await renameSnackCategoryAction(category.id, name);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Categoría renombrada");
    setEditing(false);
    router.refresh();
  }

  async function onDelete() {
    const warning =
      count > 0
        ? `¿Eliminar "${category.name}"? Sus ${count} snack(s) quedarán sin categoría.`
        : `¿Eliminar "${category.name}"?`;
    if (!confirm(warning)) return;
    setBusy(true);
    const res = await deleteSnackCategoryAction(category.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Categoría eliminada");
    router.refresh();
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-2 py-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Nombre de ${category.name}`}
          className="h-7 w-40"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRename} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            setName(category.name);
            setEditing(false);
          }}
          disabled={busy}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-1 rounded-full border border-border bg-card/50 py-1 pl-3 pr-1 text-sm">
      <span className="font-medium">{category.name}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() => setEditing(true)}
        disabled={busy}
        aria-label={`Renombrar ${category.name}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onDelete}
        disabled={busy}
        aria-label={`Eliminar ${category.name}`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Snacks                                                              */
/* ------------------------------------------------------------------ */

/** Selector de categoría. Va con input oculto para viajar en el FormData del alta. */
function CategorySelect({
  categories,
  value,
  onChange,
  name,
  label,
}: {
  categories: SnackCategory[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  label: string;
}) {
  return (
    <>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_CATEGORY}>{NO_CATEGORY_LABEL}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {name && <input type="hidden" name={name} value={value === NO_CATEGORY ? "" : value} />}
    </>
  );
}

function NewSnackForm({ categories }: { categories: SnackCategory[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [category, setCategory] = React.useState(NO_CATEGORY);
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
    // La categoría NO se reinicia: al cargar el menú se capturan varios seguidos
    // del mismo grupo.
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
          <div className="space-y-2 sm:w-32">
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
          <div className="space-y-2 sm:w-48">
            <Label>Categoría</Label>
            <CategorySelect
              categories={categories}
              value={category}
              onChange={setCategory}
              name="category"
              label="Categoría del nuevo snack"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SnackRow({ snack, categories }: { snack: Snack; categories: SnackCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState(snack.name);
  const [price, setPrice] = React.useState(String(snack.price));
  const [category, setCategory] = React.useState(toSelectValue(snack.category?.id));
  const active = snack.active !== false;

  function cancelEdit() {
    setName(snack.name);
    setPrice(String(snack.price));
    setCategory(toSelectValue(snack.category?.id));
    setEditing(false);
  }

  async function onSave() {
    setBusy(true);
    const res = await updateSnackAction(snack.id, {
      name,
      price: Number(price),
      category: toCategoryId(category),
    });
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
          className="sm:w-28"
        />
        <div className="sm:w-44">
          <CategorySelect
            categories={categories}
            value={category}
            onChange={setCategory}
            label={`Categoría de ${snack.name}`}
          />
        </div>
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
