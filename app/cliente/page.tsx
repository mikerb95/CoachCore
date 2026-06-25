import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ClientApp from "./ClientApp";

export default async function ClientePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "cliente") redirect("/coach");

  return <ClientApp user={{ name: session.user.name ?? "Cliente", email: session.user.email ?? "" }} />;
}
