import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Sparkles } from "lucide-react";
import { VISITS_FOR_REWARD } from "@/lib/constants";
import type { LoyaltyRow } from "@/types/models";

/**
 * Una barra por auto: cada auto acumula sus propias visitas y cierra el ciclo
 * con su umbral (Uber/Taxi o normal). Las filas salen de `buildLoyaltyRows`.
 *
 * `legacyCount`: visitas de antes del cambio a "por auto"; se le suman al
 * primer auto que se lave, así que se avisa en vez de esconderlas.
 */
export function LoyaltyProgress({
  rows,
  legacyCount = 0,
}: {
  rows: LoyaltyRow[];
  legacyCount?: number;
}) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-blue-500/10 via-card to-cyan-500/5">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Programa de fidelidad
          </div>
          <span className="text-xs text-muted-foreground">Cada auto suma sus propias visitas</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Registra tu auto para empezar a acumular visitas.{" "}
            <Link href="/autos/nuevo" className="font-medium text-primary hover:underline">
              Agregar auto
            </Link>
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <VehicleBar key={row.vehicleId} row={row} />
            ))}
          </ul>
        )}

        {legacyCount > 0 && (
          <p className="rounded-lg bg-background/60 p-2 text-xs text-muted-foreground">
            Tienes {legacyCount} visita{legacyCount > 1 ? "s" : ""} acumulada
            {legacyCount > 1 ? "s" : ""} de antes; se sumarán al primer auto que laves.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function VehicleBar({ row }: { row: LoyaltyRow }) {
  const target = row.visitsRequired > 0 ? row.visitsRequired : VISITS_FOR_REWARD;
  const safe = Math.max(0, Math.min(row.currentCount, target));
  const pct = (safe / target) * 100;
  const remaining = target - safe;
  return (
    <li>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
          <Car className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{row.vehicleLabel}</span>
          {row.isUberTaxi && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
              Uber/Taxi
            </span>
          )}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {safe} / {target} visitas
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {remaining > 0
          ? `Le falta${remaining > 1 ? "n" : ""} ${remaining} visita${remaining > 1 ? "s" : ""} para su próxima promoción.`
          : "¡Su próxima visita activa una promoción!"}
      </p>
    </li>
  );
}
