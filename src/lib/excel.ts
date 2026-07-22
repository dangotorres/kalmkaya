import * as XLSX from "xlsx";
import { Registro, Colaborador } from "./sheets";

type DiaData = { nombreHoja: string; registros: Registro[] };

export function generarExcel(dias: DiaData[], colaboradoresData: Colaborador[]): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Hojas diarias ──────────────────────────────────────────────────────────
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

  // ── Hoja RESUMEN ───────────────────────────────────────────────────────────
  type ColabResumen = {
    servicios: number;
    efectivo: number;
    terminal: number;
    bruto: number;
    egresosColab: number;
    esquema: string;
    porcentaje: number | null;
  };

  const resumenColabs: Record<string, ColabResumen> = {};
  colaboradoresData.forEach((c) => {
    resumenColabs[c.nombre] = {
      servicios: 0,
      efectivo: 0,
      terminal: 0,
      bruto: 0,
      egresosColab: 0,
      esquema: c.esquema ?? "comision",
      porcentaje: c.porcentaje ?? null,
    };
  });

  let totalEgresos = 0;
  const egresosDetalle: [string, string, string, number][] = [];

  for (const dia of dias) {
    for (const r of dia.registros) {
      if (r.egreso) {
        totalEgresos += r.egreso;
        const egresoColab = r.colaborador || "Salón";
        egresosDetalle.push([dia.nombreHoja, egresoColab, r.servicio || "Egreso", r.egreso]);
        // Acumular egreso al colaborador si corresponde
        if (r.colaborador && resumenColabs[r.colaborador]) {
          resumenColabs[r.colaborador].egresosColab += r.egreso;
        }
        continue;
      }
      if (r.precio && r.colaborador) {
        const colab = resumenColabs[r.colaborador];
        if (colab) {
          colab.servicios += 1;
          colab.bruto += r.precio;
          if (r.tipoPago === "Efectivo") colab.efectivo += r.precio;
          else colab.terminal += r.precio;
        }
      }
    }
  }

  const totalIngresos = Object.values(resumenColabs).reduce((a, c) => a + c.bruto, 0);

  // Calcular sub total y neto por colaborador usando esquema/porcentaje
  const colaboradoresConServicio = colaboradoresData.filter(
    (c) => resumenColabs[c.nombre]?.servicios > 0
  );

  const colabRows = colaboradoresConServicio.map((c) => {
    const d = resumenColabs[c.nombre];
    const pct = d.porcentaje !== null ? d.porcentaje / 100 : d.esquema === "fijo" ? 1 : 0.5;
    const subTotal = d.bruto * pct;
    const neto = subTotal - d.egresosColab;
    return [c.nombre, d.servicios, d.efectivo, d.terminal, d.bruto, subTotal, d.egresosColab, neto];
  });

  const totalBruto = colaboradoresConServicio.reduce((a, c) => a + resumenColabs[c.nombre].bruto, 0);
  const totalSubTotal = colaboradoresConServicio.reduce((a, c) => {
    const d = resumenColabs[c.nombre];
    const pct = d.porcentaje !== null ? d.porcentaje / 100 : d.esquema === "fijo" ? 1 : 0.5;
    return a + d.bruto * pct;
  }, 0);
  const totalEgresosColab = colaboradoresConServicio.reduce((a, c) => a + resumenColabs[c.nombre].egresosColab, 0);
  const totalNetoColabs = totalSubTotal - totalEgresosColab;
  const netoSalon = totalIngresos - totalNetoColabs - totalEgresos;

  const resumenRows: (string | number)[][] = [
    ["RESUMEN POR COLABORADOR"],
    ["Colaborador", "Servicios", "Efectivo", "Terminal", "Bruto", "Sub Total", "Egresos", "Neto"],
    ...colabRows,
    ["TOTAL", "", "", "", totalBruto, totalSubTotal, totalEgresosColab, totalNetoColabs],
    [],
    ["EGRESOS DEL PERIODO"],
    ["Fecha", "Colaborador", "Concepto", "Monto"],
    ...egresosDetalle,
    ["TOTAL EGRESOS", "", "", totalEgresos],
    [],
    ["RESUMEN FINAL"],
    ["Total ingresos", totalIngresos],
    ["Neto colaboradores", totalNetoColabs],
    ["Total egresos", totalEgresos],
    ["NETO SALÓN", netoSalon],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, "RESUMEN");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
