import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ScreenShell, StatusBar } from "@/components/Frame";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { registered } = await searchParams;

  return (
    <ScreenShell>
      <StatusBar />
      <LoginForm justRegistered={registered === "1"} />
    </ScreenShell>
  );
}
