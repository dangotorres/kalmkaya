"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/password-input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Colaborador = { nombre: string; rol: string; esquema: string; porcentaje: number | null };

const ROL_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  colaborador: "Colaborador",
};

const ROL_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  supervisor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  colaborador: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-600",
};

interface Props {
  currentUser: string;
}

export default function EquipoClient({ currentUser }: Props) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalPassword, setModalPassword] = useState<string | null>(null);
  const [modalRol, setModalRol] = useState<{ nombre: string; rolActual: string; esquemaActual: string; porcentajeActual: number | null; soloNombre?: boolean } | null>(null);
  const [nuevoRolSeleccionado, setNuevoRolSeleccionado] = useState("");
  const [nuevoEsquemaSeleccionado, setNuevoEsquemaSeleccionado] = useState("comision");
  const [nuevoPorcentajeInput, setNuevoPorcentajeInput] = useState<string>("");
  const [nuevoNombreInput, setNuevoNombreInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form agregar
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("colaborador");
  const [esquema, setEsquema] = useState("comision");
  const [porcentajeNuevo, setPorcentajeNuevo] = useState<string>("");
  const [guardando, setGuardando] = useState(false);

  // Form cambiar contraseña
  const [pwNueva, setPwNueva] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/colaboradores");
    const data = await res.json();
    setColaboradores(data);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre || !password || !rol) return;
    setGuardando(true);
    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        password,
        rol,
        esquema,
        porcentaje: porcentajeNuevo !== "" ? Number(porcentajeNuevo) : null,
      }),
    });
    setGuardando(false);
    if (res.ok) {
      toast.success(`${nombre} agregado correctamente`);
      setNombre(""); setPassword(""); setRol("colaborador"); setEsquema("comision"); setPorcentajeNuevo("");
      setModalAgregar(false);
      cargar();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al agregar");
    }
  }

  async function eliminar(nombre: string) {
    const res = await fetch("/api/colaboradores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (res.ok) {
      toast.success(`${nombre} eliminado`);
      setConfirmDelete(null);
      cargar();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al eliminar");
    }
  }

  async function confirmarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!modalRol) return;
    const nombreTrimmed = nuevoNombreInput.trim();
    const nombreCambio = nombreTrimmed && nombreTrimmed !== modalRol.nombre ? nombreTrimmed : undefined;
    const rolCambio = nuevoRolSeleccionado !== modalRol.rolActual ? nuevoRolSeleccionado : undefined;
    const esquemaCambio = nuevoEsquemaSeleccionado !== modalRol.esquemaActual ? nuevoEsquemaSeleccionado : undefined;
    const pctNum = nuevoPorcentajeInput !== "" ? Number(nuevoPorcentajeInput) : null;
    const pctCambio = pctNum !== modalRol.porcentajeActual;
    if (!nombreCambio && !rolCambio && !esquemaCambio && !pctCambio) {
      toast.info("No hay cambios que guardar");
      setModalRol(null);
      return;
    }
    setGuardando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { nombre: modalRol.nombre };
    if (nombreCambio) payload.nuevoNombre = nombreCambio;
    if (rolCambio) payload.rol = rolCambio;
    if (esquemaCambio) payload.esquema = esquemaCambio;
    if (pctCambio) payload.porcentaje = pctNum;
    const res = await fetch("/api/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setGuardando(false);
    if (res.ok) {
      toast.success("Colaborador actualizado");
      setModalRol(null);
      cargar();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al actualizar");
    }
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwNueva !== pwConfirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (pwNueva.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: modalPassword, passwordNueva: pwNueva }),
    });
    setGuardando(false);
    if (res.ok) {
      toast.success("Contraseña actualizada");
      setPwNueva(""); setPwConfirm("");
      setModalPassword(null);
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al actualizar");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Equipo</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">Administra colaboradores y contraseñas</p>
        </div>
        <Button onClick={() => setModalAgregar(true)}>+ Agregar colaborador</Button>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm text-stone-600 dark:text-stone-400">Colaboradores actuales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8 text-stone-400 dark:text-stone-500 text-sm">Cargando...</p>
          ) : (
            <ul className="divide-y">
              {colaboradores.map((c) => (
                <li key={c.nombre} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-stone-800 dark:text-stone-100">{c.nombre}</span>
                    <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${ROL_COLORS[c.rol] ?? ""}`}>
                      {ROL_LABELS[c.rol] ?? c.rol}
                    </span>
                    <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${c.porcentaje !== null ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800" : c.esquema === "fijo" ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" : "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800"}`}>
                      {c.porcentaje !== null ? `${c.porcentaje}%` : c.esquema === "fijo" ? "Fijo (100%)" : "Comisión (50%)"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      title={c.nombre === currentUser ? "Editar mi nombre" : "Editar colaborador"}
                      onClick={() => {
                        setNuevoRolSeleccionado(c.rol);
                        setNuevoEsquemaSeleccionado(c.esquema ?? "comision");
                        setNuevoPorcentajeInput(c.porcentaje !== null && c.porcentaje !== undefined ? String(c.porcentaje) : "");
                        setNuevoNombreInput(c.nombre);
                        setModalRol({ nombre: c.nombre, rolActual: c.rol, esquemaActual: c.esquema ?? "comision", porcentajeActual: c.porcentaje ?? null, soloNombre: c.nombre === currentUser });
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setPwNueva(""); setPwConfirm(""); setModalPassword(c.nombre); }}
                    >
                      Contraseña
                    </Button>
                    {c.nombre !== currentUser && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                        onClick={() => setConfirmDelete(c.nombre)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Modal: Agregar colaborador */}
      <Dialog open={modalAgregar} onOpenChange={setModalAgregar}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar colaborador</DialogTitle>
          </DialogHeader>
          <form onSubmit={agregar} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Sofía" required />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña inicial</Label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v ?? "colaborador")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Colaborador — solo registrar</SelectItem>
                  <SelectItem value="supervisor">Supervisor — ver reportes</SelectItem>
                  <SelectItem value="admin">Admin — acceso total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Esquema de pago</Label>
              <Select value={esquema} onValueChange={(v) => setEsquema(v ?? "comision")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comision">Comisión — 50% del bruto</SelectItem>
                  <SelectItem value="fijo">Fijo — 100% del bruto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {esquema === "comision" && (
              <div className="space-y-1.5">
                <Label>Porcentaje personalizado <span className="text-stone-400 font-normal">(opcional)</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={porcentajeNuevo}
                    onChange={(e) => setPorcentajeNuevo(e.target.value)}
                    placeholder="Ej: 30"
                    className="w-28"
                  />
                  <span className="text-stone-500 dark:text-stone-400 text-sm">% del bruto — sobreescribe el 50%</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModalAgregar(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={guardando}>{guardando ? "Guardando..." : "Agregar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Cambiar contraseña (admin puede cambiar cualquiera) */}
      <Dialog open={!!modalPassword} onOpenChange={(o) => { if (!o) setModalPassword(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña de {modalPassword}</DialogTitle>
          </DialogHeader>
          {/* Renderizado condicional para evitar form montado cuando el dialog está cerrado */}
          {!!modalPassword && (
            <form onSubmit={cambiarPassword} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nueva contraseña</Label>
                <PasswordInput value={pwNueva} onChange={(e) => setPwNueva(e.target.value)} placeholder="Mínimo 6 caracteres" required />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar contraseña</Label>
                <PasswordInput value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Repite la contraseña" required />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModalPassword(null)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Editar colaborador (nombre + rol) */}
      <Dialog open={!!modalRol} onOpenChange={(o) => { if (!o) setModalRol(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar colaborador</DialogTitle>
          </DialogHeader>
          {!!modalRol && (
            <form onSubmit={confirmarEdicion} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  value={nuevoNombreInput}
                  onChange={(e) => setNuevoNombreInput(e.target.value)}
                  placeholder="Nombre del colaborador"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className={modalRol?.soloNombre ? "text-stone-400" : ""}>Rol</Label>
                <Select
                  value={nuevoRolSeleccionado}
                  onValueChange={(v) => !modalRol?.soloNombre && setNuevoRolSeleccionado(v ?? nuevoRolSeleccionado)}
                  disabled={!!modalRol?.soloNombre}
                >
                  <SelectTrigger disabled={!!modalRol?.soloNombre} className={modalRol?.soloNombre ? "opacity-50 cursor-not-allowed" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaborador — solo registrar</SelectItem>
                    <SelectItem value="supervisor">Supervisor — ver reportes</SelectItem>
                    <SelectItem value="admin">Admin — acceso total</SelectItem>
                  </SelectContent>
                </Select>
                {modalRol?.soloNombre && (
                  <p className="text-xs text-stone-400">No puedes cambiar tu propio rol</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Esquema de pago</Label>
                  <Select value={nuevoEsquemaSeleccionado} onValueChange={(v) => {
                    setNuevoEsquemaSeleccionado(v ?? "comision");
                    setNuevoPorcentajeInput(""); // limpiar porcentaje al cambiar esquema
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comision">Comisión — 50% del bruto</SelectItem>
                      <SelectItem value="fijo">Fijo — 100% del bruto</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              {nuevoEsquemaSeleccionado === "comision" && (
                <div className="space-y-1.5">
                  <Label>Porcentaje personalizado <span className="text-stone-400 font-normal">(opcional)</span></Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={nuevoPorcentajeInput}
                      onChange={(e) => setNuevoPorcentajeInput(e.target.value)}
                      placeholder="Ej: 30"
                      className="w-28"
                    />
                    <span className="text-stone-500 dark:text-stone-400 text-sm">% — sobreescribe el 50%</span>
                  </div>
                  {nuevoPorcentajeInput === "" && (
                    <p className="text-xs text-stone-400 dark:text-stone-500">Dejar vacío para usar el 50% por defecto</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModalRol(null)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar eliminar */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar a {confirmDelete}?</DialogTitle>
          </DialogHeader>
          {!!confirmDelete && (
            <>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">Esta acción no se puede deshacer. El colaborador ya no podrá acceder a la app.</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => confirmDelete && eliminar(confirmDelete)}>
                  Eliminar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
