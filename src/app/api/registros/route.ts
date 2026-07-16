import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  obtenerRegistrosDia,
  insertarRegistro,
  crearHojaDelDia,
  fechaANombreHoja,
} from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fecha = req.nextUrl.searchParams.get("fecha");
  const nombreHoja = fecha ?? fechaANombreHoja(new Date());

  try {
    const registros = await obtenerRegistrosDia(nombreHoja);
    return NextResponse.json({ registros, nombreHoja });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al leer la hoja";
    if (msg.includes("Unable to parse range") || msg.includes("not found")) {
      return NextResponse.json({ registros: [], nombreHoja, sinHoja: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { servicio, colaborador, tipoPago, precio, salidasEgresos, notas, fecha } = body;

  if (!servicio) {
    return NextResponse.json({ error: "El campo Servicio es obligatorio" }, { status: 400 });
  }

  const nombreHoja = fecha ?? fechaANombreHoja(new Date());

  try {
    await crearHojaDelDia(nombreHoja);
    await insertarRegistro(nombreHoja, {
      servicio,
      colaborador,
      tipoPago,
      precio,
      salidasEgresos,
      notas,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al guardar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
