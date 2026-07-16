import * as XLSX from "xlsx";
import { Registro } from "./sheets";

type DiaData = { nombreHoja: string; registros: Registro[] };

export function generarExcel(dias: DiaData[]): Buffer {
  const wb = XLSX.utils.book_new();

  // Hojas diarias
  for (const dia of dias) {
    const rows = dia.registros.map((r) => [
      r.servicio,
      r.colaborador,
      r.tipoPago,
      r.precio ?? "",
      r.egreso ?? "",
      r.notas,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([
      ["Servicio", "Colaborador", "Tipo Pago", "Ingreso", "Egreso", "Notas"],
      ...rows,
    ]);
    XLSX.utils.book_append_sheet(wb, ws, dia.nombreHoja.replace(/\//g, "-"));
  }

  // Hoja RESUMEN
  const colaboradores = ["Karen", "Mike", "Clau"];
  const resumenColabs: Record<string, { servicios: number; efectivo: number; terminal: number; total: number }> = {};
  colaboradores.forEach((c) => {
    resumenColabs[c] = { servicios: 0, efectivo: 0, terminal: 0, total: 0 };
  });

  let totalEgresos = 0;
  const egresosDetalle: [string, string, number][] = [];

  for (const dia of dias) {
    for (const r of dia.registros) {
      if (r.egreso) {
        totalEgresos += r.egreso;
        egresosDetalle.push([r.servicio || "Egreso", r.tipoPago, r.egreso]);
        continue;
      }
      if (r.precio && r.colaborador) {
        const colab = resumenColabs[r.colaborador];
        if (colab) {
          colab.servicios += 1;
          colab.total += r.precio;
          if (r.tipoPago === "Efectivo") colab.efectivo += r.precio;
          else colab.terminal += r.precio;
        }
      }
    }
  }

  const totalIngresos = Object.values(resumenColabs).reduce((a, c) => a + c.total, 0);

  const resumenRows: (string | number)[][] = [
    ["RESUMEN POR COLABORADOR"],
    ["Colaborador", "Servicios", "Efectivo", "Terminal", "Total"],
    ...colaboradores.map((c) => [
      c,
      resumenColabs[c].servicios,
      resumenColabs[c].efectivo,
      resumenColabs[c].terminal,
      resumenColabs[c].total,
    ]),
    ["TOTAL INGRESOS", "", "", "", totalIngresos],
    [],
    ["EGRESOS DEL PERIODO"],
    ["Concepto", "Tipo Pago", "Monto"],
    ...egresosDetalle,
    ["TOTAL EGRESOS", "", totalEgresos],
    [],
    ["RESUMEN FINAL"],
    ["Total ingresos", totalIngresos],
    ["Total egresos", totalEgresos],
    ["NETO DEL PERIODO", totalIngresos - totalEgresos],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, "RESUMEN");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
