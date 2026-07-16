import { auth } from "@/lib/auth";
import { obtenerRegistrosDia, fechaANombreHoja, Registro } from "@/lib/sheets";
import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const nombreHoja = fechaANombreHoja(new Date());
  const role = session?.user?.role;
  const isAdmin = role === "admin";
  const canViewReports = role === "admin" || role === "supervisor";

  let registros: Registro[] = [];
  let sinHoja = false;
  try {
    registros = await obtenerRegistrosDia(nombreHoja);
  } catch {
    sinHoja = true;
  }

  return (
    <DashboardClient
      initialRegistros={registros}
      nombreHoja={nombreHoja}
      isAdmin={isAdmin}
      canViewReports={canViewReports}
      userName={session?.user?.name ?? ""}
      sinHoja={sinHoja}
    />
  );
}
