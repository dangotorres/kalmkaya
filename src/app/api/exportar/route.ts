import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { obtenerRegistrosDia, listarHojas } from "@/lib/sheets";
import { generarExcel } from "@/lib/excel";

function parsearFecha(str: string): Date {
  const [d, m, y] = str.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d));
}

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

  const todasLasHojas = await listarHojas();

  const hojasEnRango = todasLasHojas.filter((nombre) => {
    const f = parsearFecha(nombre);
    return f >= fechaInicio && f <= fechaFin;
  });

  if (hojasEnRango.length === 0) {
    return NextResponse.json({ error: "No hay hojas en ese rango" }, { status: 404 });
  }

  const dias = await Promise.all(
    hojasEnRango.map(async (nombre) => ({
      nombreHoja: nombre,
      registros: await obtenerRegistrosDia(nombre),
    }))
  );

  const buffer = generarExcel(dias);
  const iniNombre = inicio.replace(/\//g, "-");
  const finNombre = fin.replace(/\//g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Reporte ${iniNombre} al ${finNombre}.xlsx"`,
    },
  });
}
