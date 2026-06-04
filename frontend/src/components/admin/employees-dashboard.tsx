"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Users, Sparkles, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import { formatPrice } from "@/lib/utils";
import type { EmployeeStats } from "@/lib/strapi/admin";

const PRIMARY = "#22c55e";
const ACCENT = "#38bdf8";

/** Acorta una fecha YYYY-MM-DD a DD/MM para el eje. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function EmployeesDashboard({ stats }: { stats: EmployeeStats }) {
  const { admins, daily, totals, unassigned } = stats;

  const earningsByAdmin = admins.map((a) => ({
    name: a.name,
    Ganancias: Number(a.earnings.toFixed(2)),
    Lavados: a.washes,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Empleados (admins)" value={totals.admins} />
        <StatCard icon={Sparkles} label="Lavados totales" value={totals.washes} />
        <StatCard icon={DollarSign} label="Ganancias totales" value={formatPrice(totals.earnings)} />
      </div>

      {/* Ganancias por admin */}
      <Card>
        <CardHeader>
          <CardTitle>Ganancias por empleado</CardTitle>
        </CardHeader>
        <CardContent>
          {earningsByAdmin.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay empleados todavía.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsByAdmin} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "Ganancias" ? formatPrice(value) : value
                    }
                    contentStyle={{
                      background: "#0b0b0c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Ganancias" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tendencia diaria (últimos 30 días) */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia (últimos 30 días)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={daily.map((d) => ({
                  fecha: shortDate(d.date),
                  Lavados: d.washes,
                  Ganancias: Number(d.earnings.toFixed(2)),
                }))}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "Ganancias" ? formatPrice(value) : value
                  }
                  contentStyle={{
                    background: "#0b0b0c",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="Lavados" stroke={ACCENT} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Ganancias" stroke={PRIMARY} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabla por empleado */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por empleado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium text-right">Lavados</th>
                <th className="px-4 py-3 font-medium text-right">Ganancias</th>
                <th className="px-4 py-3 font-medium text-right">Ticket prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={a.role === "superadmin" ? "default" : "outline"} className="text-[10px]">
                      {a.role === "superadmin" ? "Super Admin" : "Admin"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{a.washes}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatPrice(a.earnings)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {a.washes > 0 ? formatPrice(a.earnings / a.washes) : "—"}
                  </td>
                </tr>
              ))}
              {unassigned.washes > 0 && (
                <tr className="bg-amber-500/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-amber-200">Sin acreditar</p>
                    <p className="text-xs text-muted-foreground">Servicios sin admin asignado</p>
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right font-mono">{unassigned.washes}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatPrice(unassigned.earnings)}</td>
                  <td className="px-4 py-3 text-right font-mono">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
