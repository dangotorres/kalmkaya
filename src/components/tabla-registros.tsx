"use client";

import { Registro } from "@/lib/sheets";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  registros: Registro[];
  nombreHoja: string;
  isAdmin: boolean;
  showTotals?: boolean;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default function TablaRegistros({ registros, nombreHoja, isAdmin, showTotals = true }: Props) {
  const totalIngresos = registros.reduce((a, r) => a + (r.precio ?? 0), 0);
  const totalEgresos = registros.reduce((a, r) => a + (r.egreso ?? 0), 0);
  const neto = totalIngresos - totalEgresos;

  const porColaborador = ["Karen", "Mike", "Clau"].map((nombre) => {
    const suyos = registros.filter((r) => r.colaborador === nombre && r.precio);
    const total = suyos.reduce((a, r) => a + (r.precio ?? 0), 0);
    const efectivo = suyos.filter((r) => r.tipoPago === "Efectivo").reduce((a, r) => a + (r.precio ?? 0), 0);
    const terminal = suyos.filter((r) => r.tipoPago === "Terminal").reduce((a, r) => a + (r.precio ?? 0), 0);
    return { nombre, servicios: suyos.length, efectivo, terminal, total };
  }).filter((c) => c.servicios > 0);

  const porTipoPago = {
    efectivo: registros.filter((r) => r.tipoPago === "Efectivo" && r.precio).reduce((a, r) => a + (r.precio ?? 0), 0),
    terminal: registros.filter((r) => r.tipoPago === "Terminal" && r.precio).reduce((a, r) => a + (r.precio ?? 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Cards de resumen — ocultas para colaboradores */}
      {showTotals && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Ingresos</p>
              <p className="text-sm sm:text-xl font-bold text-green-800 mt-1">{fmt(totalIngresos)}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Egresos</p>
              <p className="text-sm sm:text-xl font-bold text-red-800 mt-1">{fmt(totalEgresos)}</p>
            </CardContent>
          </Card>
          <Card className={`border-stone-200 ${neto >= 0 ? "bg-stone-50" : "bg-orange-50"}`}>
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-stone-700 font-medium uppercase tracking-wide">Neto</p>
              <p className={`text-sm sm:text-xl font-bold mt-1 ${neto >= 0 ? "text-stone-800" : "text-orange-700"}`}>
                {fmt(neto)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Desglose por colaborador y tipo de pago — solo admin */}
      {isAdmin && porColaborador.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-stone-600">Desglose por colaborador</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Servicios</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Efectivo</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Terminal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porColaborador.map((c) => (
                    <TableRow key={c.nombre}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-right">{c.servicios}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{fmt(c.efectivo)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{fmt(c.terminal)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(c.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-stone-600">Efectivo: <strong>{fmt(porTipoPago.efectivo)}</strong></span>
              <span className="text-stone-600">Terminal: <strong>{fmt(porTipoPago.terminal)}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de registros */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
          <CardTitle className="text-sm text-stone-600">
            Registros del {nombreHoja}
          </CardTitle>
          <Badge variant="outline">{registros.length} registros</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {registros.length === 0 ? (
            <p className="text-center text-stone-400 py-10 text-sm">Sin registros para este día</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Servicio / Concepto</TableHead>
                    <TableHead className="hidden sm:table-cell">Colaborador</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo Pago</TableHead>
                    <TableHead className="text-right">Ingreso</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Egreso</TableHead>
                    <TableHead className="hidden sm:table-cell">Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((r, i) => (
                    <TableRow key={i} className={r.egreso ? "bg-red-50/40" : ""}>
                      <TableCell className="text-stone-400 text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        {r.servicio || "—"}
                        {/* En mobile mostramos colaborador y pago bajo el nombre */}
                        <span className="sm:hidden block text-xs text-stone-400 mt-0.5">
                          {r.colaborador && <span>{r.colaborador}</span>}
                          {r.colaborador && r.tipoPago && <span> · </span>}
                          {r.tipoPago && <span>{r.tipoPago}</span>}
                          {r.egreso ? <span className="text-red-500"> · Egreso {fmt(r.egreso)}</span> : null}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{r.colaborador || <span className="text-stone-400">—</span>}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {r.tipoPago ? (
                          <Badge variant={r.tipoPago === "Efectivo" ? "secondary" : "outline"} className="text-xs">
                            {r.tipoPago}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-green-700 font-medium">
                        {r.precio ? fmt(r.precio) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium hidden sm:table-cell">
                        {r.egreso ? fmt(r.egreso) : "—"}
                      </TableCell>
                      <TableCell className="text-stone-500 text-sm hidden sm:table-cell">{r.notas || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
