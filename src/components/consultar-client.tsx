"use client";

import { useState } from "react";
import { Registro } from "@/lib/sheets";
import TablaRegistros from "@/components/tabla-registros";
import ModalRegistro from "@/components/modal-registro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  userName: string;
  isAdmin: boolean;
}

export default function ConsultarClient({ userName, isAdmin }: Props) {
  const [fecha, setFecha] = useState(""); // formato input: yyyy-MM-dd
  const [registros, setRegistros] = useState<Registro[] | null>(null);
  const [nombreHoja, setNombreHoja] = useState("");
  const [loading, setLoading] = useState(false);
  const [sinHoja, setSinHoja] = useState(false);

  function inputANombreHoja(val: string): string {
    if (!val) return "";
    const [y, m, d] = val.split("-");
    return `${d}/${m}/${y}`;
  }

  async function buscar() {
    if (!fecha) return;
    setLoading(true);
    const hoja = inputANombreHoja(fecha);
    try {
      const res = await fetch(`/api/registros?fecha=${hoja}`);
      const data = await res.json();
      setRegistros(data.registros ?? []);
      setNombreHoja(data.nombreHoja);
      setSinHoja(!!data.sinHoja);
    } catch {
      toast.error("Error al consultar los datos");
    } finally {
      setLoading(false);
    }
  }

  async function recargar() {
    if (!nombreHoja) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/registros?fecha=${nombreHoja}`);
      const data = await res.json();
      setRegistros(data.registros ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Consultar día</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">Selecciona una fecha para ver sus registros</p>
      </div>

      <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-end sm:max-w-sm mx-auto sm:mx-0">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="fecha" className="block text-center sm:text-left">Fecha</Label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full"
          />
        </div>
        <Button className="w-full sm:w-auto" onClick={buscar} disabled={!fecha || loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {registros !== null && (
        <div className="space-y-4">
          {sinHoja ? (
            <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-lg border dark:border-stone-700 text-stone-400 dark:text-stone-500">
              <p className="font-medium dark:text-stone-300">No existe una hoja para {nombreHoja}</p>
              <p className="text-sm mt-1">No se registraron datos ese día</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 justify-end">
                <ModalRegistro tipo="servicio" userName={userName} fecha={nombreHoja} onGuardado={recargar} />
                <ModalRegistro tipo="egreso" userName={userName} fecha={nombreHoja} onGuardado={recargar} />
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_SPREADSHEET_ID}/edit`,
                        "_blank"
                      )
                    }
                  >
                    Ver en Google Sheets ↗
                  </Button>
                )}
              </div>
              <TablaRegistros registros={registros} nombreHoja={nombreHoja} isAdmin={true} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
