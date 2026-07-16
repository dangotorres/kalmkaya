import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ConsultarClient from "@/components/consultar-client";

export default async function ConsultarPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "supervisor") redirect("/dashboard");

  return <ConsultarClient userName={session?.user?.name ?? ""} isAdmin={role === "admin"} />;
}
