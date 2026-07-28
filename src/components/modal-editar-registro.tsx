"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Registro } from "@/lib/sheets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  registro: Registro | null;
  nombreHoja: string;
  onClose: () => void;
  onGuardado: () => void;
}

function toRaw(val: string): string {
  const stripped = val.replace(/[^0-9.]/g, "");
  const parts = stripped.split(".");
  return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : stripped;
}

function toNumber(raw: string): number | null {
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function formatLive(raw: string): string {
  if (!raw) return "";
  const [intStr, ...decParts] = raw.split(".");
  const intNum = parseInt(intStr || "0", 10);
  const formattedInt = isNaN(intNum) ? "" : intNum.toLocaleString("es-MX");
  const dec = decParts.length > 0 ? "." + decParts[0].slice(0, 2) : "";
  return formattedInt + dec;
}

function formatBlur(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n) || !raw) return "";
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function ModalEditarRegistro({ registro, nombreHoja, onClose, onGuardado }: Props) {
  const esEgreso = !!registro?.egreso;

  const [servicio, setServicio] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [tipoPago, setTipoPago] = useState("Efectivo");
  const [precioDisplay, setPrecioDisplay] = useState("");
  const [precioRaw, setPrecioRaw] = useState("");
  const [notas, setNotas] = useState("");
  const [nombres, setNombres] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  // Pre-cargar datos del registro al abrir
  useEffect(() => {
    if (!registro) return;
    setServicio(registro.servicio);
    setColaborador(registro.colaborador);
    setTipoPago(registro.tipoPago || "Efectivo");
    setNotas(registro.notas || "");
    setConfirmandoEliminar(false);
    const valorNum = registro.egreso ?? registro.precio ?? null;
    if (valorNum !== null) {
      const raw = String(valorNum);
      setPrecioRaw(raw);
      setPrecioDisplay(formatBlur(raw));
    } else {
      setPrecioRaw("");
      setPrecioDisplay("");
    }
  }, [registro]);

  // Cargar nombres de colaboradores
  useEffect(() => {
    fetch("/api/colaboradores?nombres=1")
      .then((r) => r.json())
      .then(setNombres)
      .catch(() => setNombres([]));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!registro) return;
    const valor = toNumber(precioRaw);
    if (!valor || valor <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    setGuardando(true);
    const body = {
      fecha: nombreHoja,
      fila: registro.fila,
      servicio,
      colaborador,
      tipoPago,
      precio: esEgreso ? null : valor,
      egreso: esEgreso ? valor : null,
      notas,
    };
    const res = await fetch("/api/registros", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setGuardando(false);
    if (res.ok) {
      toast.success("Registro actualizado");
      onGuardado();
      onClose();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al actualizar");
    }
  }

  async function eliminar() {
    if (!registro) return;
    setGuardando(true);
    const res = await fetch("/api/registros", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: nombreHoja, fila: registro.fila }),
    });
    setGuardando(false);
    if (res.ok) {
      toast.success("Registro eliminado");
      onGuardado();
      onClose();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al eliminar");
    }
  }

  if (!registro) return null;

  return (
    <Dialog open={!!registro} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{esEgreso ? "Editar egreso" : "Editar servicio"}</DialogTitle>
        </DialogHeader>

        {confirmandoEliminar ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              ¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmandoEliminar(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={eliminar} disabled={guardando}>
                {guardando ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>{esEgreso ? "Concepto" : "Servicio"}</Label>
              <Input value={servicio} onChange={(e) => setServicio(e.target.value)} required />
            </div>

            {!esEgreso && (
              <div className="space-y-1.5">
                <Label>Colaborador</Label>
                <Select value={colaborador} onValueChange={(v) => setColaborador(v ?? colaborador)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {nombres.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {esEgreso && (
              <div className="space-y-1.5">
                <Label>Colaborador</Label>
                <Select value={colaborador} onValueChange={(v) => setColaborador(v ?? colaborador)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salón">Salón</SelectItem>
                    {nombres.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Tipo de pago</Label>
              <Select value={tipoPago} onValueChange={(v) => setTipoPago(v ?? tipoPago)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Terminal">Terminal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{esEgreso ? "Monto" : "Precio"}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="pl-7"
                  value={precioDisplay}
                  onChange={(e) => {
                    const raw = toRaw(e.target.value);
                    setPrecioRaw(raw);
                    setPrecioDisplay(formatLive(raw));
                  }}
                  onBlur={() => setPrecioDisplay(formatBlur(precioRaw))}
                  onFocus={() => setPrecioDisplay(formatLive(precioRaw))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas <span className="text-stone-400 font-normal">(opcional)</span></Label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: cliente frecuente" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => setConfirmandoEliminar(true)}
              >
                Eliminar
              </Button>
              <div className="flex gap-2 flex-1">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
