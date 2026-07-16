import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EquipoClient from "@/components/equipo-client";

export default async function EquipoPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/dashboard");
  return <EquipoClient currentUser={session.user.name ?? ""} />;
}
