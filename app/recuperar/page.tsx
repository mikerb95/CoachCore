import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ScreenShell, StatusBar } from "@/components/Frame";
import RecoverForm from "./RecoverForm";

export const metadata = { title: "Recuperar acceso · CoachCore" };

export default async function RecuperarPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <ScreenShell>
      <StatusBar />
      <RecoverForm />
    </ScreenShell>
  );
}
