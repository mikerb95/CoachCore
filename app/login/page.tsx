import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { css } from "@/lib/css";
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
    <div style={css("min-height:100vh;background:radial-gradient(120% 90% at 50% 0%,#0E1416 0%,#060809 60%);display:flex;align-items:center;justify-content:center;padding:28px;font-family:'IBM Plex Sans',system-ui,sans-serif")}>
      <div style={css("width:392px;max-width:100%;height:850px;max-height:calc(100vh - 24px);background:#0A0E0F;border-radius:46px;padding:11px;box-shadow:0 50px 120px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.05);position:relative")}>
        <div style={css("position:absolute;top:20px;left:50%;transform:translateX(-50%);width:120px;height:30px;background:#000;border-radius:18px;z-index:40")} />
        <div style={css("width:100%;height:100%;background:#0A0E0F;border-radius:36px;overflow:hidden;position:relative;display:flex;flex-direction:column")}>
          <StatusBar />
          <LoginForm justRegistered={registered === "1"} />
        </div>
      </div>
    </div>
  );
}
