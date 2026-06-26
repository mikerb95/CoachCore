"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { css } from "@/lib/css";
import PasswordToggle from "@/components/PasswordToggle";
import { registerAction, type RegisterState } from "@/app/actions/auth";

export default function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerAction, {});
  const [role, setRole] = useState<"entrenador" | "cliente">("entrenador");
  const fe = state.fieldErrors ?? {};

  return (
    <div className="cc-scroll" style={css("flex:1;overflow-y:auto;padding:0 24px 30px;animation:ccUp14 .5s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("flex:none;display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:22px")}>
        <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.6px")}>Crear cuenta</div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:6px")}>Empieza a gestionar tu progreso.</div>
      </div>

      <form action={action} style={css("display:flex;flex-direction:column;gap:12px;margin-top:22px")}>
        {/* role selector */}
        <input type="hidden" name="role" value={role} />
        <div style={css("display:flex;gap:10px")}>
          <RoleCard active={role === "entrenador"} onClick={() => setRole("entrenador")} icon="ph-fill ph-clipboard-text" label="Entrenador" color="var(--data)" />
          <RoleCard active={role === "cliente"} onClick={() => setRole("cliente")} icon="ph-fill ph-person-simple-run" label="Cliente" color="var(--action)" />
        </div>

        <Field icon="ph ph-user" name="name" type="text" placeholder="Nombre y apellidos" autoComplete="name" error={fe.name} label="Nombre y apellidos" />
        <Field icon="ph ph-envelope-simple" name="email" type="email" placeholder="tu@email.com" autoComplete="email" error={fe.email} label="Correo electrónico" />
        <Field icon="ph ph-lock-simple" name="password" type="password" placeholder="Contraseña (mín. 10)" autoComplete="new-password" error={fe.password} label="Contraseña" />

        {/* RGPD consent */}
        <label style={css("display:flex;gap:10px;align-items:flex-start;background:#0F1517;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:13px;cursor:pointer")}>
          <input type="checkbox" name="consentHealthData" style={css("margin-top:2px;width:18px;height:18px;accent-color:#38E07B;flex:none")} />
          <span style={css("font:500 12px 'IBM Plex Sans';color:#9FB0A8;line-height:1.5")}>
            Acepto el tratamiento de mis <b style={css("color:#C6CFCB")}>datos de salud</b> (lesiones, peso, medidas) para el servicio de entrenamiento, según la{" "}
            <Link href="/privacidad" style={css("color:var(--data);font-weight:600")}>Política de Privacidad</Link>.
          </span>
        </label>
        {fe.consentHealthData && (
          <div style={css("font:500 12px 'IBM Plex Sans';color:#FF6B8A;display:flex;align-items:center;gap:6px")}>
            <i className="ph-fill ph-warning-circle" />{fe.consentHealthData}
          </div>
        )}

        {state.error && !Object.keys(fe).length && (
          <div style={css("font:500 12.5px 'IBM Plex Sans';color:#FF6B8A;display:flex;align-items:center;gap:6px")}>
            <i className="ph-fill ph-warning-circle" />{state.error}
          </div>
        )}

        <button type="submit" disabled={pending} style={{ ...css("margin-top:4px;height:52px;border:none;border-radius:15px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer"), opacity: pending ? 0.6 : 1 }}>
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>

      <div style={css("text-align:center;font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:18px")}>
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" style={css("color:var(--data);font-weight:600")}>Iniciar sesión</Link>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon, label, color }: { active: boolean; onClick: () => void; icon: string; label: string; color: string }) {
  return (
    <button type="button" onClick={onClick} style={{ ...css("flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;border-radius:14px;padding:14px 8px;cursor:pointer;background:#12181A;transition:border-color .2s"), border: `1px solid ${active ? color : "rgba(255,255,255,.07)"}` }}>
      <i className={icon} style={{ fontSize: 22, color: active ? color : "#6E7A76" }} />
      <span style={{ ...css("font:600 13px 'IBM Plex Sans'"), color: active ? "#fff" : "#8A938F" }}>{label}</span>
    </button>
  );
}

function Field({ icon, name, type, placeholder, autoComplete, error, label }: { icon: string; name: string; type: string; placeholder: string; autoComplete?: string; error?: string; label: string }) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <div style={{ ...css("display:flex;align-items:center;gap:10px;background:#12181A;border-radius:14px;padding:0 14px;height:52px"), border: `1px solid ${error ? "rgba(255,107,138,.5)" : "rgba(255,255,255,.07)"}` }}>
        <i className={icon} style={css("color:#6E7A76;font-size:18px")} aria-hidden="true" />
        <input name={name} type={isPassword && reveal ? "text" : type} placeholder={placeholder} autoComplete={autoComplete} aria-label={label} aria-invalid={!!error} required style={css("flex:1;background:none;border:none;outline:none;color:#fff;font:500 14px 'IBM Plex Sans'")} />
        {isPassword && <PasswordToggle reveal={reveal} onToggle={() => setReveal((v) => !v)} />}
      </div>
      {error && <div style={css("font:500 11.5px 'IBM Plex Sans';color:#FF6B8A;margin:5px 0 0 4px")}>{error}</div>}
    </div>
  );
}
