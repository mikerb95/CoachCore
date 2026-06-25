import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CoachApp from "./CoachApp";

export default async function CoachPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "entrenador") redirect("/cliente");

  return <CoachApp user={{ name: session.user.name ?? "Entrenador", email: session.user.email ?? "" }} />;
}
