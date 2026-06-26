import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CoachApp from "./CoachApp";
import { listClients, listMyRoutines } from "@/app/actions/data";

export default async function CoachPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "entrenador") redirect("/cliente");

  const [roster, initialRoutines] = await Promise.all([
    listClients(),
    listMyRoutines(),
  ]);

  return (
    <CoachApp
      user={{ name: session.user.name ?? "Entrenador", email: session.user.email ?? "" }}
      initialClients={roster.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        goal: c.goal,
        level: c.level,
        age: c.age,
        status: c.status,
        injuries: c.injuries,
      }))}
      initialRoutines={initialRoutines}
    />
  );
}
