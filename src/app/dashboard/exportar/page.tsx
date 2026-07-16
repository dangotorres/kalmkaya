import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExportarClient from "@/components/exportar-client";

export default async function ExportarPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "supervisor") redirect("/dashboard");
  return <ExportarClient />;
}
