"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronDown, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  scanQRAction,
  registerVisitAction,
  redeemPromotionAction,
  completeAppointmentFromQRAction,
} from "@/actions/qr";
import { formatDate, formatPrice, cn } from "@/lib/utils";
import {
  isVipUser,
  computePackagePrice,
  computeExtraServicePrice,
  extraServicePriceText,
  vehicleTypeLabel,
} from "@/lib/pricing";
import type { AppointmentStatus, ExtraService, Package } from "@/types/models";
import type { QRScanResult } from "@/lib/strapi/qr";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";

const APPT_STATUS_VARIANT = {
  pending: "warning",
  approved: "info",
  cancelled: "destructive",
  completed: "success",
} as const satisfies Record<AppointmentStatus, "warning" | "info" | "destructive" | "success">;

const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  cancelled: "Cancelada",
  completed: "Completada",
};

interface Html5QrcodeLike {
  start: (
    cameraIdOrConfig: { facingMode: string },
    config: { fps: number; qrbox: number },
    onSuccess: (decodedText: string) => void,
    onError?: (msg: string) => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

function CompleteAppointmentRow({ appointment }: { appointment: import("@/types/models").Appointment }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onComplete() {
    setLoading(true);
    const res = await completeAppointmentFromQRAction(appointment.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("✅ Cita completada y servicio registrado", { duration: 4000 });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 p-2">
      <div className="flex-1 text-xs">
        {/* div y no p: Badge renderiza un <div>, que no es válido dentro de <p>. */}
        <div className="flex flex-wrap items-center gap-x-1 font-medium">
          {appointment.package?.name ?? "Paquete"} ·{" "}
          <span className="font-mono">{appointment.timeSlot?.slice(0, 5)}</span>
          {appointment.status === "pending" && (
            <Badge variant="warning" className="ml-1 text-[10px]">
              pendiente
            </Badge>
          )}
        </div>
        {appointment.vehicle && (
          <p className="text-muted-foreground">
            {appointment.vehicle.brand} {appointment.vehicle.model} · {appointment.vehicle.plate || "—"}
          </p>
        )}
        {appointment.extraServices && appointment.extraServices.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {appointment.extraServices.map((e) => (
              <span key={e.id} className="text-[10px] text-muted-foreground">
                + {e.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="premium"
        onClick={onComplete}
        disabled={loading}
        className="shrink-0"
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        Completar
      </Button>
    </div>
  );
}

export function QrScanner({
  packages,
  extraServices = [],
}: {
  packages: Package[];
  extraServices?: ExtraService[];
}) {
  const vehicleTypes = useVehicleTypes();
  const [scanning, setScanning] = React.useState(false);
  const [manualToken, setManualToken] = React.useState("");
  const [result, setResult] = React.useState<QRScanResult | null>(null);
  // La tarifa la define el CLIENTE escaneado, no el admin que escanea.
  const priceCtx = React.useMemo(
    () => ({ isVip: isVipUser(result?.user) }),
    [result?.user],
  );
  const [vehicleId, setVehicleId] = React.useState<number | null>(null);
  const [packageId, setPackageId] = React.useState<number | null>(packages[0]?.id ?? null);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedExtras, setSelectedExtras] = React.useState<Set<number>>(new Set());
  const [showAllAppts, setShowAllAppts] = React.useState(false);
  const scannerRef = React.useRef<Html5QrcodeLike | null>(null);

  // Reset toggle al cambiar de cliente.
  React.useEffect(() => {
    setShowAllAppts(false);
  }, [result?.user.id]);

  function toggleExtra(id: number) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  React.useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
      scannerRef.current?.clear();
    };
  }, []);

  async function startCamera() {
    const { Html5Qrcode } = await import("html5-qrcode");
    const instance = new Html5Qrcode("qr-reader") as unknown as Html5QrcodeLike;
    scannerRef.current = instance;
    setScanning(true);
    try {
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        async (decoded) => {
          await instance.stop().catch(() => undefined);
          setScanning(false);
          await handleScan(decoded);
        },
      );
    } catch {
      toast.error("No se pudo acceder a la cámara");
      setScanning(false);
    }
  }

  async function handleScan(token: string) {
    const res = await scanQRAction(token);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResult(res.data ?? null);
    setVehicleId(res.data?.vehicles[0]?.id ?? null);
    toast.success(`Cliente identificado: ${res.data?.user.name ?? res.data?.user.email}`);
  }

  async function submit() {
    if (!result || !vehicleId || !packageId) {
      toast.error("Selecciona vehículo y paquete");
      return;
    }
    setSubmitting(true);
    const res = await registerVisitAction({
      userId: result.user.id,
      vehicleId,
      packageId,
      notes,
      extraServiceIds: Array.from(selectedExtras),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Servicio iniciado — márcalo como completado en /en-progreso cuando termines", {
      duration: 5000,
    });
    setResult(null);
    setNotes("");
    setSelectedExtras(new Set());
  }

  async function redeem(id: number) {
    const res = await redeemPromotionAction(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Promoción aplicada");
    if (result) {
      setResult({ ...result, activePromotions: result.activePromotions.filter((p) => p.id !== id) });
    }
  }

  function reset() {
    setResult(null);
    setManualToken("");
    setVehicleId(null);
    setNotes("");
    setSelectedExtras(new Set());
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Escanear QR del cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id="qr-reader" className={cn("overflow-hidden rounded-xl bg-black", !scanning && "hidden")} />
          {!scanning && (
            <Button onClick={startCamera} variant="premium" className="w-full" size="lg">
              <Camera className="h-4 w-4" /> Activar cámara
            </Button>
          )}
          <div className="relative my-4 text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-card px-2">o ingresa el token manualmente</span>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="qr-token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <Button onClick={() => handleScan(manualToken)} disabled={!manualToken}>
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cliente identificado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Escanea un QR o ingresa el token del cliente para empezar.
            </p>
          ) : (
            <>
              <div>
                <p className="text-lg font-semibold">{result.user.name ?? result.user.username}</p>
                <p className="text-sm text-muted-foreground">{result.user.email}</p>
                {result.user.phone && <p className="text-sm text-muted-foreground">{result.user.phone}</p>}
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs">
                <p className="mb-1 font-medium">Fidelidad</p>
                <p className="text-muted-foreground">
                  {result.loyaltyProgress?.currentCount ?? 0} / 3 visitas hacia la próxima promoción
                </p>
              </div>

              {result.todayAppointments && result.todayAppointments.length > 0 && (
                <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <p className="text-sm font-semibold text-primary">
                    📅 Tiene cita{result.todayAppointments.length > 1 ? "s" : ""} hoy
                  </p>
                  {result.todayAppointments.map((appt) => (
                    <CompleteAppointmentRow key={appt.id} appointment={appt} />
                  ))}
                  <p className="text-[10px] text-muted-foreground">
                    Completar la cita registra automáticamente la visita y suma fidelidad.
                  </p>
                </div>
              )}

              {result.appointments && result.appointments.length > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAllAppts((s) => !s)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:bg-card/60"
                    aria-expanded={showAllAppts}
                  >
                    <span className="font-medium">
                      📋 Todas las reservaciones ({result.appointments.length})
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showAllAppts && "rotate-180",
                      )}
                    />
                  </button>
                  {showAllAppts && (
                    <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card/20 p-2">
                      {result.appointments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-start justify-between gap-2 rounded-md border border-border/40 bg-background/60 p-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {a.package?.name ?? "—"}
                            </p>
                            <p className="text-muted-foreground">
                              {formatDate(a.date)} ·{" "}
                              <span className="font-mono">{a.timeSlot?.slice(0, 5)}</span>
                            </p>
                            {a.vehicle && (
                              <p className="truncate text-muted-foreground">
                                {a.vehicle.brand} {a.vehicle.model}
                                {a.vehicle.plate && ` · ${a.vehicle.plate}`}
                              </p>
                            )}
                          </div>
                          <Badge variant={APPT_STATUS_VARIANT[a.status]} className="shrink-0 text-[10px]">
                            {APPT_STATUS_LABEL[a.status]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.activePromotions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Promociones activas</p>
                  {result.activePromotions.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.code}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => redeem(p.id)}>
                        <Sparkles className="h-3 w-3" /> Aplicar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Vehículo</Label>
                <div className="flex flex-wrap gap-2">
                  {result.vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleId(v.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-left text-xs",
                        vehicleId === v.id ? "border-primary bg-primary/10" : "border-border",
                      )}
                    >
                      <div>
                        {v.brand} {v.model} · {v.plate || "Sin placa"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {vehicleTypeLabel(v.vehicleType, vehicleTypes)}
                        {v.isUberTaxi ? " · Uber/Taxi" : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Paquete</Label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const selectedVehicle = result.vehicles.find((v) => v.id === vehicleId);
                    return packages.map((p) => {
                      const price = computePackagePrice(p, selectedVehicle, priceCtx);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPackageId(p.id)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs",
                            packageId === p.id ? "border-primary bg-primary/10" : "border-border",
                          )}
                        >
                          {p.name} · {price > 0 ? formatPrice(price) : "Sin precio"}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {extraServices.length > 0 && (
                <div className="space-y-2">
                  <Label>Servicios extras (opcional)</Label>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {extraServices.map((s) => {
                      const sel = selectedExtras.has(s.id);
                      const vForPrice = result.vehicles.find((v) => v.id === vehicleId);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleExtra(s.id)}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border p-2 text-left text-xs transition-colors",
                            sel
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/60",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              sel
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background",
                            )}
                          >
                            {sel && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex-1 leading-tight">{s.name}</span>
                          <span className="shrink-0 font-semibold">
                            {extraServicePriceText(s, vForPrice, priceCtx, true)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const selectedVehicle = result.vehicles.find((v) => v.id === vehicleId);
                const selectedPkg = packages.find((p) => p.id === packageId);
                const pkgPrice = selectedPkg ? computePackagePrice(selectedPkg, selectedVehicle, priceCtx) : 0;
                const extrasTotal = extraServices
                  .filter((e) => selectedExtras.has(e.id))
                  .reduce((acc, e) => acc + computeExtraServicePrice(e, selectedVehicle, priceCtx), 0);
                const total = pkgPrice + extrasTotal;
                if (!selectedPkg) return null;
                return (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Paquete</span>
                      <span className="font-mono">{formatPrice(pkgPrice)}</span>
                    </div>
                    {extrasTotal > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Extras ({selectedExtras.size})</span>
                        <span className="font-mono">{formatPrice(extrasTotal)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-border/40 pt-1 font-semibold">
                      <span>Total</span>
                      <span className="font-mono text-base">{formatPrice(total)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button onClick={submit} variant="premium" className="flex-1" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Registrar servicio
                </Button>
                <Button onClick={reset} variant="outline">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
