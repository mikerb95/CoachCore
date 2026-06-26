import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { css } from "@/lib/css";
import { ScreenShell, StatusBar } from "@/components/Frame";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "entrenador" ? "/coach" : "/cliente");
  }

  return (
    <ScreenShell>
      <StatusBar />

      <div style={css("flex:1;display:flex;flex-direction:column;padding:0 24px 30px;animation:ccUp14 .5s cubic-bezier(.2,.8,.2,1)")}>
            <div style={css("flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center")}>
              <div style={css("width:72px;height:72px;border-radius:22px;background:linear-gradient(135deg,#1f3d2a,#10191400);border:1px solid rgba(56,224,123,.25);display:flex;align-items:center;justify-content:center;margin-bottom:20px")}>
                <i className="ph-fill ph-barbell" style={css("font-size:34px;color:#38E07B")} />
              </div>
              <div style={css("font:700 34px 'Space Grotesk';color:#fff;letter-spacing:-.8px")}>CoachCore</div>
              <div style={css("font:500 14px 'IBM Plex Sans';color:#8A938F;margin-top:8px;max-width:250px;line-height:1.5")}>
                Gestiona clientes, rutinas y progreso. Tus datos, tu propiedad.
              </div>
            </div>

            <div style={css("display:flex;flex-direction:column;gap:12px")}>
              <Link href="/login" style={css("display:flex;align-items:center;justify-content:center;gap:8px;height:54px;border-radius:16px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans'")}>
                Iniciar sesión<i className="ph-bold ph-arrow-right" />
              </Link>
              <Link href="/register" style={css("display:flex;align-items:center;justify-content:center;height:54px;border-radius:16px;background:#12181A;border:1px solid rgba(255,255,255,.1);color:#E6ECEA;font:600 15px 'IBM Plex Sans'")}>
                Crear cuenta
              </Link>
            </div>

            <div style={css("text-align:center;font:500 11px 'IBM Plex Sans';color:#465049;margin-top:18px")}>
              Sin suscripciones · Cifrado · RGPD
            </div>
          </div>
    </ScreenShell>
  );
}
