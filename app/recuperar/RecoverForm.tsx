"use client";

import { useActionState } from "react";
import Link from "next/link";
import { css } from "@/lib/css";
import { requestPasswordReset, type ResetRequestState } from "@/app/actions/password";

export default function RecoverForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(requestPasswordReset, {});

  return (
    <div style={css("flex:1;display:flex;flex-direction:column;padding:0 24px 30px;animation:ccUp14 .5s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("flex:none;display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:36px")}>
        <div style={css("width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#1f3d2a,#10191400);border:1px solid rgba(56,224,123,.25);display:flex;align-items:center;justify-content:center;margin-bottom:18px")}>
          <i className="ph-fill ph-lock-key" style={css("font-size:28px;color:var(--data)")} />
        </div>
        <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.6px")}>Recuperar acceso</div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:6px;max-width:260px;line-height:1.5")}>
          Te enviaremos un enlace para crear una nueva contraseña.
        </div>
      </div>

      {state.ok ? (
        <div style={css("margin-top:26px;background:rgba(56,224,123,.1);border:1px solid rgba(56,224,123,.3);border-radius:14px;padding:16px;font:500 13.5px 'IBM Plex Sans';color:#9FB0A8;line-height:1.5;display:flex;gap:10px")}>
          <i className="ph-fill ph-check-circle" style={css("color:var(--data);font-size:20px;flex:none")} />
          Si ese email tiene una cuenta, recibirás un enlace en breve. Revisa también el spam.
        </div>
      ) : (
        <form action={action} style={css("display:flex;flex-direction:column;gap:12px;margin-top:24px")}>
          <div style={css("display:flex;align-items:center;gap:10px;background:#12181A;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:0 14px;height:52px")}>
            <i className="ph ph-envelope-simple" style={css("color:#6E7A76;font-size:18px")} />
            <input name="email" type="email" placeholder="tu@email.com" autoComplete="email" required style={css("flex:1;background:none;border:none;outline:none;color:#fff;font:500 14px 'IBM Plex Sans'")} />
          </div>
          {state.error && (
            <div style={css("font:500 12.5px 'IBM Plex Sans';color:#FF6B8A;display:flex;align-items:center;gap:6px")}>
              <i className="ph-fill ph-warning-circle" />{state.error}
            </div>
          )}
          <button type="submit" disabled={pending} className="cc-press cc-btn-primary" style={{ ...css("margin-top:6px;height:52px;border:none;border-radius:15px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans';cursor:pointer"), opacity: pending ? 0.6 : 1 }}>
            {pending ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}

      <div style={css("flex:1")} />
      <div style={css("text-align:center;font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:20px")}>
        <Link href="/login" className="cc-press cc-link" style={css("color:var(--data);font-weight:600")}>Volver a iniciar sesión</Link>
      </div>
    </div>
  );
}
