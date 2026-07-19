import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { obtenerRegistrosDia, listarHojas, obtenerColaboradores } from "@/lib/sheets";

function parsearFecha(str: string): Date {
  const [d, m, y] = str.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export type RegistroDetalle = {
  fecha: string;
  servicio: string;
  tipoPago: string;
  precio: number;
  notas: string;
};

export type EgresoDetalle = {
  fecha: string;
  colaborador: string;
  concepto: string;
  monto: number;
  notas: string;
};

export type ResumenPeriodo = {
  nombreHoja: string;
  totalIngresos: number;
  totalEgresos: number;
  neto: number;
  porColaborador: {
    nombre: string;
    servicios: number;
    efectivo: number;
    terminal: number;
    egresos: number;
    total: number;
    detalle: RegistroDetalle[];
  }[];
  egresos: EgresoDetalle[];
  porTipoPago: { efectivo: number; terminal: number };
  diasConDatos: number;
  totalRegistros: number;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || (role !== "admin" && role !== "supervisor")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const inicio = req.nextUrl.searchParams.get("inicio");
  const fin = req.nextUrl.searchParams.get("fin");

  if (!inicio || !fin) {
    return NextResponse.json({ error: "Faltan fechas" }, { status: 400 });
  }

  const fechaInicio = parsearFecha(inicio);
  const fechaFin = parsearFecha(fin);

  const [todasLasHojas, colaboradoresData] = await Promise.all([
    listarHojas(),
    obtenerColaboradores(),
  ]);

  const COLABORADORES = colaboradoresData.map((c) => c.nombre);

  const hojasEnRango = todasLasHojas.filter((nombre) => {
    const f = parsearFecha(nombre);
    return f >= fechaInicio && f <= fechaFin;
  });

  if (hojasEnRango.length === 0) {
    return NextResponse.json({ error: "No hay hojas en ese rango" }, { status: 404 });
  }

  const colabs: Record<string, {
    servicios: number;
    efectivo: number;
    terminal: number;
    egresos: number;
    total: number;
    detalle: RegistroDetalle[];
  }> = {};
  COLABORADORES.forEach((c) => {
    colabs[c] = { servicios: 0, efectivo: 0, terminal: 0, egresos: 0, total: 0, detalle: [] };
  });

  let totalIngresos = 0;
  let totalEgresos = 0;
  let totalRegistros = 0;
  let efectivoGlobal = 0;
  let terminalGlobal = 0;
  const egresosList: EgresoDetalle[] = [];

  for (const hoja of hojasEnRango) {
    try {
      const registros = await obtenerRegistrosDia(hoja);
      totalRegistros += registros.length;

      for (const r of registros) {
        if (r.egreso) {
          totalEgresos += r.egreso;
          const egresoColab = r.colaborador || "Salón";
          egresosList.push({
            fecha: hoja,
            colaborador: egresoColab,
            concepto: r.servicio || "Sin concepto",
            monto: r.egreso,
            notas: r.notas ?? "",
          });
          if (r.colaborador && colabs[r.colaborador]) {
            colabs[r.colaborador].egresos += r.egreso;
          } else {
            // Egreso del salón (sin colaborador o con "Salón")
            if (!colabs["Salón"]) {
              colabs["Salón"] = { servicios: 0, efectivo: 0, terminal: 0, egresos: 0, total: 0, detalle: [] };
            }
            colabs["Salón"].egresos += r.egreso;
          }
          continue;
        }
        if (r.precio && r.colaborador) {
          totalIngresos += r.precio;
          if (r.tipoPago === "Efectivo") efectivoGlobal += r.precio;
          else terminalGlobal += r.precio;

          const colab = colabs[r.colaborador];
          if (colab) {
            colab.servicios += 1;
            colab.total += r.precio;
            if (r.tipoPago === "Efectivo") colab.efectivo += r.precio;
            else colab.terminal += r.precio;
            colab.detalle.push({
              fecha: hoja,
              servicio: r.servicio,
              tipoPago: r.tipoPago,
              precio: r.precio,
              notas: r.notas,
            });
          }
        }
      }
    } catch {
      // Hoja sin datos, se omite
    }
  }

  const resumen: ResumenPeriodo = {
    nombreHoja: `${inicio} al ${fin}`,
    totalIngresos,
    totalEgresos,
    neto: totalIngresos - totalEgresos,
    porColaborador: COLABORADORES.map((nombre) => ({ nombre, ...colabs[nombre] })).filter((c) => c.servicios > 0),
    egresos: egresosList,
    porTipoPago: { efectivo: efectivoGlobal, terminal: terminalGlobal },
    diasConDatos: hojasEnRango.length,
    totalRegistros,
  };

  return NextResponse.json(resumen);
}
