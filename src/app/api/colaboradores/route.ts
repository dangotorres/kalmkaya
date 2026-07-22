import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import {
  obtenerColaboradores,
  agregarColaborador,
  eliminarColaborador,
  actualizarPasswordColaborador,
  actualizarRolColaborador,
  actualizarEsquemaColaborador,
  renombrarColaborador,
  Colaborador,
} from "@/lib/sheets";

// Nombres por defecto cuando la hoja COLABORADORES aún está vacía
const NOMBRES_FALLBACK = ["Karen", "Mike", "Clau"];

// GET — lista de colaboradores (admin) o solo nombres (público para login)
export async function GET(req: NextRequest) {
  const soloNombres = req.nextUrl.searchParams.get("nombres") === "1";

  if (soloNombres) {
    // Endpoint público — solo devuelve nombres para el dropdown del login
    // Si la hoja está vacía (primera vez), devuelve los nombres por defecto
    // para que el usuario pueda logearse y disparar el sembrado
    const colaboradores = await obtenerColaboradores();
    const nombres = colaboradores.length > 0
      ? colaboradores.map((c) => c.nombre)
      : NOMBRES_FALLBACK;
    return NextResponse.json(nombres);
  }

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const colaboradores = await obtenerColaboradores();
  return NextResponse.json(
    colaboradores.map((c) => ({ nombre: c.nombre, rol: c.rol, esquema: c.esquema ?? "comision" }))
  );
}

// POST — agregar colaborador (admin)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { nombre, password, rol, esquema } = await req.json();
  if (!nombre || !password || !rol) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const existentes = await obtenerColaboradores();
  if (existentes.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
    return NextResponse.json({ error: "Ya existe un colaborador con ese nombre" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await agregarColaborador({ nombre, passwordHash, rol, esquema: esquema ?? "comision" } as Colaborador);
  return NextResponse.json({ ok: true });
}

// DELETE — eliminar colaborador (admin, no puede eliminarse a sí mismo)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { nombre } = await req.json();
  if (!nombre) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });

  if (nombre === session.user.name) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  await eliminarColaborador(nombre);
  return NextResponse.json({ ok: true });
}

// PATCH — cambiar contraseña o rol
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, passwordActual, passwordNueva } = body;
  const rol: string | undefined = typeof body.rol === "string" && body.rol ? body.rol : undefined;

  // Edición de colaborador (nombre, rol y/o esquema) — solo admin
  if ("rol" in body || "nuevoNombre" in body || "esquema" in body) {
    if (!nombre) {
      return NextResponse.json({ error: "Falta el nombre del colaborador" }, { status: 400 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const nuevoNombre: string | undefined =
      typeof body.nuevoNombre === "string" && body.nuevoNombre.trim()
        ? body.nuevoNombre.trim()
        : undefined;

    // Cambio de nombre
    if (nuevoNombre && nuevoNombre !== nombre) {
      const existentes = await obtenerColaboradores();
      if (existentes.find((c) => c.nombre.toLowerCase() === nuevoNombre.toLowerCase() && c.nombre !== nombre)) {
        return NextResponse.json({ error: "Ya existe un colaborador con ese nombre" }, { status: 409 });
      }
      await renombrarColaborador(nombre, nuevoNombre);
    }

    // Cambio de rol
    if ("rol" in body) {
      if (!rol) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }
      const nombreFinal = nuevoNombre ?? nombre;
      if (nombre === session.user.name && rol !== "admin") {
        return NextResponse.json({ error: "No puedes quitarte el rol de admin" }, { status: 400 });
      }
      await actualizarRolColaborador(nombreFinal, rol);
    }

    // Cambio de esquema
    if ("esquema" in body) {
      const esquema = body.esquema;
      if (esquema !== "comision" && esquema !== "fijo") {
        return NextResponse.json({ error: "Esquema inválido" }, { status: 400 });
      }
      const nombreFinal = nuevoNombre ?? nombre;
      await actualizarEsquemaColaborador(nombreFinal, esquema);
    }

    return NextResponse.json({ ok: true });
  }

  // Cambio de contraseña
  if (!nombre || !passwordNueva) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const esAdmin = session.user.role === "admin";
  const esPropioUsuario = session.user.name === nombre;

  if (!esAdmin && !esPropioUsuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Si no es admin, debe verificar su contraseña actual
  if (!esAdmin) {
    const colaboradores = await import("@/lib/sheets").then((m) => m.obtenerColaboradores());
    const user = colaboradores.find((c) => c.nombre === nombre);
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    const valid = await bcrypt.compare(passwordActual ?? "", user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(passwordNueva, 10);
  await actualizarPasswordColaborador(nombre, newHash);
  return NextResponse.json({ ok: true });
}
