import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { VISITS_FOR_REWARD } from "@/lib/constants";

/**
 * `total` es el umbral que aplica a ESTE cliente (Uber o normal), resuelto con
 * `resolveVisitsRequired`. Sin él se cae al respaldo de constants.ts.
 */
export function LoyaltyProgress({
  current,
  total = VISITS_FOR_REWARD,
}: {
  current: number;
  total?: number;
}) {
  const target = total > 0 ? total : VISITS_FOR_REWARD;
  const safe = Math.max(0, Math.min(current, target));
  const pct = (safe / target) * 100;
  const remaining = target - safe;
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-blue-500/10 via-card to-cyan-500/5">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Programa de fidelidad
          </div>
          <span className="text-xs text-muted-foreground">
            {safe} / {target} visitas
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {remaining > 0
            ? `Te faltan ${remaining} visita${remaining > 1 ? "s" : ""} para tu próxima promoción.`
            : "¡Tu próxima visita activa una promoción!"}
        </p>
      </CardContent>
    </Card>
  );
}
