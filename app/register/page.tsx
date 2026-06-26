import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ScreenShell, StatusBar } from "@/components/Frame";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <ScreenShell>
      <StatusBar />
      <RegisterForm />
    </ScreenShell>
  );
}
