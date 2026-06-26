"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { css } from "@/lib/css";
import { loginAction, type LoginState } from "@/app/actions/auth";

export default function LoginForm({ justRegistered }: { justRegistered: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div style={css("flex:1;display:flex;flex-direction:column;padding:0 24px 30px;animation:ccUp14 .5s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("flex:none;display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:36px")}>
        <div style={css("width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#1f3d2a,#10191400);border:1px solid rgba(56,224,123,.25);display:flex;align-items:center;justify-content:center;margin-bottom:18px")}>
          <i className="ph-fill ph-barbell" style={css("font-size:30px;color:var(--data)")} />
        </div>
        <div style={css("font:700 28px 'Space Grotesk';color:#fff;letter-spacing:-.6px")}>Iniciar sesión</div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:6px")}>Bienvenido de nuevo a CoachCore.</div>
      </div>

      {justRegistered && (
        <div style={css("margin-top:20px;background:rgba(56,224,123,.1);border:1px solid rgba(56,224,123,.3);border-radius:12px;padding:11px 14px;font:500 13px 'IBM Plex Sans';color:#9FB0A8;display:flex;align-items:center;gap:8px")}>
          <i className="ph-fill ph-check-circle" style={css("color:var(--data);font-size:17px")} />Cuenta creada. Ya puedes entrar.
        </div>
      )}

      <form action={action} style={css("display:flex;flex-direction:column;gap:12px;margin-top:24px")}>
        <Field icon="ph ph-envelope-simple" name="email" type="email" placeholder="tu@email.com" autoComplete="email" label="Correo electrónico" />
        <Field icon="ph ph-lock-simple" name="password" type="password" placeholder="Contraseña" autoComplete="current-password" label="Contraseña" />

        {state.error && (
          <div style={css("font:500 12.5px 'IBM Plex Sans';color:#FF6B8A;display:flex;align-items:center;gap:6px")}>
            <i className="ph-fill ph-warning-circle" />{state.error}
          </div>
        )}

        <button type="submit" disabled={pending} style={{ ...css("margin-top:6px;height:52px;border:none;border-radius:15px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer"), opacity: pending ? 0.6 : 1 }}>
          {pending ? "Entrando…" : "Entrar"}
          {!pending && <i className="ph-bold ph-arrow-right" />}
        </button>

        <Link href="/recuperar" style={css("text-align:center;font:500 12.5px 'IBM Plex Sans';color:#8A938F;margin-top:2px")}>
          ¿Olvidaste tu contraseña?
        </Link>
      </form>

      <div style={css("flex:1")} />
      <div style={css("text-align:center;font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:20px")}>
        ¿No tienes cuenta?{" "}
        <Link href="/register" style={css("color:var(--data);font-weight:600")}>Crear cuenta</Link>
      </div>
      <div style={css("text-align:center;font:500 11px 'IBM Plex Sans';color:#465049;margin-top:14px")}>
        Tus datos, tu propiedad · Cifrado en tránsito
      </div>
    </div>
  );
}

function Field({ icon, name, type, placeholder, autoComplete, label }: { icon: string; name: string; type: string; placeholder: string; autoComplete?: string; label: string }) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={css("display:flex;align-items:center;gap:10px;background:#12181A;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:0 14px;height:52px")}>
      <i className={icon} style={css("color:#6E7A76;font-size:18px")} aria-hidden="true" />
      <input
        name={name}
        type={isPassword && reveal ? "text" : type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={label}
        required
        style={css("flex:1;background:none;border:none;outline:none;color:#fff;font:500 14px 'IBM Plex Sans'")}
      />
      {isPassword && <PasswordToggle reveal={reveal} onToggle={() => setReveal((v) => !v)} />}
    </div>
  );
}

function PasswordToggle({ reveal, onToggle }: { reveal: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={reveal ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={reveal}
      style={css("flex:none;display:flex;align-items:center;justify-content:center;background:none;border:none;padding:0;cursor:pointer;color:#6E7A76")}
    >
      <i className={reveal ? "ph ph-eye-slash" : "ph ph-eye"} style={css("font-size:18px")} aria-hidden="true" />
    </button>
  );
}
