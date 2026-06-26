import Link from "next/link";
import { css } from "@/lib/css";
import { ScreenShell, StatusBar } from "@/components/Frame";
import { PRIVACY_VERSION } from "@/lib/constants";

export const metadata = { title: "Política de Privacidad · CoachCore" };

export default function PrivacidadPage() {
  return (
    <div style={css("min-height:100vh;background:radial-gradient(120% 90% at 50% 0%,#0E1416 0%,#060809 60%);display:flex;align-items:center;justify-content:center;padding:28px;font-family:'IBM Plex Sans',system-ui,sans-serif")}>
      <div style={css("width:392px;max-width:100%;height:850px;max-height:calc(100vh - 24px);background:#0A0E0F;border-radius:46px;padding:11px;box-shadow:0 50px 120px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.05);position:relative")}>
        <div style={css("position:absolute;top:20px;left:50%;transform:translateX(-50%);width:120px;height:30px;background:#000;border-radius:18px;z-index:40")} />
        <div style={css("width:100%;height:100%;background:#0A0E0F;border-radius:36px;overflow:hidden;position:relative;display:flex;flex-direction:column")}>
          <StatusBar />
          <div style={css("padding:6px 18px 14px;display:flex;align-items:center;gap:12px;flex:none;border-bottom:1px solid rgba(255,255,255,.05)")}>
            <Link href="/register" style={css("width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#12181A;color:#C6CFCB;display:flex;align-items:center;justify-content:center;font-size:16px")}>
              <i className="ph-bold ph-arrow-left" />
            </Link>
            <div style={css("font:700 17px 'Space Grotesk';color:#fff")}>Política de Privacidad</div>
          </div>

          <div className="cc-scroll" style={css("flex:1;overflow-y:auto;padding:18px")}>
            <p style={css("font:500 11px 'JetBrains Mono';color:#5E6A66;margin:0 0 16px")}>Versión {PRIVACY_VERSION} · RGPD (UE) 2016/679</p>

            <Section title="1. Responsable del tratamiento">
              El entrenador titular de la cuenta es el responsable del tratamiento de los datos de sus
              clientes. CoachCore actúa como herramienta de soporte. Indica aquí tu razón social y un
              email de contacto de privacidad antes de operar comercialmente.
            </Section>

            <Section title="2. Qué datos tratamos">
              Datos de cuenta (nombre, email, contraseña cifrada) y <b style={css("color:#C6CFCB")}>datos de
              salud</b> (lesiones, peso corporal, % graso, medidas, RPE). Los datos de salud son
              «categoría especial» (art. 9 RGPD) y solo se tratan con tu consentimiento explícito.
            </Section>

            <Section title="3. Base jurídica">
              Ejecución del servicio de entrenamiento (art. 6.1.b) y tu consentimiento explícito para los
              datos de salud (art. 9.2.a). Puedes retirar el consentimiento en cualquier momento.
            </Section>

            <Section title="4. Conservación">
              Conservamos tus datos mientras la cuenta esté activa. Al eliminar la cuenta, los datos se
              borran de forma permanente de la base de datos.
            </Section>

            <Section title="5. Tus derechos">
              Acceso, rectificación, supresión, oposición, limitación y portabilidad. Desde Ajustes puedes
              <b style={css("color:#C6CFCB")}> exportar</b> todos tus datos (portabilidad) y
              <b style={css("color:#C6CFCB")}> eliminar tu cuenta</b> (supresión) tú mismo.
            </Section>

            <Section title="6. Seguridad">
              Contraseñas con hash bcrypt, cifrado en tránsito (HTTPS/HSTS), cabeceras de seguridad
              estrictas (CSP), control de acceso por rol y validación de entrada en servidor.
            </Section>

            <Section title="7. Encargados / terceros">
              La base de datos se aloja en Neon (Postgres) y el hosting en Vercel, como encargados del
              tratamiento. No vendemos datos ni los cedemos con fines publicitarios.
            </Section>

            <p style={css("font:500 12px 'IBM Plex Sans';color:#5E6A66;line-height:1.6;margin-top:8px")}>
              Este texto es una base de cumplimiento; revísalo con asesoría legal antes de operar con
              clientes reales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={css("margin-bottom:18px")}>
      <h2 style={css("font:600 15px 'Space Grotesk';color:#fff;margin:0 0 6px")}>{title}</h2>
      <p style={css("font:500 13px 'IBM Plex Sans';color:#9FB0A8;line-height:1.6;margin:0")}>{children}</p>
    </div>
  );
}
