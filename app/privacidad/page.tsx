import Link from "next/link";
import { css } from "@/lib/css";
import { ScreenShell, StatusBar } from "@/components/Frame";
import { PRIVACY_VERSION } from "@/lib/constants";

export const metadata = { title: "Política de Privacidad · CoachCore" };

export default function PrivacidadPage() {
  return (
    <ScreenShell>
          <StatusBar />
          <div style={css("padding:6px 18px 14px;display:flex;align-items:center;gap:12px;flex:none;border-bottom:1px solid rgba(255,255,255,.05)")}>
            <Link href="/register" style={css("width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#12181A;color:#C6CFCB;display:flex;align-items:center;justify-content:center;font-size:16px")}>
              <i className="ph-bold ph-arrow-left" />
            </Link>
            <div style={css("font:700 17px 'Space Grotesk';color:#fff")}>Política de Privacidad</div>
          </div>

          <div className="cc-scroll" style={css("flex:1;overflow-y:auto;padding:18px")}>
            <p style={css("font:500 11px 'JetBrains Mono';color:#5E6A66;margin:0 0 16px")}>Versión {PRIVACY_VERSION} · Ley 1581 de 2012 · Decreto 1377 de 2013</p>

            <Section title="1. Responsable del tratamiento">
              El entrenador titular de la cuenta es el responsable del tratamiento de los datos de sus
              clientes ante la Superintendencia de Industria y Comercio (SIC). Indica tu nombre o razón
              social y un correo de contacto de privacidad antes de operar comercialmente.
            </Section>

            <Section title="2. Datos que tratamos">
              Datos de cuenta (nombre, correo, contraseña cifrada) y <b style={css("color:#C6CFCB")}>datos
              sensibles de salud</b> (lesiones, peso corporal, % de grasa, medidas, RPE). Los datos
              sensibles solo se tratan con tu autorización expresa (art. 6 Ley 1581 de 2012).
            </Section>

            <Section title="3. Finalidad y autorización">
              Los datos se usan exclusivamente para prestar el servicio de entrenamiento personalizado.
              Tu autorización es la base del tratamiento (art. 4 Ley 1581). Puedes revocarla en
              cualquier momento eliminando tu cuenta desde Ajustes.
            </Section>

            <Section title="4. Conservación">
              Conservamos tus datos mientras la cuenta esté activa. Al eliminarla, todos los datos se
              suprimen de forma permanente e irreversible de la base de datos.
            </Section>

            <Section title="5. Tus derechos (Habeas Data)">
              Conocer, actualizar, rectificar y suprimir tus datos (art. 8 Ley 1581 de 2012). Desde
              Ajustes puedes <b style={css("color:#C6CFCB")}>exportar</b> todos tus datos y
              <b style={css("color:#C6CFCB")}> eliminar tu cuenta</b> directamente, sin trámites.
            </Section>

            <Section title="6. Seguridad">
              Contraseñas con hash bcrypt, cifrado en tránsito (HTTPS/HSTS), cabeceras de seguridad
              estrictas (CSP), control de acceso por rol y validación de datos en servidor.
            </Section>

            <Section title="7. Operadores / terceros">
              La base de datos se aloja en Neon (Postgres) y el hosting en Vercel, como operadores del
              tratamiento. No vendemos datos ni los compartimos con fines publicitarios.
            </Section>

            <p style={css("font:500 12px 'IBM Plex Sans';color:#5E6A66;line-height:1.6;margin-top:8px")}>
              Este texto es una base de cumplimiento con la legislación colombiana; revísalo con
              asesoría legal antes de operar con clientes reales.
            </p>
          </div>
    </ScreenShell>
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
