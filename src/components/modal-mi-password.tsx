"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/password-input";

interface Props {
  userName: string;
}

export default function ModalMiPassword({ userName }: Props) {
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() { setActual(""); setNueva(""); setConfirmar(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== confirmar) { toast.error("Las contraseñas no coinciden"); return; }
    if (nueva.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    setLoading(true);
    const res = await fetch("/api/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: userName, passwordActual: actual, passwordNueva: nueva }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Contraseña actualizada correctamente");
      reset(); setOpen(false);
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al actualizar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="w-full justify-start" />}>
        Mi contraseña
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar mi contraseña</DialogTitle>
        </DialogHeader>
        {open && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Contraseña actual</Label>
              <PasswordInput value={actual} onChange={(e) => setActual(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Nueva contraseña</Label>
              <PasswordInput value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nueva contraseña</Label>
              <PasswordInput value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
