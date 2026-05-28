"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import {
  Search,
  QrCode,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { downloadQrPdf } from "@/lib/qr-pdf";
import type { User } from "@/types/models";

const PAGE_SIZE = 10;

function userDisplayName(u: User): string {
  return u.name?.trim() || u.username;
}

function roleLabel(u: User): string {
  if (typeof u.role === "string") return u.role;
  return u.role?.name ?? "—";
}

export function ClientesTable({
  users,
  businessName,
}: {
  users: User[];
  businessName: string;
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const username = u.username.toLowerCase();
      const email = u.email.toLowerCase();
      const phone = (u.phone ?? "").toLowerCase();
      return (
        name.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });
  }, [users, query]);

  // Resetear página al buscar
  React.useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono…"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
          {query && ` (de ${users.length})`}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop: tabla */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium text-right">Visitas</th>
                  <th className="px-4 py-3 font-medium text-right">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      {query ? "Sin resultados para tu búsqueda." : "Sin clientes aún."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium">{userDisplayName(u)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{roleLabel(u)}</td>
                      <td className="px-4 py-3 text-right font-mono">{u.visitCount ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(u)}
                          disabled={!u.qrToken}
                          title={u.qrToken ? "Ver QR" : "Sin QR registrado"}
                        >
                          <QrCode className="h-4 w-4" /> Ver QR
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="divide-y divide-border/40 md:hidden">
            {pageItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {query ? "Sin resultados para tu búsqueda." : "Sin clientes aún."}
              </p>
            ) : (
              pageItems.map((u) => (
                <div key={u.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{userDisplayName(u)}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUser(u)}
                      disabled={!u.qrToken}
                      title={u.qrToken ? "Ver QR" : "Sin QR registrado"}
                      className="shrink-0"
                    >
                      <QrCode className="h-4 w-4" /> QR
                    </Button>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Teléfono</dt>
                      <dd className="truncate">{u.phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Rol</dt>
                      <dd className="truncate">{roleLabel(u)}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-muted-foreground">Visitas</dt>
                      <dd className="font-mono">{u.visitCount ?? 0}</dd>
                    </div>
                  </dl>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ClientQrDialog
        user={selectedUser}
        businessName={businessName}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
}

function ClientQrDialog({
  user,
  businessName,
  onClose,
}: {
  user: User | null;
  businessName: string;
  onClose: () => void;
}) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const open = !!user;
  const token = user?.qrToken ?? "";
  const name = user ? userDisplayName(user) : "";

  function getCanvas(): HTMLCanvasElement | null {
    return canvasRef.current?.querySelector("canvas") ?? null;
  }

  function handleDownloadPng() {
    const canvas = getCanvas();
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${token.slice(0, 8) || "cliente"}.png`;
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="sm:text-center">
          <DialogTitle>QR de {name}</DialogTitle>
          <DialogDescription>
            Descárgalo como PDF (con el encabezado de {businessName}) o PNG para enviárselo al cliente.
          </DialogDescription>
        </DialogHeader>

        {token && (
          <div className="space-y-4 pt-2">
            <div className="flex justify-center">
              <div
                ref={canvasRef}
                className="rounded-2xl bg-white p-4"
              >
                <QRCodeCanvas value={token} size={240} level="H" includeMargin={false} />
              </div>
            </div>
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              {token}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={handleDownloadPng}>
                <Download className="h-4 w-4" /> PNG
              </Button>
              <Button variant="premium" onClick={handleDownloadPdf}>
                <FileText className="h-4 w-4" /> Descargar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
