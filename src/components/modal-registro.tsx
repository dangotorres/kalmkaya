"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  tipo: "servicio" | "egreso";
  userName: string;
  fecha?: string;
  onGuardado: () => void;
}

function toRaw(val: string): string {
  // Extrae solo dígitos y un punto decimal
  const stripped = val.replace(/[^0-9.]/g, "");
  const parts = stripped.split(".");
  return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : stripped;
}

function toNumber(raw: string): number | null {
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function formatLive(raw: string): string {
  // Formatea mientras escribe: comas de miles, sin símbolo
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

function useCurrencyInput() {
  const [raw, setRaw] = useState("");       // dígitos puros para cálculos
  const [display, setDisplay] = useState(""); // lo que ve el usuario en el input
  const [focused, setFocused] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = toRaw(e.target.value);
    setRaw(cleaned);
    setDisplay(formatLive(cleaned));
  }

  function handleBlur() {
    setFocused(false);
    setDisplay(formatBlur(raw));
  }

  function handleFocus() {
    setFocused(true);
    setDisplay(raw); // muestra número puro para editar sin interferencia
  }

  function reset() {
    setRaw("");
    setDisplay("");
  }

  return {
    display,
    focused,
    rawValue: toNumber(raw),
    handleChange,
    handleBlur,
    handleFocus,
    reset,
  };
}

export default function ModalRegistro({ tipo, userName, fecha, onGuardado }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombresColabs, setNombresColabs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/colaboradores?nombres=1")
      .then((r) => r.json())
      .then(setNombresColabs)
      .catch(() => setNombresColabs(["Karen", "Mike", "Clau"]));
  }, []);

  const [servicio, setServicio] = useState("");
  const [colaborador, setColaborador] = useState(userName);
  const [tipoPago, setTipoPago] = useState("Efectivo");
  const [notas, setNotas] = useState("");
  const [egresoSalon, setEgresoSalon] = useState(false);

  const precioInput = useCurrencyInput();
  const egresoInput = useCurrencyInput();
  const efectivoInput = useCurrencyInput();
  const terminalInput = useCurrencyInput();

  function reset() {
    setServicio("");
    setColaborador(userName);
    setTipoPago("Efectivo");
    setNotas("");
    setEgresoSalon(false);
    precioInput.reset();
    egresoInput.reset();
    efectivoInput.reset();
    terminalInput.reset();
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!servicio.trim()) {
      toast.error("El campo Servicio / Concepto es obligatorio");
      return;
    }

    const esCombinado = tipoPago === "Combinado";

    if (tipo === "servicio") {
      if (esCombinado) {
        if (!efectivoInput.rawValue || efectivoInput.rawValue <= 0) {
          toast.error("El monto en Efectivo debe ser mayor a $0");
          return;
        }
        if (!terminalInput.rawValue || terminalInput.rawValue <= 0) {
          toast.error("El monto en Terminal debe ser mayor a $0");
          return;
        }
      } else {
        if (!precioInput.rawValue || precioInput.rawValue <= 0) {
          toast.error("El precio debe ser mayor a $0");
          return;
        }
      }
    } else {
      if (!egresoInput.rawValue || egresoInput.rawValue <= 0) {
        toast.error("El monto del egreso debe ser mayor a $0");
        return;
      }
    }

    setLoading(true);

    const baseBody = {
      servicio,
      colaborador,
      notas,
      ...(fecha ? { fecha } : {}),
    };

    if (esCombinado && tipo === "servicio") {
      // Dos registros secuenciales para evitar conflicto al crear la hoja del día
      const res1 = await fetch("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, tipoPago: "Efectivo", precio: efectivoInput.rawValue }),
      });
      if (!res1.ok) {
        setLoading(false);
        toast.error("Error al guardar el registro de Efectivo");
        return;
      }
      const res2 = await fetch("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, tipoPago: "Terminal", precio: terminalInput.rawValue }),
      });
      setLoading(false);
      if (res2.ok) {
        toast.success("Registro combinado guardado correctamente");
        reset();
        setOpen(false);
        onGuardado();
      } else {
        toast.error("Error al guardar el registro de Terminal");
      }
      return;
    }

    const body: Record<string, unknown> = { ...baseBody, tipoPago };
    if (tipo === "egreso") {
      body.salidasEgresos = egresoInput.rawValue;
    } else {
      body.precio = precioInput.rawValue;
    }

    const res = await fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.ok) {
      toast.success("Registro guardado correctamente");
      reset();
      setOpen(false);
      onGuardado();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al guardar");
    }
  }

  const esEgreso = tipo === "egreso";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={esEgreso ? "outline" : "default"}
            className={esEgreso ? "border-red-300 text-red-700 hover:bg-red-50" : ""}
          />
        }
      >
        {esEgreso ? "＋ Registrar egreso" : "＋ Registrar servicio"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esEgreso ? "Registrar Egreso" : "Registrar Servicio"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleGuardar} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="servicio">{esEgreso ? "Concepto del egreso" : "Servicio"} *</Label>
            <Input
              id="servicio"
              value={servicio}
              onChange={(e) => setServicio(e.target.value)}
              placeholder={esEgreso ? "Ej: Insumos, Renta, etc." : "Ej: Corte, Tinte, etc."}
              required
            />
          </div>

          {esEgreso && (
            <div className="flex items-center gap-2">
              <input
                id="egresoSalon"
                type="checkbox"
                checked={egresoSalon}
                onChange={(e) => {
                  setEgresoSalon(e.target.checked);
                  if (e.target.checked) setColaborador("Salón");
                  else setColaborador(userName);
                }}
                className="h-4 w-4 rounded border-stone-300 accent-stone-700 cursor-pointer"
              />
              <Label htmlFor="egresoSalon" className="cursor-pointer font-normal">
                Egreso del salón
              </Label>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="colaborador">Colaborador</Label>
            <Select
              value={egresoSalon ? "Salón" : colaborador}
              onValueChange={(v) => setColaborador(v ?? "")}
              disabled={egresoSalon}
            >
              <SelectTrigger id="colaborador" className={egresoSalon ? "opacity-50 cursor-not-allowed" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {egresoSalon
                  ? <SelectItem value="Salón">Salón</SelectItem>
                  : nombresColabs.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipoPago">Tipo de pago</Label>
            <Select value={tipoPago} onValueChange={(v) => { setTipoPago(v ?? "Efectivo"); precioInput.reset(); efectivoInput.reset(); terminalInput.reset(); }}>
              <SelectTrigger id="tipoPago">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Terminal">Terminal</SelectItem>
                {!esEgreso && <SelectItem value="Combinado">Combinado (Efectivo + Terminal)</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {esEgreso ? (
            <div className="space-y-1.5">
              <Label htmlFor="egreso">Monto (MXN)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none pointer-events-none">$</span>
                <Input
                  id="egreso"
                  type="text"
                  inputMode="decimal"
                  className="pl-7"
                  value={egresoInput.display}
                  onChange={egresoInput.handleChange}
                  onBlur={egresoInput.handleBlur}
                  onFocus={egresoInput.handleFocus}
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : tipoPago === "Combinado" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="efectivoComb">Efectivo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none pointer-events-none">$</span>
                  <Input
                    id="efectivoComb"
                    type="text"
                    inputMode="decimal"
                    className="pl-7"
                    value={efectivoInput.display}
                    onChange={efectivoInput.handleChange}
                    onBlur={efectivoInput.handleBlur}
                    onFocus={efectivoInput.handleFocus}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="terminalComb">Terminal</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none pointer-events-none">$</span>
                  <Input
                    id="terminalComb"
                    type="text"
                    inputMode="decimal"
                    className="pl-7"
                    value={terminalInput.display}
                    onChange={terminalInput.handleChange}
                    onBlur={terminalInput.handleBlur}
                    onFocus={terminalInput.handleFocus}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {(efectivoInput.rawValue ?? 0) > 0 && (terminalInput.rawValue ?? 0) > 0 && (
                <p className="col-span-2 text-sm text-stone-500 text-right">
                  Total: <strong className="text-stone-800">${((efectivoInput.rawValue ?? 0) + (terminalInput.rawValue ?? 0)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="precio">Precio (MXN)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none pointer-events-none">$</span>
                <Input
                  id="precio"
                  type="text"
                  inputMode="decimal"
                  className="pl-7"
                  value={precioInput.display}
                  onChange={precioInput.handleChange}
                  onBlur={precioInput.handleBlur}
                  onFocus={precioInput.handleFocus}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Input
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
