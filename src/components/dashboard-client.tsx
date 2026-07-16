"use client";

import { useState, useCallback } from "react";
import { Registro } from "@/lib/sheets";
import TablaRegistros from "@/components/tabla-registros";
import ModalRegistro from "@/components/modal-registro";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  initialRegistros: Registro[];
  nombreHoja: string;
  isAdmin: boolean;
  canViewReports: boolean;
  userName: string;
  sinHoja: boolean;
}

export default function DashboardClient({
  initialRegistros,
  nombreHoja,
  isAdmin,
  canViewReports,
  userName,
  sinHoja: initialSinHoja,
}: Props) {
  const [registros, setRegistros] = useState<Registro[]>(initialRegistros);
  const [sinHoja, setSinHoja] = useState(initialSinHoja);
  const [reloading, setReloading] = useState(false);

  const recargar = useCallback(async () => {
    setReloading(true);
    try {
      const res = await fetch(`/api/registros?fecha=${nombreHoja}`);
      const data = await res.json();
      setRegistros(data.registros ?? []);
      setSinHoja(!!data.sinHoja);
    } catch {
      toast.error("Error al recargar los datos");
    } finally {
      setReloading(false);
    }
  }, [nombreHoja]);

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_SPREADSHEET_ID}/edit`;

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Dashboard del día</h1>
          <p className="text-stone-500 text-sm">{nombreHoja}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {sinHoja && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              La hoja de hoy se creará al registrar el primer servicio
            </span>
          )}
          <ModalRegistro tipo="servicio" userName={userName} onGuardado={recargar} />
          <ModalRegistro tipo="egreso" userName={userName} onGuardado={recargar} />
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
      </div>

      {/* Tabla */}
      {reloading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Cargando...</div>
      ) : (
        <TablaRegistros registros={registros} nombreHoja={nombreHoja} isAdmin={canViewReports} />
      )}
    </div>
  );
}
