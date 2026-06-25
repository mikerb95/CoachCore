"use client";

import { useActionState } from "react";
import Link from "next/link";
import { css } from "@/lib/css";
import { resetPassword, type ResetState } from "@/app/actions/password";

export default function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  const done = !pending && !state.error && !state.fieldErrors && state.fieldErrors === undefined && hasSubmitted(state);

  return (
    <div style={css("flex:1;display:flex;flex-direction:column;padding:0 24px 30px;animation:ccUp14 .5s cubic-bezier(.2,.8,.2,1)")}>
      <div style={css("flex:none;display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:36px")}>
        <div style={css("width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#1f3d2a,#10191400);border:1px solid rgba(56,224,123,.25);display:flex;align-items:center;justify-content:center;margin-bottom:18px")}>
          <i className="ph-fill ph-lock-key-open" style={css("font-size:28px;color:var(--data)")} />
        </div>
        <div style={css("font:700 26px 'Space Grotesk';color:#fff;letter-spacing:-.6px")}>Nueva contraseña</div>
        <div style={css("font:500 13px 'IBM Plex Sans';color:#8A938F;margin-top:6px")}>Elige una contraseña segura (mín. 10).</div>
      </div>

      {!token ? (
        <Notice color="#FF6B8A" icon="ph-fill ph-warning-circle">
          Enlace no válido. Solicita uno nuevo desde <Link href="/recuperar" style={css("color:var(--data);font-weight:600")}>recuperar acceso</Link>.
        </Notice>
      ) : done ? (
        <Notice color="var(--data)" icon="ph-fill ph-check-circle">
          Contraseña actualizada. Ya puedes <Link href="/login" style={css("color:var(--data);font-weight:600")}>iniciar sesión</Link>.
        </Notice>
      ) : (
        <form action={action} style={css("display:flex;flex-direction:column;gap:12px;margin-top:24px")}>
          <input type="hidden" name="token" value={token} />
          <div style={{ ...css("display:flex;align-items:center;gap:10px;background:#12181A;border-radius:14px;padding:0 14px;height:52px"), border: `1px solid ${state.fieldErrors?.password ? "rgba(255,107,138,.5)" : "rgba(255,255,255,.07)"}` }}>
            <i className="ph ph-lock-simple" style={css("color:#6E7A76;font-size:18px")} />
            <input name="password" type="password" placeholder="Nueva contraseña" autoComplete="new-password" required style={css("flex:1;background:none;border:none;outline:none;color:#fff;font:500 14px 'IBM Plex Sans'")} />
          </div>
          {state.fieldErrors?.password && (
            <div style={css("font:500 12px 'IBM Plex Sans';color:#FF6B8A;margin-left:4px")}>{state.fieldErrors.password}</div>
          )}
          {state.error && (
            <div style={css("font:500 12.5px 'IBM Plex Sans';color:#FF6B8A;display:flex;align-items:center;gap:6px")}>
              <i className="ph-fill ph-warning-circle" />{state.error}
            </div>
          )}
          <button type="submit" disabled={pending} style={{ ...css("margin-top:6px;height:52px;border:none;border-radius:15px;background:var(--data);color:#06140C;font:700 15px 'IBM Plex Sans';cursor:pointer"), opacity: pending ? 0.6 : 1 }}>
            {pending ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}

// El action devuelve {} en éxito; distinguimos "éxito" de "estado inicial"
// marcando el objeto vacío como enviado.
function hasSubmitted(state: ResetState): boolean {
  return Object.keys(state).length === 0 && state !== INITIAL;
}
const INITIAL: ResetState = {};

function Notice({ color, icon, children }: { color: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ ...css("margin-top:26px;border-radius:14px;padding:16px;font:500 13.5px 'IBM Plex Sans';color:#9FB0A8;line-height:1.5;display:flex;gap:10px"), background: "rgba(255,255,255,.03)", border: `1px solid ${color === "var(--data)" ? "rgba(56,224,123,.3)" : "rgba(255,107,138,.3)"}` }}>
      <i className={icon} style={{ color, fontSize: 20, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}
