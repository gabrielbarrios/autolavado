"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
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
import { formatPrice, cn } from "@/lib/utils";
import {
  computePackagePrice,
  computeExtraServicePrice,
  vehicleTypeLabel,
} from "@/lib/pricing";
import type { ExtraService, Package } from "@/types/models";
import type { QRScanResult } from "@/lib/strapi/qr";

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
        <p className="font-medium">
          {appointment.package?.name ?? "Paquete"} ·{" "}
          <span className="font-mono">{appointment.timeSlot?.slice(0, 5)}</span>
          {appointment.status === "pending" && (
            <Badge variant="warning" className="ml-2 text-[10px]">
              pendiente
            </Badge>
          )}
        </p>
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
  const [scanning, setScanning] = React.useState(false);
  const [manualToken, setManualToken] = React.useState("");
  const [result, setResult] = React.useState<QRScanResult | null>(null);
  const [vehicleId, setVehicleId] = React.useState<number | null>(null);
  const [packageId, setPackageId] = React.useState<number | null>(packages[0]?.id ?? null);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedExtras, setSelectedExtras] = React.useState<Set<number>>(new Set());
  const scannerRef = React.useRef<Html5QrcodeLike | null>(null);

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
    if (res.data?.promotionGenerated) {
      toast.success("🎉 ¡Promoción generada para este cliente!", { duration: 6000 });
    } else {
      toast.success("Visita registrada");
    }
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
                        {vehicleTypeLabel(v.vehicleType)}
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
                      const price = computePackagePrice(p, selectedVehicle);
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
                            {formatPrice(computeExtraServicePrice(s, vForPrice))}
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
                const pkgPrice = selectedPkg ? computePackagePrice(selectedPkg, selectedVehicle) : 0;
                const extrasTotal = extraServices
                  .filter((e) => selectedExtras.has(e.id))
                  .reduce((acc, e) => acc + computeExtraServicePrice(e, selectedVehicle), 0);
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
