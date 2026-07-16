"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ModalMiPassword from "@/components/modal-mi-password";

interface NavbarProps {
  user: { name?: string | null; role?: string };
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user.role === "admin";
  const canViewReports = user.role === "admin" || user.role === "supervisor";

  const links = [
    { href: "/dashboard", label: "Hoy" },
    ...(canViewReports
      ? [
          { href: "/dashboard/consultar", label: "Consultar" },
          { href: "/dashboard/exportar", label: "Exportar" },
        ]
      : []),
    ...(isAdmin ? [{ href: "/dashboard/equipo", label: "Equipo" }] : []),
  ];

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <img
          src="https://i.ibb.co/xqSkpx8M/KK.png"
          alt="KalmKaya"
          className="w-8 h-8 object-contain"
        />
        <span className="font-bold text-stone-800 text-lg hidden sm:block">KalmKaya</span>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <nav className="flex gap-1 flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={pathname === link.href ? "default" : "ghost"}
                size="sm"
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-stone-700 hover:text-stone-900 transition-colors"
          >
            <span className="hidden sm:block font-medium">{user.name}</span>
            {isAdmin && (
              <Badge variant="secondary" className="hidden sm:flex">Admin</Badge>
            )}
            <span className="text-stone-400">▾</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-40">
                <div className="px-3 py-2 text-xs text-stone-400 border-b">{user.name}</div>
                <div className="py-1 px-1">
                  <ModalMiPassword userName={user.name ?? ""} />
                </div>
                <div className="border-t py-1 px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
