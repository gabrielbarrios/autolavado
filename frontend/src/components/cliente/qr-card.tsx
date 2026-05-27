"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadQrPdf } from "@/lib/qr-pdf";

export function QrCard({
  token,
  name,
  businessName,
}: {
  token: string;
  name: string;
  businessName: string;
}) {
  const canvasRef = React.useRef<HTMLDivElement>(null);

  function getCanvas(): HTMLCanvasElement | null {
    return canvasRef.current?.querySelector("canvas") ?? null;
  }

  function handleDownloadPng() {
    const canvas = getCanvas();
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${token.slice(0, 8)}.png`;
    a.click();
    toast.success("QR descargado");
  }

  function handleDownloadPdf() {
    const canvas = getCanvas();
    if (!canvas) return;
    downloadQrPdf({
      qrDataUrl: canvas.toDataURL("image/png"),
      customerName: name,
      qrToken: token,
      businessName,
    });
    toast.success("PDF generado");
  }

  return (
    <Card className="mx-auto max-w-sm border-primary/30 bg-gradient-to-br from-blue-500/10 via-card to-cyan-500/5">
      <CardContent className="p-8 text-center">
        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Tu QR personal</p>
        <h2 className="mb-6 text-lg font-semibold">{name}</h2>
        <div ref={canvasRef} className="mx-auto inline-block rounded-2xl bg-white p-4">
          <QRCodeCanvas value={token} size={220} level="H" includeMargin={false} />
        </div>
        <p className="mt-6 break-all font-mono text-xs text-muted-foreground">{token}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleDownloadPng}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button variant="premium" onClick={handleDownloadPdf}>
            <FileText className="h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
