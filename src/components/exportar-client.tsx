"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ResumenPeriodo, RegistroDetalle, EgresoDetalle } from "@/app/api/resumen/route";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function inputANombreHoja(val: string): string {
  if (!val) return "";
  const [y, m, d] = val.split("-");
  return `${d}/${m}/${y}`;
}

type DetalleModal = { nombre: string; detalle: RegistroDetalle[] } | null;

export default function ExportarClient() {
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [resumen, setResumen] = useState<ResumenPeriodo | null>(null);
  const [detalleModal, setDetalleModal] = useState<DetalleModal>(null);

  const hoy = new Date().toISOString().split("T")[0];

  async function consultar() {
    if (!inicio || !fin) return;
    setLoading(true);
    setResumen(null);
    try {
      const res = await fetch(
        `/api/resumen?inicio=${encodeURIComponent(inputANombreHoja(inicio))}&fin=${encodeURIComponent(inputANombreHoja(fin))}`
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "No se encontraron datos en ese rango");
        return;
      }
      setResumen(await res.json());
    } catch {
      toast.error("Error al consultar el periodo");
    } finally {
      setLoading(false);
    }
  }

  async function exportar() {
    if (!inicio || !fin) return;
    setExportando(true);
    try {
      const res = await fetch(
        `/api/exportar?inicio=${encodeURIComponent(inputANombreHoja(inicio))}&fin=${encodeURIComponent(inputANombreHoja(fin))}`
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Error al exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ini = inicio.split("-").reverse().join("-");
      const f = fin.split("-").reverse().join("-");
      a.download = `Reporte ${ini} al ${f}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Reporte descargado correctamente");
    } catch {
      toast.error("Error inesperado al exportar");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Corte por periodo</h1>
          <p className="text-stone-500 text-sm">
            Consulta el resumen en pantalla o descarga el reporte .xlsx
          </p>
        </div>
        {resumen && (
          <Button
            onClick={exportar}
            disabled={exportando}
            variant="outline"
            className="shrink-0 border-stone-400"
          >
            {exportando ? "Generando..." : "↓ Descargar .xlsx"}
          </Button>
        )}
      </div>

      {/* Selector de fechas */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inicio">Fecha inicio</Label>
              <Input
                id="inicio"
                type="date"
                value={inicio}
                onChange={(e) => { setInicio(e.target.value); setResumen(null); }}
                max={hoy}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin">Fecha fin</Label>
              <Input
                id="fin"
                type="date"
                value={fin}
                onChange={(e) => { setFin(e.target.value); setResumen(null); }}
                max={hoy}
                min={inicio}
                className="w-full"
              />
            </div>
          </div>

          <Button
            onClick={consultar}
            disabled={!inicio || !fin || loading}
            className="w-full"
          >
            {loading ? "Consultando..." : "Ver resumen"}
          </Button>
        </CardContent>
      </Card>

      {/* Resumen en pantalla */}
      {resumen && (
        <div className="space-y-4">

          {/* Totales generales */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Ingresos</p>
                <p className="text-sm sm:text-xl font-bold text-green-800 mt-1">{fmt(resumen.totalIngresos)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Egresos</p>
                <p className="text-sm sm:text-xl font-bold text-red-800 mt-1">{fmt(resumen.totalEgresos)}</p>
              </CardContent>
            </Card>
            <Card className={`${resumen.neto >= 0 ? "border-stone-200 bg-stone-50" : "border-orange-200 bg-orange-50"}`}>
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs text-stone-700 font-medium uppercase tracking-wide">Neto</p>
                <p className={`text-sm sm:text-xl font-bold mt-1 ${resumen.neto >= 0 ? "text-stone-800" : "text-orange-700"}`}>
                  {fmt(resumen.neto)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stats rápidos */}
          <div className="flex flex-wrap gap-4 text-sm text-stone-600 bg-white border rounded-lg px-4 py-3">
            <span>Días con registros: <strong>{resumen.diasConDatos}</strong></span>
            <span>Total registros: <strong>{resumen.totalRegistros}</strong></span>
            <span>Efectivo: <strong>{fmt(resumen.porTipoPago.efectivo)}</strong></span>
            <span>Terminal: <strong>{fmt(resumen.porTipoPago.terminal)}</strong></span>
          </div>

          {/* Desglose por colaborador */}
          {resumen.porColaborador.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-stone-600">Desglose por colaborador</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Servicios</TableHead>
                      <TableHead className="text-right">Efectivo</TableHead>
                      <TableHead className="text-right">Terminal</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.porColaborador.map((c) => (
                      <TableRow key={c.nombre}>
                        <TableCell>
                          <button
                            onClick={() => setDetalleModal({ nombre: c.nombre, detalle: c.detalle })}
                            className="font-medium text-left text-blue-600 underline-offset-2 hover:underline hover:text-blue-800 transition-colors cursor-pointer"
                          >
                            {c.nombre}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">{c.servicios}</TableCell>
                        <TableCell className="text-right">{fmt(c.efectivo)}</TableCell>
                        <TableCell className="text-right">{fmt(c.terminal)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(c.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-stone-50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {resumen.porColaborador.reduce((a, c) => a + c.servicios, 0)}
                      </TableCell>
                      <TableCell className="text-right">{fmt(resumen.porTipoPago.efectivo)}</TableCell>
                      <TableCell className="text-right">{fmt(resumen.porTipoPago.terminal)}</TableCell>
                      <TableCell className="text-right">{fmt(resumen.totalIngresos)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Desglose de egresos */}
          {resumen.egresos.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-stone-600 flex items-center gap-2">
                  Egresos del periodo
                  <span className="ml-auto text-red-600 font-bold">{fmt(resumen.totalEgresos)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.egresos.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-stone-500 text-xs whitespace-nowrap">{e.fecha}</TableCell>
                        <TableCell className="font-medium">{e.concepto}</TableCell>
                        <TableCell className="text-stone-400 text-xs">{e.notas || "—"}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{fmt(e.monto)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-stone-50 font-semibold">
                      <TableCell colSpan={3}>Total egresos</TableCell>
                      <TableCell className="text-right text-red-600">{fmt(resumen.totalEgresos)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

        </div>
      )}
      {/* Dialog de detalle por colaborador */}
      <Dialog
        open={!!detalleModal}
        onOpenChange={(open) => { if (!open) setDetalleModal(null); }}
      >
        <DialogContent className="flex flex-col w-[95vw] max-w-lg max-h-[85vh] rounded-xl p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <DialogTitle>
              Servicios de {detalleModal?.nombre}
            </DialogTitle>
            <p className="text-sm text-stone-500">{resumen?.nombreHoja}</p>
          </DialogHeader>

          {detalleModal && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleModal.detalle.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-stone-500 text-xs whitespace-nowrap">{r.fecha}</TableCell>
                        <TableCell className="font-medium">
                          {r.servicio}
                          {r.notas && (
                            <span className="block text-xs text-stone-400">{r.notas}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.tipoPago === "Efectivo" ? "secondary" : "outline"} className="text-xs">
                            {r.tipoPago}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          {fmt(r.precio)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-t bg-stone-50 rounded-b-xl shrink-0 text-sm">
                <span className="text-stone-500">{detalleModal.detalle.length} servicios</span>
                <span className="font-bold">
                  Total: {fmt(detalleModal.detalle.reduce((a, r) => a + r.precio, 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
