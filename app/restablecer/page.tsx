import { ScreenShell, StatusBar } from "@/components/Frame";
import ResetForm from "./ResetForm";

export const metadata = { title: "Nueva contraseña · CoachCore" };

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <ScreenShell>
      <StatusBar />
      <ResetForm token={token ?? ""} />
    </ScreenShell>
  );
}
